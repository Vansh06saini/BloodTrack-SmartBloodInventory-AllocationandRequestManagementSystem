import express from "express";
import { getDemandForecast, getModelInfo } from "../controllers/predictionController.js";

const router = express.Router();

// GET /api/predictions/demand-forecast - 7-day demand predictions + live inventory comparison
router.get("/demand-forecast", getDemandForecast);

// GET /api/predictions/model-info - ML model metadata and accuracy metrics
router.get("/model-info", getModelInfo);

export default router;
