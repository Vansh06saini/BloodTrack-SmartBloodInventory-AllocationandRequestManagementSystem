"""
Demonstration script showing how the Blood Demand Prediction Model works.
"""

import pandas as pd
from predictor import get_predictor

def run_demo():
    predictor = get_predictor()
    res = predictor.predict_next_7_days()

    print("=" * 85)
    print("                    BLOODTRACK: 7-DAY DEMAND FORECAST DEMO")
    print("=" * 85)
    print(f"Forecast Generated At : {res['forecast_generated_at']}")
    print(f"Reference Date        : {res['reference_date']}")
    print(f"Forecast Window       : {res['forecast_dates'][0]} to {res['forecast_dates'][-1]} (7 Days)")
    print("-" * 85)

    rows = []
    for bg, data in res["predictions"].items():
        row = {"Blood Group": bg}
        for d in data["daily"]:
            col_name = f"{d['day_name'][:3]} ({d['date'][5:]})"
            row[col_name] = d["predicted_units"]
        row["7-Day Total"] = data["total_7_days"]
        row["Daily Avg"] = data["avg_daily_units"]
        rows.append(row)

    df_view = pd.DataFrame(rows)
    df_view = df_view.sort_values(by="7-Day Total", ascending=False)
    print(df_view.to_string(index=False))

    print("-" * 85)
    print("SUMMARY INSIGHTS:")
    print(f"  * Total Blood Units Needed in Next 7 Days : {res['summary']['total_predicted_units_all_groups']} units")
    print(f"  * Average System Demand Per Day           : {res['summary']['avg_system_daily_units']} units/day")
    print(f"  * Highest Demand Blood Group              : {res['summary']['highest_demand_blood_group']} ({res['summary']['highest_demand_units']} units)")
    print(f"  * Lowest Demand Blood Group               : {res['summary']['lowest_demand_blood_group']} ({res['summary']['lowest_demand_units']} units)")
    print("=" * 85)

if __name__ == "__main__":
    run_demo()
