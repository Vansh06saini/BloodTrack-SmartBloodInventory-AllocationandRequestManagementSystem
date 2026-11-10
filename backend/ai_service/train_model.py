"""
Model Training Pipeline for 7-Day Blood Demand Forecasting
Trains a Multi-Output Random Forest Regressor to forecast demand for all 8 blood groups
over the next 7 days simultaneously.
"""

import os
import json
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, root_mean_squared_error

import config

def build_daily_timeseries(csv_path=config.SYNTHETIC_DATA_PATH):
    print(f"Loading data from {csv_path}...")
    df = pd.read_csv(csv_path)

    # Convert timestamp to date
    df["date"] = pd.to_datetime(df["created_at"]).dt.date

    # Aggregate daily demand per blood group
    daily = df.groupby(["date", "blood_group"])["quantity"].sum().reset_index()

    # Reindex over a complete grid: all dates x all 8 blood groups
    # This ensures days with 0 demand for rare types (AB-, etc.) are explicitly 0
    all_dates = pd.date_range(start=daily["date"].min(), end=daily["date"].max(), freq="D").date
    full_index = pd.MultiIndex.from_product(
        [all_dates, config.BLOOD_GROUPS],
        names=["date", "blood_group"]
    )
    
    daily = daily.set_index(["date", "blood_group"]).reindex(full_index, fill_value=0).reset_index()
    daily["date"] = pd.to_datetime(daily["date"])
    daily = daily.sort_values(by=["blood_group", "date"]).reset_index(drop=True)

    print(f"Constructed daily grid: {len(daily):,} rows ({len(all_dates)} days across {len(config.BLOOD_GROUPS)} blood groups).")
    return daily

def extract_features_and_targets(daily_df, forecast_horizon=7):
    print("Engineering features (calendar, lag, rolling statistics) and 7-day targets...")

    dfs_by_group = []

    for bg in config.BLOOD_GROUPS:
        bg_df = daily_df[daily_df["blood_group"] == bg].copy().sort_values("date").reset_index(drop=True)

        # 1. Calendar features
        bg_df["day_of_week"] = bg_df["date"].dt.dayofweek
        bg_df["is_weekend"] = (bg_df["day_of_week"] >= 5).astype(int)
        bg_df["month"] = bg_df["date"].dt.month
        bg_df["day_of_month"] = bg_df["date"].dt.day
        bg_df["day_of_year"] = bg_df["date"].dt.dayofyear

        # 2. Lag features
        bg_df["lag_1"] = bg_df["quantity"].shift(1)
        bg_df["lag_2"] = bg_df["quantity"].shift(2)
        bg_df["lag_3"] = bg_df["quantity"].shift(3)
        bg_df["lag_7"] = bg_df["quantity"].shift(7)
        bg_df["lag_14"] = bg_df["quantity"].shift(14)

        # 3. Rolling window statistics
        bg_df["rolling_mean_7"] = bg_df["quantity"].shift(1).rolling(window=7).mean()
        bg_df["rolling_std_7"] = bg_df["quantity"].shift(1).rolling(window=7).std().fillna(0)
        bg_df["rolling_mean_14"] = bg_df["quantity"].shift(1).rolling(window=14).mean()
        bg_df["rolling_mean_30"] = bg_df["quantity"].shift(1).rolling(window=30).mean()
        bg_df["rolling_max_7"] = bg_df["quantity"].shift(1).rolling(window=7).max()

        # 4. Multi-output target variables: y_day_1 to y_day_7
        for d in range(1, forecast_horizon + 1):
            bg_df[f"target_day_{d}"] = bg_df["quantity"].shift(-d)

        dfs_by_group.append(bg_df)

    combined_df = pd.concat(dfs_by_group, ignore_index=True)

    # Drop rows that have NaN from rolling/lags (beginning) or targets (end)
    target_cols = [f"target_day_{d}" for d in range(1, forecast_horizon + 1)]
    feature_cols = [
        "day_of_week", "is_weekend", "month", "day_of_month", "day_of_year",
        "lag_1", "lag_2", "lag_3", "lag_7", "lag_14",
        "rolling_mean_7", "rolling_std_7", "rolling_mean_14", "rolling_mean_30", "rolling_max_7"
    ]

    # One-hot encode blood_group
    bg_dummies = pd.get_dummies(combined_df["blood_group"], prefix="bg", dtype=int)
    dummy_cols = list(bg_dummies.columns)
    combined_df = pd.concat([combined_df, bg_dummies], axis=1)

    all_feature_cols = feature_cols + dummy_cols

    # Drop rows with NaN
    clean_df = combined_df.dropna(subset=all_feature_cols + target_cols).copy()
    print(f"Cleaned dataset for training: {len(clean_df):,} samples.")

    return clean_df, all_feature_cols, target_cols

def train_and_evaluate():
    daily_df = build_daily_timeseries()
    clean_df, feature_cols, target_cols = extract_features_and_targets(daily_df, forecast_horizon=7)

    # Time-based split: 85% train, 15% test
    unique_dates = sorted(clean_df["date"].unique())
    split_idx = int(len(unique_dates) * 0.85)
    split_date = unique_dates[split_idx]

    train_mask = clean_df["date"] < split_date
    test_mask = clean_df["date"] >= split_date

    X_train = clean_df.loc[train_mask, feature_cols]
    y_train = clean_df.loc[train_mask, target_cols]

    X_test = clean_df.loc[test_mask, feature_cols]
    y_test = clean_df.loc[test_mask, target_cols]

    print(f"\nTraining set size: {len(X_train):,} samples (up to {split_date.strftime('%Y-%m-%d')})")
    print(f"Testing set size:  {len(X_test):,} samples")

    # Train Multi-Output Random Forest Regressor
    print("\nTraining Multi-Output Random Forest Regressor...")
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=12,
        min_samples_split=4,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)

    # Predictions on test set
    y_pred = model.predict(X_test)
    # Clip negative predictions to 0 (blood demand cannot be negative)
    y_pred = np.clip(y_pred, 0, None)

    # Evaluation metrics
    mae = mean_absolute_error(y_test, y_pred)
    rmse = root_mean_squared_error(y_test, y_pred)

    print("\n" + "=" * 50)
    print("MODEL EVALUATION RESULTS (7-Day Forecast Horizon)")
    print("=" * 50)
    print(f"Overall MAE  (Mean Absolute Error): {mae:.2f} units")
    print(f"Overall RMSE (Root Mean Sq Error): {rmse:.2f} units")

    # Per-day MAE
    print("\nPer-Day Mean Absolute Error:")
    for d in range(1, 8):
        day_mae = mean_absolute_error(y_test.iloc[:, d-1], y_pred[:, d-1])
        print(f"  Day +{d}: {day_mae:.2f} units")

    # Feature Importance (top 10)
    importances = model.feature_importances_
    sorted_idx = np.argsort(importances)[::-1][:10]
    print("\nTop 10 Most Important Predictive Features:")
    for rank, idx in enumerate(sorted_idx, 1):
        print(f"  {rank}. {feature_cols[idx]}: {importances[idx]:.4f}")

    # Save Model Artifacts
    os.makedirs(config.MODELS_DIR, exist_ok=True)
    joblib.dump(model, config.MODEL_PATH)
    print(f"\n[OK] Model successfully saved to: {config.MODEL_PATH}")

    metadata = {
        "model_type": "RandomForestRegressor(n_estimators=100, max_depth=12)",
        "trained_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "metrics": {
            "overall_mae": round(float(mae), 3),
            "overall_rmse": round(float(rmse), 3)
        },
        "feature_cols": feature_cols,
        "target_cols": target_cols,
        "blood_groups": config.BLOOD_GROUPS,
        "forecast_horizon_days": 7
    }

    with open(config.METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"[OK] Metadata saved to: {config.METADATA_PATH}")

    return model, metadata

if __name__ == "__main__":
    train_and_evaluate()
