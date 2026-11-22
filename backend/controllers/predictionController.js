import pool from "../db.js";
import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:5001";
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

/**
 * Fetches prediction from the FastAPI microservice, with a fallback
 * to running the local Python predict_cli script if the microservice is down.
 * Sends real hospital orders from MySQL so predictions reflect live database history.
 */
const getAiPredictions = async (asOfDate, orders = []) => {
    // 1. Try FastAPI microservice via POST
    try {
        const url = `${AI_SERVICE_URL}/predict/demand`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                as_of_date: asOfDate || null,
                orders: orders || [],
            }),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            return { data: data.data, source: "fastapi_microservice" };
        }
    } catch (err) {
        // FastAPI microservice not running on port 5001, falling back to direct Python CLI execution
    }

    // 2. Direct fallback execution of predictor via Python CLI process with stdin
    return new Promise((resolve, reject) => {
        const pythonScript = path.join(__dirname, "../ai_service/predict_cli.py");
        const pyProcess = execFile(
            "python",
            [pythonScript],
            { cwd: path.join(__dirname, "../ai_service"), maxBuffer: 10 * 1024 * 1024 },
            (error, stdout, stderr) => {
                if (error) {
                    console.error("Direct python execution failed:", error, stderr);
                    return reject(new Error("Unable to connect to AI prediction service or run model."));
                }
                try {
                    const parsed = JSON.parse(stdout.trim());
                    if (parsed.success && parsed.data) {
                        resolve({ data: parsed.data, source: "python_local_fallback" });
                    } else {
                        reject(new Error(parsed.error || "Prediction script returned error"));
                    }
                } catch (parseErr) {
                    console.error("Failed to parse Python CLI output:", stdout);
                    reject(parseErr);
                }
            }
        );

        // Send payload via stdin
        pyProcess.stdin.write(JSON.stringify({ as_of_date: asOfDate || null, orders: orders || [] }));
        pyProcess.stdin.end();
    });
};

/**
 * GET /api/predictions/demand-forecast
 * Fetches real orders from MySQL database, computes the 7-day AI forecast,
 * and compares it with live inventory to generate risk alerts.
 */
export const getDemandForecast = async (req, res) => {
    try {
        const { asOfDate } = req.query;

        // 1. Fetch real historical hospital orders from MySQL database
        let realOrders = [];
        try {
            const [orderRows] = await pool.query(`
                SELECT 
                    blood_group, 
                    quantity, 
                    priority, 
                    created_at 
                FROM hospital_requests 
                WHERE status != 'REJECTED'
                ORDER BY created_at ASC
            `);

            if (orderRows && orderRows.length > 0) {
                realOrders = orderRows.map((r) => ({
                    blood_group: r.blood_group,
                    quantity: Number(r.quantity) || 1,
                    priority: r.priority || "ROUTINE",
                    created_at: r.created_at
                        ? new Date(r.created_at).toISOString().slice(0, 19).replace("T", " ")
                        : new Date().toISOString().slice(0, 19).replace("T", " "),
                }));
            }
        } catch (dbErr) {
            console.warn("Could not query hospital_requests table:", dbErr.message);
        }

        // 2. Get AI predictions driven by real database orders (or baseline fallback if 0 orders)
        const { data: forecastData, source } = await getAiPredictions(asOfDate, realOrders);

        // 3. Fetch live stock from MySQL database for all blood groups
        const liveStockMap = {};
        try {
            const [stockRows] = await pool.query(`
                SELECT 
                    blood_group, 
                    COUNT(*) as available_units 
                FROM blood_units 
                WHERE status = 'AVAILABLE' AND expiry_date >= CURDATE()
                GROUP BY blood_group
            `);
            if (stockRows && stockRows.length > 0) {
                stockRows.forEach((row) => {
                    liveStockMap[row.blood_group] = Number(row.available_units);
                });
            }
        } catch (stockErr) {
            console.warn("Could not query blood_units table:", stockErr.message);
        }

        // 4. Build Inventory vs. Forecast Comparison Matrix
        let criticalShortages = 0;
        let moderateShortages = 0;
        let totalCurrentStock = 0;
        let totalPredictedDemand = 0;

        const inventoryComparison = BLOOD_GROUPS.map((bg) => {
            const currentStock = liveStockMap[bg] || 0;
            const groupForecast = forecastData.predictions[bg] || { total_7_days: 0, daily: [] };
            const predictedDemand = groupForecast.total_7_days;
            const netBalance = currentStock - predictedDemand;
            const coverageRatio = predictedDemand > 0 ? (currentStock / predictedDemand) : (currentStock > 0 ? 2.0 : 1.0);

            totalCurrentStock += currentStock;
            totalPredictedDemand += predictedDemand;

            let status = "BALANCED";
            let statusSeverity = "success"; // "danger", "warning", "info", "success"
            let recommendedAction = "Stock is adequate to fulfill expected 7-day demand.";

            if (currentStock === 0 && predictedDemand > 0) {
                status = "STOCKOUT_ALERT";
                statusSeverity = "danger";
                recommendedAction = `CRITICAL: Zero stock available! Expected demand is ${predictedDemand} units. Initiate emergency blood drive or transfer.`;
                criticalShortages++;
            } else if (coverageRatio < 0.5) {
                status = "CRITICAL_DEFICIT";
                statusSeverity = "danger";
                recommendedAction = `Urgent deficit anticipated (-${Math.abs(netBalance)} units). Schedule targeted ${bg} donor drives immediately.`;
                criticalShortages++;
            } else if (coverageRatio < 1.0) {
                status = "MODERATE_DEFICIT";
                statusSeverity = "warning";
                recommendedAction = `Expected deficit of ${Math.abs(netBalance)} units over the next 7 days. Monitor hospital requests and inbound donations.`;
                moderateShortages++;
            } else if (coverageRatio > 2.0 && currentStock > 15) {
                status = "SURPLUS";
                statusSeverity = "info";
                recommendedAction = `Surplus inventory (+${netBalance} units). Monitor component shelf-life to prevent expiration.`;
            }

            return {
                bloodGroup: bg,
                currentStock,
                predicted7DayDemand: predictedDemand,
                dailyAvgDemand: groupForecast.avg_daily_units || 0,
                netBalance,
                coveragePercentage: Math.round(coverageRatio * 100),
                status,
                statusSeverity,
                recommendedAction,
                dailyBreakdown: groupForecast.daily || [],
            };
        });

        // Sort so groups in critical/moderate deficit appear at the top
        const severityOrder = { danger: 1, warning: 2, info: 3, success: 4 };
        inventoryComparison.sort((a, b) => severityOrder[a.statusSeverity] - severityOrder[b.statusSeverity]);

        return res.status(200).json({
            success: true,
            source,
            dataSource: forecastData.data_source,
            forecastWindow: {
                referenceDate: forecastData.reference_date,
                forecastDates: forecastData.forecast_dates,
                generatedAt: forecastData.forecast_generated_at,
            },
            summary: {
                totalCurrentStock,
                totalPredictedDemand,
                netSystemBalance: totalCurrentStock - totalPredictedDemand,
                criticalShortageGroupsCount: criticalShortages,
                moderateShortageGroupsCount: moderateShortages,
                systemStatus: criticalShortages > 0 ? "ACTION_REQUIRED" : "NORMAL",
            },
            inventoryComparison,
            rawForecast: forecastData,
        });
    } catch (error) {
        console.error("Error in getDemandForecast:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate blood demand forecast",
            error: error.message,
        });
    }
};

/**
 * GET /api/predictions/model-info
 * Returns trained model parameters and validation metrics.
 */
export const getModelInfo = async (req, res) => {
    try {
        const response = await fetch(`${AI_SERVICE_URL}/model/metadata`);
        if (response.ok) {
            const data = await response.json();
            return res.status(200).json(data);
        }
    } catch (err) {
        // Fallback reading local metadata file
    }

    try {
        const fs = await import("fs/promises");
        const metaPath = path.join(__dirname, "../ai_service/models/model_metadata.json");
        const content = await fs.readFile(metaPath, "utf-8");
        return res.status(200).json({
            success: true,
            metadata: JSON.parse(content),
            source: "local_file",
        });
    } catch (fsErr) {
        return res.status(500).json({
            success: false,
            message: "Model metadata not available",
        });
    }
};
