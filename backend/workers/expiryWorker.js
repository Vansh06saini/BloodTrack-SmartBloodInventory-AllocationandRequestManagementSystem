import db from "../db.js";

let isRunning = false;

export const runExpiryCheck = async () => {
    if (isRunning) {
        return;
    }

    isRunning = true;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Find all available blood units that have passed their expiration date
        const [expiredUnits] = await connection.execute(`
            SELECT
                unit_id,
                unit_code,
                blood_group,
                expiry_date
            FROM blood_units
            WHERE status = 'AVAILABLE'
              AND expiry_date < CURDATE()
            FOR UPDATE
        `);

        if (expiredUnits.length === 0) {
            await connection.rollback();
            return {
                removedCount: 0,
                message: "No expired blood units found"
            };
        }

        for (const unit of expiredUnits) {
            // Mark blood unit status as EXPIRED (removing it from active available stock)
            await connection.execute(`
                UPDATE blood_units
                SET status = 'EXPIRED'
                WHERE unit_id = ?
            `, [unit.unit_id]);

            // Record expired stock movement for audit/compliance
            await connection.execute(`
                INSERT INTO stock_movements
                (
                    unit_id,
                    movement_type,
                    quantity,
                    reference_type,
                    reference_id,
                    remarks
                )
                VALUES (?, 'EXPIRED', 1, 'SYSTEM_CLEANUP', ?, ?)
            `, [
                unit.unit_id,
                unit.unit_id,
                `Unit ${unit.unit_code}`
            ]);
        }

        await connection.commit();

        console.log(`[Expiry Worker] Successfully processed and removed ${expiredUnits.length} expired blood unit(s) from available inventory.`);

        return {
            removedCount: expiredUnits.length,
            units: expiredUnits
        };

    } catch (error) {
        await connection.rollback();
        console.error("[Expiry Worker] Error while removing expired units:", error);
    } finally {
        isRunning = false;
        connection.release();
    }
};

export const startExpiryWorker = () => {
    console.log("Expiry cleanup worker started");

    // Run immediately on server boot
    runExpiryCheck();

    // Run every 10 minutes to auto-remove expired blood units
    const INTERVAL_MS = 10 * 60 * 1000;
    setInterval(() => {
        runExpiryCheck();
    }, INTERVAL_MS);
};
