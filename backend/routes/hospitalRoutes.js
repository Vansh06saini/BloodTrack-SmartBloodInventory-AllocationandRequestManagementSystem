import express from "express";
import {
    getHospitalDashboard,
    createHospitalRequest,
    getAllHospitalRequests,
    getHospitalRequestById
} from "../controllers/hospitalController.js";

const router = express.Router();

router.get("/dashboard", getHospitalDashboard);
router.post("/requests", createHospitalRequest);
router.get("/requests", getAllHospitalRequests);
router.get("/requests/:requestId", getHospitalRequestById);

export default router;