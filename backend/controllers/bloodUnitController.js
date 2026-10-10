import pool from "../db.js";

export const addBloodUnits = async (req, res) => {
    const {
        bloodGroup,
        quantity,
        collectionDate,
        expiryDate,
        batchNumber
    } = req.body;

    if (
        !bloodGroup ||
        !quantity ||
        !collectionDate ||
        !expiryDate ||
        !batchNumber
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

    if (new Date(expiryDate) <= new Date(collectionDate)) {
        return res.status(400).json({
            message: "Expiry date must be after collection date"
        });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const createdUnits = [];

        for (let i = 0; i < Number(quantity); i++) {
            const unitCode = `BU-${Date.now()}-${i + 1}`;

            const [result] = await connection.execute(
                `INSERT INTO blood_units
        (
          unit_code,
          blood_group,
          collection_date,
          expiry_date,
          batch_number,
          status
        )
        VALUES (?, ?, ?, ?, ?, 'AVAILABLE')`,
                [
                    unitCode,
                    bloodGroup,
                    collectionDate,
                    expiryDate,
                    batchNumber
                ]
            );

            const unitId = result.insertId;

            await connection.execute(
                `INSERT INTO stock_movements
        (
          unit_id,
          movement_type,
          reference_type,
          reference_id,
          quantity,
          remarks
        )
        VALUES (?, 'INCOMING', 'BATCH', ?, 1, ?)`,
                [
                    unitId,
                    unitId,
                    `New ${bloodGroup} blood unit received`
                ]
            );

            createdUnits.push({
                unitId,
                unitCode,
                bloodGroup,
                collectionDate,
                expiryDate,
                batchNumber,
                status: "AVAILABLE"
            });
        }

        await connection.commit();

        return res.status(201).json({
            message: `${quantity} blood unit(s) added successfully`,
            units: createdUnits
        });
    } catch (error) {
        await connection.rollback();

        console.error("Error adding blood units:", error);

        return res.status(500).json({
            message: "Failed to add blood units"
        });
    } finally {
        connection.release();
    }
};

export const getDashboardSummary = async (req, res) => {
    try {
        const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

        // 1. Get available units count grouped by blood group
        const [stockRows] = await pool.query(`
            SELECT 
                blood_group, 
                COUNT(*) as units 
            FROM blood_units 
            WHERE status = 'AVAILABLE' AND expiry_date >= CURDATE()
            GROUP BY blood_group
        `);

        const stockMap = {};
        stockRows.forEach((row) => {
            stockMap[row.blood_group] = Number(row.units);
        });

        const stock = bloodGroups.map((group) => ({
            bloodGroup: group,
            units: stockMap[group] || 0,
        }));

        const totalUnits = stock.reduce((total, item) => total + item.units, 0);
        const lowStockGroups = stock.filter((item) => item.units < 10).length;

        // 2. Today's incoming from stock_movements
        const [incomingRows] = await pool.query(`
            SELECT COALESCE(SUM(quantity), 0) as count 
            FROM stock_movements 
            WHERE movement_type = 'INCOMING' AND DATE(created_at) = CURDATE()
        `);
        const incomingToday = Number(incomingRows[0]?.count || 0);

        // 3. Today's outgoing from stock_movements
        const [outgoingRows] = await pool.query(`
            SELECT COALESCE(SUM(quantity), 0) as count 
            FROM stock_movements 
            WHERE movement_type IN ('OUTGOING', 'ALLOCATED') AND DATE(created_at) = CURDATE()
        `);
        const outgoingToday = Number(outgoingRows[0]?.count || 0);

        return res.status(200).json({
            summary: {
                totalUnits,
                incomingToday,
                outgoingToday,
                lowStockGroups,
            },
            stock,
        });
    } catch (error) {
        console.error("Error fetching dashboard summary:", error);
        return res.status(500).json({
            message: "Failed to fetch dashboard summary",
        });
    }
};

export const getDailyBloodLogs = async (req, res) => {
    try {
        const { date, type, bloodGroup, limit } = req.query;
        const maxLimit = limit ? Math.min(Math.max(parseInt(limit, 10) || 15, 1), 100) : 15;

        let query = `
            SELECT 
                sm.movement_id AS id,
                sm.movement_type,
                sm.quantity,
                sm.remarks,
                sm.created_at,
                sm.reference_type,
                sm.reference_id,
                bu.unit_id,
                bu.unit_code,
                bu.blood_group,
                bu.batch_number,
                hr.request_code
            FROM stock_movements sm
            LEFT JOIN blood_units bu ON sm.unit_id = bu.unit_id
            LEFT JOIN hospital_requests hr ON (sm.reference_type = 'REQUEST' AND sm.reference_id = hr.request_id)
            WHERE 1=1
        `;

        const params = [];

        if (date && date !== "All" && date !== "") {
            query += ` AND DATE(sm.created_at) = ?`;
            params.push(date);
        }

        if (type && type !== "All") {
            if (type.toUpperCase() === "INCOMING") {
                query += ` AND sm.movement_type = 'INCOMING'`;
            } else if (type.toUpperCase() === "OUTGOING") {
                query += ` AND sm.movement_type IN ('OUTGOING', 'ALLOCATED')`;
            }
        }

        if (bloodGroup && bloodGroup !== "All") {
            query += ` AND bu.blood_group = ?`;
            params.push(bloodGroup);
        }

        query += ` ORDER BY sm.created_at DESC, sm.movement_id DESC LIMIT ?`;
        params.push(maxLimit);

        const [rows] = await pool.query(query, params);

        const logs = rows.map((row) => {
            const isIncoming = row.movement_type === "INCOMING";
            const createdAtDate = new Date(row.created_at);

            const time = !isNaN(createdAtDate.getTime())
                ? createdAtDate.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                })
                : "N/A";

            const formattedDate = !isNaN(createdAtDate.getTime())
                ? createdAtDate.toISOString().split("T")[0]
                : "";

            const reference = isIncoming
                ? (row.batch_number || `BATCH-${row.reference_id || row.unit_id || "N/A"}`)
                : (row.request_code || (row.reference_id ? `REQ-${row.reference_id}` : "N/A"));

            return {
                id: `LOG-${row.id}`,
                rawId: row.id,
                time,
                date: formattedDate,
                createdAt: row.created_at,
                unitId: row.unit_code || (row.unit_id ? `BU-${row.unit_id}` : `BU-${row.id}`),
                bloodGroup: row.blood_group || "N/A",
                type: isIncoming ? "Incoming" : "Outgoing",
                quantity: Number(row.quantity) || 1,
                reference,
                details: row.remarks || (isIncoming ? "New blood units received" : "Allocated to hospital request"),
            };
        });

        return res.status(200).json({
            logs,
            count: logs.length,
        });
    } catch (error) {
        console.error("Error fetching daily blood logs:", error);
        return res.status(500).json({
            message: "Failed to fetch daily blood logs",
        });
    }
};
