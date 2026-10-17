import express from "express";
import {
    bookDonation,
    getDonations,
    cancelDonation
} from "../controllers/donationController.js";

const router = express.Router();

// POST /api/donations - Book a new blood donation slot
router.post("/", bookDonation);

// GET /api/donations - Get all or user donation appointments
router.get("/", getDonations);

// PATCH /api/donations/:id/cancel - Cancel an appointment
router.patch("/:id/cancel", cancelDonation);

export default router;
