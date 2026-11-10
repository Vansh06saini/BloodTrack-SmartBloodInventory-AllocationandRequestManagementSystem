"""
Synthetic Historical Order Data Generator for BloodTrack
Simulates 2 years of realistic hospital blood requests based on real-world medical prevalence,
day-of-week surgery schedules, and emergency trauma spikes.
"""

import os
import random
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

import config

def generate_synthetic_data(days_back=730, output_file=config.SYNTHETIC_DATA_PATH):
    print(f"Generating {days_back} days of realistic historical order data...")

    # Realistic population / hospital demand distribution
    # In clinical practice: O+ and B+ dominate, Rh-negative groups are rare.
    blood_group_weights = {
        "O+": 0.36,
        "B+": 0.32,
        "A+": 0.20,
        "AB+": 0.06,
        "O-": 0.025,
        "A-": 0.015,
        "B-": 0.015,
        "AB-": 0.005,
    }
    
    blood_groups = list(blood_group_weights.keys())
    bg_probabilities = list(blood_group_weights.values())

    reasons_by_priority = {
        "ROUTINE": [
            "Elective Orthopedic Surgery",
            "Scheduled Cardiovascular Surgery",
            "Cancer Chemotherapy Support",
            "Chronic Anemia Transfusion",
            "Maternity Scheduled C-Section",
            "Dialysis Patient Support",
        ],
        "URGENT": [
            "Severe Postpartum Hemorrhage",
            "Gastrointestinal Bleeding",
            "Complicated Emergency C-Section",
            "Surgical Complication",
            "Severe Dengue Platelet/RBC Drop",
        ],
        "EMERGENCY": [
            "Major Road Traffic Trauma",
            "Acute Multi-trauma Resuscitation",
            "Industrial Accident Massive Bleed",
            "Ruptured Aortic Aneurysm",
        ],
    }

    hospital_ids = [1, 2, 3, 4, 5]
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days_back)

    records = []
    request_id_counter = 1

    current_date = start_date
    while current_date <= end_date:
        weekday = current_date.weekday() # 0 = Monday, 6 = Sunday
        is_weekend = weekday >= 5

        # 3% chance of a seasonal surge or mass trauma incident in the city
        is_surge_day = random.random() < 0.03

        # Base number of requests per day
        if is_weekend:
            # Weekends: Fewer routine requests, mostly emergency/urgent
            num_requests = int(np.random.poisson(lam=12))
        else:
            # Weekdays: Standard surgery days
            num_requests = int(np.random.poisson(lam=22))

        if is_surge_day:
            num_requests = int(num_requests * random.uniform(1.5, 2.0))

        for _ in range(num_requests):
            # Pick Priority
            if is_weekend:
                priority = random.choices(
                    ["ROUTINE", "URGENT", "EMERGENCY"],
                    weights=[0.35, 0.40, 0.25],
                    k=1
                )[0]
            else:
                priority = random.choices(
                    ["ROUTINE", "URGENT", "EMERGENCY"],
                    weights=[0.65, 0.25, 0.10],
                    k=1
                )[0]

            # Pick Blood Group
            bg = random.choices(blood_groups, weights=bg_probabilities, k=1)[0]

            # Quantity required depends on priority
            if priority == "ROUTINE":
                qty = random.choices([1, 2, 3], weights=[0.55, 0.35, 0.10], k=1)[0]
                lead_days = random.randint(1, 3)
            elif priority == "URGENT":
                qty = random.choices([2, 3, 4], weights=[0.40, 0.40, 0.20], k=1)[0]
                lead_days = random.randint(0, 1)
            else: # EMERGENCY
                qty = random.choices([3, 4, 5, 6], weights=[0.30, 0.35, 0.25, 0.10], k=1)[0]
                lead_days = 0

            # Surge day boosts quantity for emergency groups
            if is_surge_day and priority in ["URGENT", "EMERGENCY"]:
                qty += random.randint(1, 2)

            req_date = current_date + timedelta(days=lead_days)
            reason = random.choice(reasons_by_priority[priority])
            hospital_id = random.choice(hospital_ids)

            hour = random.randint(8, 20) if priority == "ROUTINE" else random.randint(0, 23)
            minute = random.randint(0, 59)
            created_at = current_date.replace(hour=hour, minute=minute, second=random.randint(0, 59))

            date_str = current_date.strftime("%Y%m%d")
            req_code = f"REQ-{date_str}-{request_id_counter:04d}"

            records.append({
                "request_id": request_id_counter,
                "request_code": req_code,
                "hospital_id": hospital_id,
                "blood_group": bg,
                "quantity": qty,
                "priority": priority,
                "required_date": req_date.strftime("%Y-%m-%d"),
                "reason": reason,
                "status": "COMPLETED",
                "created_at": created_at.strftime("%Y-%m-%d %H:%M:%S"),
            })

            request_id_counter += 1

        current_date += timedelta(days=1)

    df = pd.DataFrame(records)
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    df.to_csv(output_file, index=False)

    print(f"\n[OK] Successfully generated {len(df):,} synthetic requests!")
    print(f"File saved to: {output_file}")
    print("\n--- Summary Breakdown by Blood Group ---")
    summary = df.groupby("blood_group")["quantity"].agg(["count", "sum"]).rename(
        columns={"count": "Total Orders", "sum": "Total Units Demanded"}
    )
    summary["% of Total Units"] = (summary["Total Units Demanded"] / summary["Total Units Demanded"].sum() * 100).round(1)
    summary = summary.sort_values(by="Total Units Demanded", ascending=False)
    print(summary)
    
    print("\n--- Priority Breakdown ---")
    prio_summary = df.groupby("priority")["quantity"].agg(["count", "sum"])
    print(prio_summary)

    return df

if __name__ == "__main__":
    generate_synthetic_data()
