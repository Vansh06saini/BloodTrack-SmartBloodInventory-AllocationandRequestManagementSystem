import express from "express";
import {
    addBloodUnits,
    getDashboardSummary,
    getDailyBloodLogs
} from "../controllers/bloodUnitController.js";

const router = express.Router();

router.get("/dashboard-summary", getDashboardSummary);
router.get("/daily-logs", getDailyBloodLogs);
router.get("/logs", getDailyBloodLogs);
router.post("/", addBloodUnits);

export default router;