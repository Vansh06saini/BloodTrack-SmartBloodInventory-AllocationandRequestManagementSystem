"""
Demand Predictor Inference Engine
Loads the pre-trained model and computes 7-day forecasts per blood group.
Supports dynamic inference using real hospital requests from MySQL or baseline data.
"""

import os
import json
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
import joblib

import config

class DemandPredictor:
    def __init__(self, model_path=config.MODEL_PATH, metadata_path=config.METADATA_PATH):
        if not os.path.exists(model_path) or not os.path.exists(metadata_path):
            raise FileNotFoundError(
                f"Model or metadata not found. Please train the model first by running train_model.py."
            )
        
        self.model = joblib.load(model_path)
        with open(metadata_path, "r") as f:
            self.metadata = json.load(f)
            
        self.feature_cols = self.metadata["feature_cols"]
        self.blood_groups = self.metadata["blood_groups"]
        self.forecast_horizon = self.metadata.get("forecast_horizon_days", 7)

    def _prepare_inference_features(self, as_of_date, df_historical):
        """
        Calculates the lag and rolling statistics up to as_of_date for each blood group.
        Intelligently handles short real data histories (e.g. 6-10 days) without diluting with zeros.
        """
        as_of_date = pd.to_datetime(as_of_date).date()
        
        # Ensure date format
        if "date" not in df_historical.columns:
            df_historical["date"] = pd.to_datetime(df_historical["created_at"]).dt.date

        unique_dates = sorted(df_historical["date"].unique())
        num_distinct_dates = len(unique_dates)
        min_order_date = unique_dates[0] if num_distinct_dates > 0 else as_of_date
        max_order_date = unique_dates[-1] if num_distinct_dates > 0 else as_of_date

        # Aggregate daily demand
        daily = df_historical.groupby(["date", "blood_group"])["quantity"].sum().reset_index()

        # Build full date range up to as_of_date (last 60 days)
        start_date = as_of_date - timedelta(days=60)
        date_range = pd.date_range(start=start_date, end=as_of_date, freq="D").date

        full_index = pd.MultiIndex.from_product(
            [date_range, self.blood_groups],
            names=["date", "blood_group"]
        )
        
        daily = daily.set_index(["date", "blood_group"]).reindex(full_index, fill_value=0).reset_index()
        daily["date"] = pd.to_datetime(daily["date"])

        rows = []
        for bg in self.blood_groups:
            bg_df = daily[daily["blood_group"] == bg].copy().sort_values("date").reset_index(drop=True)
            
            # Target row is the as_of_date row
            target_row = bg_df[bg_df["date"].dt.date == as_of_date]
            if target_row.empty:
                dummy = pd.DataFrame([{
                    "date": pd.to_datetime(as_of_date),
                    "blood_group": bg,
                    "quantity": 0
                }])
                bg_df = pd.concat([bg_df, dummy], ignore_index=True)

            ref_dt = pd.to_datetime(as_of_date)
            qty_series = bg_df["quantity"]

            # Lags relative to as_of_date
            l1 = float(qty_series.iloc[-1]) if len(qty_series) >= 1 else 0.0
            l2 = float(qty_series.iloc[-2]) if len(qty_series) >= 2 else l1
            l3 = float(qty_series.iloc[-3]) if len(qty_series) >= 3 else l2
            
            # If at least 7 days of real orders exist, use iloc[-7], otherwise fallback to l1
            l7 = float(qty_series.iloc[-7]) if num_distinct_dates >= 7 and len(qty_series) >= 7 else l1
            # If at least 14 days of real orders exist, use iloc[-14], otherwise fallback to l7
            l14 = float(qty_series.iloc[-14]) if num_distinct_dates >= 14 and len(qty_series) >= 14 else l7

            # Rolling statistics with smart fallback for newly deployed databases
            avail_k = min(num_distinct_dates, 7) if num_distinct_dates > 0 else 7
            r_mean7 = float(qty_series.iloc[-avail_k:].mean()) if len(qty_series) >= avail_k and avail_k > 0 else float(l1)
            r_std7 = float(qty_series.iloc[-avail_k:].std()) if len(qty_series) >= avail_k and avail_k > 1 else 0.0
            r_max7 = float(qty_series.iloc[-avail_k:].max()) if len(qty_series) >= avail_k and avail_k > 0 else float(l1)

            # Prevent zero dilution when only 7-14 days of real hospital orders exist
            if num_distinct_dates >= 14:
                r_mean14 = float(qty_series.iloc[-14:].mean())
            else:
                r_mean14 = r_mean7

            if num_distinct_dates >= 30:
                r_mean30 = float(qty_series.iloc[-30:].mean())
            else:
                r_mean30 = r_mean14

            feature_dict = {
                "blood_group": bg,
                "day_of_week": ref_dt.dayofweek,
                "is_weekend": 1 if ref_dt.dayofweek >= 5 else 0,
                "month": ref_dt.month,
                "day_of_month": ref_dt.day,
                "day_of_year": ref_dt.dayofyear,
                "lag_1": l1,
                "lag_2": l2,
                "lag_3": l3,
                "lag_7": l7,
                "lag_14": l14,
                "rolling_mean_7": r_mean7,
                "rolling_std_7": 0.0 if np.isnan(r_std7) else r_std7,
                "rolling_mean_14": r_mean14,
                "rolling_mean_30": r_mean30,
                "rolling_max_7": r_max7,
            }

            for other_bg in self.blood_groups:
                feature_dict[f"bg_{other_bg}"] = 1 if other_bg == bg else 0

            rows.append(feature_dict)

        feat_df = pd.DataFrame(rows)
        X = feat_df[self.feature_cols]
        meta_info = {
            "num_distinct_dates": num_distinct_dates,
            "min_order_date": min_order_date,
            "max_order_date": max_order_date,
        }
        return X, [r["blood_group"] for r in rows], meta_info

    def predict_next_7_days(self, as_of_date=None, historical_df=None):
        is_real_data = False
        orders_count = 0

        if historical_df is not None and not historical_df.empty:
            is_real_data = True
            orders_count = len(historical_df)
            if "date" not in historical_df.columns and "created_at" in historical_df.columns:
                historical_df["date"] = pd.to_datetime(historical_df["created_at"]).dt.date
        else:
            if not os.path.exists(config.SYNTHETIC_DATA_PATH):
                raise FileNotFoundError("Historical data file not found.")
            historical_df = pd.read_csv(config.SYNTHETIC_DATA_PATH)
            if "date" not in historical_df.columns:
                historical_df["date"] = pd.to_datetime(historical_df["created_at"]).dt.date

        if as_of_date is None:
            if is_real_data:
                # For real data, reference date is today (or latest order date if ahead)
                today = datetime.now().date()
                max_d = historical_df["date"].max()
                as_of_date = max_d if max_d > today else today
            else:
                as_of_date = historical_df["date"].max()
        else:
            as_of_date = pd.to_datetime(as_of_date).date()

        X, blood_group_order, meta_info = self._prepare_inference_features(as_of_date, historical_df)
        preds = self.model.predict(X)
        preds = np.clip(preds, 0, None)

        forecast_dates = [
            (pd.to_datetime(as_of_date) + timedelta(days=d)).strftime("%Y-%m-%d")
            for d in range(1, self.forecast_horizon + 1)
        ]

        result = {
            "forecast_generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "reference_date": as_of_date.strftime("%Y-%m-%d"),
            "forecast_horizon_days": self.forecast_horizon,
            "forecast_dates": forecast_dates,
            "data_source": {
                "type": "database_real_orders" if is_real_data else "synthetic_baseline",
                "orders_analyzed": orders_count if is_real_data else len(historical_df),
                "unique_days_analyzed": meta_info["num_distinct_dates"],
                "earliest_order_date": str(meta_info["min_order_date"]),
                "latest_order_date": str(meta_info["max_order_date"]),
                "description": (
                    f"Prediction dynamically computed from {orders_count} real hospital requests across {meta_info['num_distinct_dates']} day(s) in MySQL database."
                    if is_real_data else
                    "Prediction computed using simulated clinical baseline data (no real hospital orders found yet)."
                )
            },
            "predictions": {},
            "summary": {}
        }

        total_system_demand = 0
        group_totals = {}

        for i, bg in enumerate(blood_group_order):
            day_preds = preds[i]
            daily_list = []
            group_sum = 0

            for day_idx, units in enumerate(day_preds, start=1):
                rounded_units = int(round(float(units)))
                target_dt = pd.to_datetime(as_of_date) + timedelta(days=day_idx)
                daily_list.append({
                    "day_number": day_idx,
                    "date": target_dt.strftime("%Y-%m-%d"),
                    "day_name": target_dt.strftime("%A"),
                    "predicted_units": rounded_units,
                })
                group_sum += rounded_units

            result["predictions"][bg] = {
                "blood_group": bg,
                "daily": daily_list,
                "total_7_days": group_sum,
                "avg_daily_units": round(group_sum / self.forecast_horizon, 1)
            }

            group_totals[bg] = group_sum
            total_system_demand += group_sum

        sorted_groups = sorted(group_totals.items(), key=lambda x: x[1], reverse=True)
        result["summary"] = {
            "total_predicted_units_all_groups": total_system_demand,
            "avg_system_daily_units": round(total_system_demand / self.forecast_horizon, 1),
            "highest_demand_blood_group": sorted_groups[0][0],
            "highest_demand_units": sorted_groups[0][1],
            "lowest_demand_blood_group": sorted_groups[-1][0],
            "lowest_demand_units": sorted_groups[-1][1],
        }

        return result

_predictor_instance = None

def get_predictor():
    global _predictor_instance
    if _predictor_instance is None:
        _predictor_instance = DemandPredictor()
    return _predictor_instance
