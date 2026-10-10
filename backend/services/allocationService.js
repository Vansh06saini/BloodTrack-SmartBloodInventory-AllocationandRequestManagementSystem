import db from "../db.js";

// function to find the higest priority request 
export const processNextRequest = async () => {

    // connection for database 
    const connection = await db.getConnection();

    // starting transaction
    try {
        await connection.beginTransaction();

        // fetching data and apply logic of priority 
        const [requests] = await connection.execute(`
            SELECT
                request_id,
                request_code,
                hospital_id,
                blood_group,
                quantity,
                priority,
                required_date
            FROM hospital_requests
            WHERE status = 'WAITING'
            ORDER BY
                CASE priority
                    WHEN 'EMERGENCY' THEN 1
                    WHEN 'URGENT' THEN 2
                    WHEN 'ROUTINE' THEN 3
                END,
                required_date ASC,
                created_at ASC
            LIMIT 1
            FOR UPDATE
        `);


        if (requests.length === 0) {
            await connection.rollback();

            return {
                processed: false,
                message: "No waiting requests"
            };
        }

        // fetching units
        const request = requests[0];

        const [units] = await connection.execute(`
            SELECT
                unit_id,
                unit_code,
                blood_group,
                expiry_date
            FROM blood_units
            WHERE blood_group = ?
              AND status = 'AVAILABLE'
              AND expiry_date >= CURDATE()
            ORDER BY
                expiry_date ASC,
                unit_id ASC
            LIMIT ?
            FOR UPDATE
        `, [
            request.blood_group,
            request.quantity
        ]);
        //checking for enough blood unit we have in db using rollback to maintatin atomicity
        if (units.length < request.quantity) {
            await connection.rollback();

            return {
                processed: false,
                requestId: request.request_id,
                message: "Not enough blood units available"
            };
        }

        // changing requests to processing 
        await connection.execute(`
            UPDATE hospital_requests
            SET status = 'PROCESSING',
                updated_at = NOW()
            WHERE request_id = ?
        `, [request.request_id]);

        // updating the blood allocation db
        for (const unit of units) {
            await connection.execute(`
                INSERT INTO blood_allocations
                (
                    request_id,
                    unit_id,
                    allocated_at
                )
                VALUES (?, ?, NOW())
            `, [
                request.request_id,
                unit.unit_id
            ]);

            await connection.execute(`
                UPDATE blood_units
                SET status = 'ALLOCATED'
                WHERE unit_id = ?
            `, [unit.unit_id]);

            // updating stock movement for admin dashboard

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
                VALUES (?, 'OUTGOING', 1, 'REQUEST', ?, ?)
            `, [
                unit.unit_id,
                request.request_id,
                `Allocated to request ${request.request_code}`
            ]);
        }

        await connection.execute(`
            UPDATE hospital_requests
            SET status = 'ALLOCATED',
                updated_at = NOW()
            WHERE request_id = ?
        `, [request.request_id]);

        await connection.commit();

        // info to allocationworker 
        return {
            processed: true,
            requestId: request.request_id,
            requestCode: request.request_code,
            bloodGroup: request.blood_group,
            quantity: request.quantity,
            priority: request.priority,
            allocatedUnits: units.map((unit) => ({
                unitId: unit.unit_id,
                unitCode: unit.unit_code,
                expiryDate: unit.expiry_date
            }))
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};