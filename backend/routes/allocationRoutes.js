import express from "express";
import { processAllocation } from "../controllers/allocationController.js";

const router = express.Router();

router.post("/process", processAllocation);

export default router;