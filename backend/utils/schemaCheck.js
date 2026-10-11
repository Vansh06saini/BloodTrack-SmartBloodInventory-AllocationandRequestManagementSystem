import pool from "../db.js";

// Duplicate-email protection is only race-free with a UNIQUE index.
// Warn loudly at startup if the migration hasn't been applied.
export const warnIfEmailNotUnique = async () => {
    try {
        const [rows] = await pool.query(
            `SELECT 1
               FROM information_schema.STATISTICS
              WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'users'
                AND COLUMN_NAME = 'email'
                AND NON_UNIQUE = 0
                AND INDEX_NAME NOT IN (
                    SELECT INDEX_NAME FROM information_schema.STATISTICS s2
                     WHERE s2.TABLE_SCHEMA = DATABASE() AND s2.TABLE_NAME = 'users'
                     GROUP BY INDEX_NAME HAVING COUNT(*) > 1
                )
              LIMIT 1`
        );
        if (rows.length === 0) {
            console.warn(
                "WARNING: users.email has no UNIQUE index. Run backend/sql/001_users_unique_email.sql " +
                "to make duplicate-email protection safe under concurrent sign-ups."
            );
        }
    } catch (err) {
        console.warn("Could not verify users.email unique index:", err.message);
    }
};
