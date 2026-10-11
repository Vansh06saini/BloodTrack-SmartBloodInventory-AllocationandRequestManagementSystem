import bcrypt from "bcryptjs";
import pool from "../db.js";
import {
    normalizeEmail,
    validateRegistration
} from "../utils/authValidation.js";
import { signToken } from "../utils/token.js";

const BCRYPT_ROUNDS = 12;

const publicUser = (row) => ({
    id: row.user_id,
    name: row.Name,
    email: row.email,
    role: String(row.role || "").toUpperCase(),
});

// POST /api/auth/register
// Public registration always creates a HOSPITAL account.
// Any role supplied in the request body is ignored.
export const register = async (req, res) => {
    const { values, fields } = validateRegistration(req.body ?? {});
    const firstError = Object.values(fields)[0];

    if (firstError) {
        return res.status(400).json({
            code: "VALIDATION_ERROR",
            error: firstError,
            fields,
        });
    }

    const emailExists = {
        code: "EMAIL_EXISTS",
        error: "An account with this email already exists. Please sign in.",
    };

    try {
        const [existing] = await pool.query(
            "SELECT user_id FROM users WHERE email = ?",
            [values.email]
        );

        if (existing.length > 0) {
            return res.status(409).json(emailExists);
        }

        // Hash the password before saving it.
        const hashedPassword = await bcrypt.hash(
            values.password,
            BCRYPT_ROUNDS
        );

        let insertId;

        try {
            // Fixed: use columns that exist in the current users table.
    const [result] = await pool.query(
    `INSERT INTO users
        (Name, email, contact, password, role, hospital_name)
     VALUES (?, ?, ?, ?, 'HOSPITAL', ?)`,
    [
        values.name,
        values.email,
        values.contact,
        hashedPassword,
        values.name,
    ]
);
            insertId = result.insertId;
        } catch (err) {
            // Handle simultaneous registrations with the same email.
            if (err.code === "ER_DUP_ENTRY") {
                return res.status(409).json(emailExists);
            }

            throw err;
        }

        const user = {
            user_id: insertId,
            Name: values.name,
            email: values.email,
            role: "HOSPITAL",
        };

        // Automatically log the user in after registration.
        return res.status(201).json({
            message: "User registered successfully!",
            userId: insertId,
            token: signToken(user),
            user: publicUser(user),
        });
    } catch (err) {
        console.error("Registration error:", err);

        return res.status(500).json({
            error: "Server error during registration.",
        });
    }
};

// POST /api/auth/login
// Existing users sign in normally.
// Unknown emails can trigger the frontend's account-creation flow.
export const login = async (req, res) => {
    try {
        const { email, password, role } = req.body ?? {};

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                error: "Email and password are required.",
            });
        }

        const requestedRole =
            typeof role === "string" ? role.toUpperCase() : "";

        const [users] = await pool.query(
            `SELECT user_id, Name, email, password, role
             FROM users
             WHERE email = ?`,
            [normalizeEmail(email)]
        );

        if (users.length === 0) {
            const canRegister = requestedRole !== "ADMIN";

            return res.status(404).json({
                code: "ACCOUNT_NOT_FOUND",
                canRegister,
                error: canRegister
                    ? "No account found for this email."
                    : "No Blood Bank Admin account exists for this email. Admin accounts are not created through sign-up.",
            });
        }

        const user = users[0];

        // Compare the submitted password with the stored hash.
        const isMatch = await bcrypt.compare(
            password,
            user.password || ""
        );

        if (!isMatch) {
            return res.status(401).json({
                error: "Invalid email or password.",
            });
        }

        // Check the requested role only after password verification.
        if (
            requestedRole &&
            user.role &&
            user.role.toUpperCase() !== requestedRole
        ) {
            return res.status(403).json({
                error: `Account role mismatch. You are registered as ${user.role}.`,
            });
        }

        return res.status(200).json({
            message: "Login successful!",
            token: signToken(user),
            user: publicUser(user),
        });
    } catch (err) {
        console.error("Login error:", err);

        return res.status(500).json({
            error: "Server error during login.",
        });
    }
};