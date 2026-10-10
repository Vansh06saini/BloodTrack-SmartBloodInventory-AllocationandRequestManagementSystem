import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import pool from "./db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;



import bloodUnitRoutes from "./routes/bloodUnitRoutes.js";

// Middleware
app.use(cors());
app.use(express.json());

import hospitalRoutes from "./routes/hospitalRoutes.js";

// Routes
app.use("/api/blood-units", bloodUnitRoutes);
app.use("/api/hospital", hospitalRoutes);



import allocationRoutes from "./routes/allocationRoutes.js";
import { startAllocationWorker } from "./workers/allocationWorker.js";

app.use("/api/allocation", allocationRoutes);

// Test route
app.get("/", (req, res) => {
    res.send("BloodTrack API is running");
});



// REGISTRATION API
app.post("/api/auth/register", async (req, res) => {
    try {
        const { name, email, contact, password } = req.body;

        // 1. Validation (properly closed with })
        if (!name || !email || !contact || !password) {
            return res.status(400).json({ error: "All fields are required." });
        }

        // 2. Check if email already exists
        const [existingUsers] = await pool.query(
            "SELECT user_id FROM users WHERE email = ?",
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ error: "Email already exists." });
        }

        // 3. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4. Insert into database
        const [result] = await pool.query(
            "INSERT INTO users (Name, email, contact, password,role,created_at) VALUES (?, ?, ?, ?,'HOSPITAL', NOW())",
            [name, email, contact, hashedPassword]
        );

        res.status(201).json({
            message: "User registered successfully!",
            userId: result.insertId,
        });
    } catch (err) {
        console.error("Registration error:", err);
        res.status(500).json({ error: "Server error during registration." });
    }
});

// POST /api/auth/login
app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required." });
        }

        const [users] = await pool.query(
            "SELECT user_id, Name, email, password, role FROM users WHERE email = ?",
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        const user = users[0];

        if (role && user.role && user.role.toUpperCase() !== role.toUpperCase()) {
            return res.status(403).json({
                error: `Account role mismatch. You are registered as ${user.role}.`
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        const token = Buffer.from(`${user.user_id}:${user.email}:${Date.now()}`).toString("base64");

        res.status(200).json({
            message: "Login successful!",
            token,
            user: {
                id: user.user_id,
                name: user.Name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Server error during login." });
    }
});


// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    startAllocationWorker();
});
