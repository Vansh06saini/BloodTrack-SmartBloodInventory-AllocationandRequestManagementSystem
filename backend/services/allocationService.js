import db from "../db.js";

// function to find the highest priority request and allocate units pre-emptively
export const processNextRequest = async () => {

    // connection for database 
    const connection = await db.getConnection();

    // starting transaction
    try {
        await connection.beginTransaction();

        // fetching data and apply logic of priority (including PAUSED requests)
        const [requests] = await connection.execute(`
            SELECT
                request_id,
                request_code,
                hospital_id,
                blood_group,
                quantity,
                priority,
                status,
                required_date
            FROM hospital_requests
            WHERE status IN ('WAITING', 'PAUSED')
            ORDER BY
                CASE priority
                    WHEN 'EMERGENCY' THEN 1
                    WHEN 'URGENT' THEN 2
                    WHEN 'ROUTINE' THEN 3
                END,
                CASE status
                    WHEN 'PAUSED' THEN 1
                    WHEN 'WAITING' THEN 2
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
                message: "No waiting or paused requests"
            };
        }

        const request = requests[0];

        // fetching available units in stock (FEFO - First Expiry First Out)
        let [units] = await connection.execute(`
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

        // PREEMPTION LOGIC: If not enough available units and this request is high priority (EMERGENCY or URGENT)
        if (units.length < request.quantity && (request.priority === 'EMERGENCY' || request.priority === 'URGENT')) {
            const unitsNeeded = request.quantity - units.length;

            // Find candidate victim requests with strictly lower priority
            const [victimRequests] = await connection.execute(`
                SELECT 
                    request_id,
                    request_code,
                    priority,
                    quantity
                FROM hospital_requests
                WHERE blood_group = ?
                  AND status = 'ALLOCATED'
                  AND (
                      (? = 'EMERGENCY' AND priority IN ('URGENT', 'ROUTINE')) OR
                      (? = 'URGENT' AND priority = 'ROUTINE')
                  )
                ORDER BY 
                    CASE priority
                        WHEN 'ROUTINE' THEN 1
                        WHEN 'URGENT' THEN 2
                    END,
                    created_at DESC
                FOR UPDATE
            `, [
                request.blood_group,
                request.priority,
                request.priority
            ]);

            // Check if available lower-priority allocations can satisfy the shortage
            let accumulatedUnits = [...units];
            const victimsToPreempt = [];

            for (const victim of victimRequests) {
                // Fetch all units allocated to this victim request
                const [victimAllocations] = await connection.execute(`
                    SELECT 
                        ba.allocation_id,
                        ba.unit_id,
                        bu.unit_code,
                        bu.blood_group,
                        bu.expiry_date
                    FROM blood_allocations ba
                    JOIN blood_units bu ON ba.unit_id = bu.unit_id
                    WHERE ba.request_id = ?
                    FOR UPDATE
                `, [victim.request_id]);

                if (victimAllocations.length > 0) {
                    victimsToPreempt.push({
                        ...victim,
                        allocations: victimAllocations
                    });

                    for (const alloc of victimAllocations) {
                        accumulatedUnits.push({
                            unit_id: alloc.unit_id,
                            unit_code: alloc.unit_code,
                            blood_group: alloc.blood_group,
                            expiry_date: alloc.expiry_date
                        });
                    }
                }

                if (accumulatedUnits.length >= request.quantity) {
                    break;
                }
            }

            // If we found enough units through preemption
            if (accumulatedUnits.length >= request.quantity) {
                // Preempt and demote each selected victim request cleanly
                for (const victim of victimsToPreempt) {
                    // 1. Remove all previous allocations for this victim request
                    await connection.execute(`
                        DELETE FROM blood_allocations WHERE request_id = ?
                    `, [victim.request_id]);

                    // 2. Mark the victim request as PAUSED
                    await connection.execute(`
                        UPDATE hospital_requests
                        SET status = 'PAUSED',
                            updated_at = NOW()
                        WHERE request_id = ?
                    `, [victim.request_id]);

                    // 3. For any unit from this victim that is NOT used by the current emergency request,
                    // return its status to AVAILABLE
                    for (const alloc of victim.allocations) {
                        const isUsedInCurrent = units.length < request.quantity;

                        if (isUsedInCurrent) {
                            units.push({
                                unit_id: alloc.unit_id,
                                unit_code: alloc.unit_code,
                                blood_group: alloc.blood_group,
                                expiry_date: alloc.expiry_date
                            });

                            // Log preemption transfer
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
                                VALUES (?, 'TRANSFER', 1, 'REQUEST', ?, ?)
                            `, [
                                alloc.unit_id,
                                request.request_id,
                                `Preempted from Request #${victim.request_code} for ${request.priority} Request ${request.request_code}`
                            ]);
                        } else {
                            // Release excess back to general available pool
                            await connection.execute(`
                                UPDATE blood_units
                                SET status = 'AVAILABLE'
                                WHERE unit_id = ?
                            `, [alloc.unit_id]);

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
                                VALUES (?, 'INCOMING', 1, 'STOCK_ADJUSTMENT', ?, ?)
                            `, [
                                alloc.unit_id,
                                victim.request_id,
                                `Released back to available pool from paused Request #${victim.request_code}`
                            ]);
                        }
                    }
                }
            }
        }

        // Checking if we have enough blood units (either available or preempted)
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