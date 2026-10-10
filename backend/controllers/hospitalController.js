import db from "../db.js";
import { triggerImmediateAllocation } from "../workers/allocationWorker.js";

export const getHospitalDashboard = async (req, res) => {
    try {
        const hospitalId = req.query.hospitalId;

        if (!hospitalId) {
            return res.status(400).json({
                message: "Hospital ID is required"
            });
        }

        const [inventory] = await db.execute(`
                SELECT
                    blood_group,
                    COUNT(*) AS available_units
                FROM blood_units
                WHERE status = 'AVAILABLE'
                AND expiry_date >= CURDATE()
                GROUP BY blood_group
                ORDER BY blood_group
            `);

        const [totalResult] = await db.execute(`
                SELECT COUNT(*) AS total_available
                FROM blood_units
                WHERE status = 'AVAILABLE'
                AND expiry_date >= CURDATE()
            `);

        const [hospitalUser] = await db.execute(
            "SELECT user_id, Name, email, role FROM users WHERE user_id = ?",
            [hospitalId]
        );

        const [requestSummary] = await db.execute(`
                SELECT
                    COUNT(*) AS total_requests,
                    COALESCE(SUM(status = 'WAITING'), 0) AS waiting_requests,
                    COALESCE(SUM(status = 'PAUSED'), 0) AS paused_requests,
                    COALESCE(SUM(status = 'PROCESSING'), 0) AS processing_requests,
                    COALESCE(SUM(status = 'ALLOCATED'), 0) AS allocated_requests,
                    COALESCE(SUM(status = 'COMPLETED'), 0) AS completed_requests,
                    COALESCE(SUM(status = 'REJECTED'), 0) AS rejected_requests,
                    COALESCE(SUM(priority = 'EMERGENCY'), 0) AS emergency_requests
                FROM hospital_requests
                WHERE hospital_id = ?
            `, [hospitalId]);

        const [recentRequests] = await db.execute(`
                SELECT
                    request_id,
                    request_code,
                    blood_group,
                    quantity,
                    priority,
                    status,
                    required_date,
                    created_at
                FROM hospital_requests
                WHERE hospital_id = ?
                ORDER BY created_at DESC
                LIMIT 10
            `, [hospitalId]);

        res.status(200).json({
            hospital: hospitalUser[0] || null,
            inventory,
            totalAvailable: totalResult[0]?.total_available || 0,
            requestsSummary: requestSummary[0] || {},
            recentRequests: recentRequests || []
        });

    } catch (error) {
        console.error("Error fetching hospital dashboard:", error);

        res.status(500).json({
            message: "Failed to load hospital dashboard"
        });
    }
};


export const createHospitalRequest = async (req, res) => {

    //extract input
    const {
        hospitalId,
        bloodGroup,
        quantity,
        priority,
        requiredDate,
        reason
    } = req.body;

    //validate input

    if (
        !hospitalId ||
        !bloodGroup ||
        !quantity ||
        !priority ||
        !requiredDate ||
        !reason
    ) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    if (!Number.isInteger(Number(quantity)) || Number(quantity) <= 0) {
        return res.status(400).json({
            message: "Quantity must be a positive number"
        });
    }

    const validPriorities = [
        "EMERGENCY",
        "URGENT",
        "ROUTINE"
    ];

    if (!validPriorities.includes(priority)) {
        return res.status(400).json({
            message: "Invalid priority"
        });
    }

    //query db
    try {
        const requestCode = `REQ-${Date.now()}`;

        const [result] = await db.execute(
            `
                INSERT INTO hospital_requests
                (
                    request_code,
                    hospital_id,
                    blood_group,
                    quantity,
                    priority,
                    required_date,
                    reason,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, 'WAITING')
                `,
            [
                requestCode,
                hospitalId,
                bloodGroup,
                Number(quantity),
                priority,
                requiredDate,
                reason
            ]
        );

        // Immediate preemption execution for EMERGENCY requests
        if (priority === "EMERGENCY") {
            triggerImmediateAllocation().catch((err) => {
                console.error("Immediate preemption allocation error:", err);
            });
        }

        res.status(201).json({
            message: "Blood request submitted successfully",
            request: {
                requestId: result.insertId,
                requestCode,
                hospitalId,
                bloodGroup,
                quantity: Number(quantity),
                priority,
                requiredDate,
                reason,
                status: "WAITING"
            }
        });

    } catch (error) {
        console.error("Error creating hospital request:", error);

        res.status(500).json({
            message: "Failed to submit blood request"
        });
    }
};

export const getAllHospitalRequests = async (req, res) => {
    try {
        const hospitalId = req.query.hospitalId;

        if (!hospitalId) {
            return res.status(400).json({
                message: "Hospital ID is required"
            });
        }

        const [requests] = await db.execute(`
            SELECT
                hr.request_id,
                hr.request_code,
                hr.hospital_id,
                hr.blood_group,
                hr.quantity,
                hr.priority,
                hr.status,
                hr.required_date,
                hr.reason,
                hr.created_at,
                hr.updated_at,
                COUNT(ba.allocation_id) AS allocated_count
            FROM hospital_requests hr
            LEFT JOIN blood_allocations ba ON hr.request_id = ba.request_id
            WHERE hr.hospital_id = ?
            GROUP BY hr.request_id
            ORDER BY hr.created_at DESC
        `, [hospitalId]);

        res.status(200).json({
            requests: requests || []
        });
    } catch (error) {
        console.error("Error fetching hospital requests:", error);
        res.status(500).json({
            message: "Failed to fetch blood requests"
        });
    }
};

export const getHospitalRequestById = async (req, res) => {
    try {
        const { requestId } = req.params;

        if (!requestId) {
            return res.status(400).json({
                message: "Request ID is required"
            });
        }

        const [requests] = await db.execute(`
            SELECT
                hr.request_id,
                hr.request_code,
                hr.hospital_id,
                hr.blood_group,
                hr.quantity,
                hr.priority,
                hr.status,
                hr.required_date,
                hr.reason,
                hr.created_at,
                hr.updated_at,
                u.Name AS hospital_name,
                u.email AS hospital_email
            FROM hospital_requests hr
            LEFT JOIN users u ON hr.hospital_id = u.user_id
            WHERE hr.request_id = ? OR hr.request_code = ?
            LIMIT 1
        `, [requestId, requestId]);

        if (requests.length === 0) {
            return res.status(404).json({
                message: "Blood request not found"
            });
        }

        const request = requests[0];

        // Fetch allocated units if any
        const [allocatedUnits] = await db.execute(`
            SELECT
                ba.allocation_id,
                ba.allocated_at,
                bu.unit_id,
                bu.unit_code,
                bu.blood_group,
                bu.expiry_date,
                bu.batch_number
            FROM blood_allocations ba
            JOIN blood_units bu ON ba.unit_id = bu.unit_id
            WHERE ba.request_id = ?
        `, [request.request_id]);

        res.status(200).json({
            request,
            allocatedUnits: allocatedUnits || []
        });
    } catch (error) {
        console.error("Error fetching request details:", error);
        res.status(500).json({
            message: "Failed to load request details"
        });
    }
};