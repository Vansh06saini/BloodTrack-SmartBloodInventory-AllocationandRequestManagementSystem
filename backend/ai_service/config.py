import os

# Base paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODELS_DIR = os.path.join(BASE_DIR, "models")

# Ensure required directories exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

# File paths
SYNTHETIC_DATA_PATH = os.path.join(DATA_DIR, "synthetic_hospital_requests.csv")
MODEL_PATH = os.path.join(MODELS_DIR, "demand_forecast_model.joblib")
METADATA_PATH = os.path.join(MODELS_DIR, "model_metadata.json")

# Domain constants matching BloodTrack database schema
BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
PRIORITIES = ["ROUTINE", "URGENT", "EMERGENCY"]

# Service configuration
PORT = int(os.environ.get("AI_SERVICE_PORT", 5001))
HOST = os.environ.get("AI_SERVICE_HOST", "127.0.0.1")
