import express from "express";
import {
    getHospitalDashboard,
    createHospitalRequest
} from "../controllers/hospitalController.js";

const router = express.Router();

router.get("/dashboard", getHospitalDashboard);
router.post("/requests", createHospitalRequest);

export default router;