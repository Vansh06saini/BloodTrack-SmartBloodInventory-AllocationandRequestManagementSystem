import db from "../db.js";

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