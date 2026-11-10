"""
CLI helper for DemandPredictor
Reads request payload (as_of_date and orders) from stdin, runs inference, and writes JSON to stdout.
Used by the Express backend as a reliable direct local process.
"""

import sys
import json
import pandas as pd
from predictor import get_predictor

def main():
    try:
        raw_input = sys.stdin.read()
        as_of_date = None
        historical_df = None

        if raw_input and raw_input.strip():
            payload = json.loads(raw_input)
            as_of_date = payload.get("as_of_date")
            orders = payload.get("orders")
            if orders and isinstance(orders, list) and len(orders) > 0:
                historical_df = pd.DataFrame(orders)

        predictor = get_predictor()
        forecast = predictor.predict_next_7_days(
            as_of_date=as_of_date,
            historical_df=historical_df
        )

        print(json.dumps({"success": True, "data": forecast}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()

