import express from "express";
import rateLimit from "express-rate-limit";
import { login, register } from "../controllers/authController.js";

const router = express.Router();

// Throttle failed attempts (wrong password, unknown email, bad sign-up data)
// per IP. Successful requests are not counted.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.AUTH_RATE_LIMIT_MAX) || 20,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many attempts. Please try again in a few minutes." },
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);

export default router;
