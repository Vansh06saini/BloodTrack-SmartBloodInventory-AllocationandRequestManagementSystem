import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import "./db.js";
import authRoutes from "./routes/authRoutes.js";
import { authenticate, authorize } from "./middleware/authMiddleware.js";
import { assertTokenConfig } from "./utils/token.js";
import { warnIfEmailNotUnique } from "./utils/schemaCheck.js";

dotenv.config();

// Refuse to start without a valid JWT signing secret.
assertTokenConfig();

const app = express();
const PORT = process.env.PORT || 5000;



import bloodUnitRoutes from "./routes/bloodUnitRoutes.js";

// Middleware
app.use(cors());
app.use(express.json());

import hospitalRoutes from "./routes/hospitalRoutes.js";

// Routes
// Public: login / registration
app.use("/api/auth", authRoutes);

// Role-based access: Admin manages inventory, Hospital manages its own requests
app.use("/api/blood-units", authenticate, authorize("ADMIN"), bloodUnitRoutes);
app.use("/api/hospital", authenticate, authorize("HOSPITAL"), hospitalRoutes);



import allocationRoutes from "./routes/allocationRoutes.js";
import { startAllocationWorker } from "./workers/allocationWorker.js";

app.use("/api/allocation", authenticate, authorize("ADMIN"), allocationRoutes);

// Test route
app.get("/", (req, res) => {
    res.send("BloodTrack API is running");
});



// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    startAllocationWorker();
    warnIfEmailNotUnique();
});
