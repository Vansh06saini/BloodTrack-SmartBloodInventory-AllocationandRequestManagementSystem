import pool from "../db.js";
import { verifyToken } from "../utils/token.js";

// Verifies the Bearer token, then loads the user from the database so a
// deleted user or a changed role takes effect immediately.
export const authenticate = async (req, res, next) => {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ error: "Authentication required.", message: "Authentication required." });
    }

    let payload;
    try {
        payload = verifyToken(token);
    } catch {
        return res.status(401).json({ error: "Invalid or expired session.", message: "Invalid or expired session." });
    }

    try {
        const [rows] = await pool.query(
            "SELECT user_id, Name, email, role FROM users WHERE user_id = ?",
            [payload.sub]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: "Invalid or expired session.", message: "Invalid or expired session." });
        }

        const user = rows[0];
        req.user = {
            id: user.user_id,
            name: user.Name,
            email: user.email,
            role: String(user.role || "").toUpperCase(),
        };
        next();
    } catch (err) {
        console.error("Auth middleware error:", err);
        res.status(500).json({ error: "Server error.", message: "Server error." });
    }
};

// Must run after `authenticate`.
export const authorize = (...allowedRoles) => (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
            error: "You do not have permission to access this resource.",
            message: "You do not have permission to access this resource.",
        });
    }
    next();
};
