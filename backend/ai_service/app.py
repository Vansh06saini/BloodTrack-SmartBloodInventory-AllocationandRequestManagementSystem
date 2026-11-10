"""
FastAPI Microservice for BloodTrack AI Demand Forecasting
Serves 7-day blood demand predictions across all 8 blood groups.
Accepts live real hospital orders from MySQL or defaults to baseline.
"""

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import pandas as pd
import uvicorn
import os

import config
from predictor import get_predictor

app = FastAPI(
    title="BloodTrack AI Demand Forecasting Service",
    description="Microservice predicting 7-day blood group demand based on past hospital request dynamics.",
    version="1.1.0"
)

# Enable CORS for local backend & frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictRequest(BaseModel):
    as_of_date: Optional[str] = None
    orders: Optional[List[Dict[str, Any]]] = None

@app.get("/health")
def health_check():
    """Service health and readiness check."""
    model_exists = os.path.exists(config.MODEL_PATH)
    return {
        "status": "healthy" if model_exists else "degraded",
        "service": "BloodTrack AI Demand Prediction Service",
        "model_loaded": model_exists,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/predict/demand")
def predict_demand_get(as_of_date: str = Query(None, description="Reference date YYYY-MM-DD. Defaults to current date.")):
    """
    Returns 7-day demand predictions using GET (uses synthetic baseline if no orders passed).
    """
    try:
        predictor = get_predictor()
        forecast = predictor.predict_next_7_days(as_of_date=as_of_date)
        return {
            "success": True,
            "data": forecast
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.post("/predict/demand")
def predict_demand_post(payload: PredictRequest):
    """
    Returns 7-day demand predictions using POST.
    Accepts real hospital request orders from MySQL to dynamically drive the prediction.
    """
    try:
        predictor = get_predictor()
        historical_df = None
        if payload.orders and len(payload.orders) > 0:
            historical_df = pd.DataFrame(payload.orders)

        forecast = predictor.predict_next_7_days(
            as_of_date=payload.as_of_date,
            historical_df=historical_df
        )
        return {
            "success": True,
            "data": forecast
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.get("/model/metadata")
def get_model_metadata():
    """
    Returns model training parameters, feature importance, and validation metrics.
    """
    try:
        predictor = get_predictor()
        return {
            "success": True,
            "metadata": predictor.metadata
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load model metadata: {str(e)}")

if __name__ == "__main__":
    print(f"Starting BloodTrack AI Service on {config.HOST}:{config.PORT}...")
    uvicorn.run("app:app", host=config.HOST, port=config.PORT, reload=True)
