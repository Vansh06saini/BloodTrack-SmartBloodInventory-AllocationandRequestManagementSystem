import db from "../db.js";

// Ensure blood_donations table exists
const ensureDonationsTable = async () => {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS blood_donations (
            donation_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            donor_name VARCHAR(255) NOT NULL,
            donor_email VARCHAR(255) NULL,
            donor_phone VARCHAR(50) NOT NULL,
            blood_group VARCHAR(10) NOT NULL,
            hospital_name VARCHAR(255) NOT NULL,
            hospital_address TEXT NULL,
            hospital_phone VARCHAR(50) NULL,
            hospital_website VARCHAR(255) NULL,
            donation_date DATE NOT NULL,
            donation_time_slot VARCHAR(50) NOT NULL,
            status ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED') DEFAULT 'SCHEDULED',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
};

// Book a new voluntary blood donation appointment
export const bookDonation = async (req, res) => {
    try {
        const {
            userId,
            donorName,
            donorEmail,
            donorPhone,
            bloodGroup,
            hospitalName,
            hospitalAddress,
            hospitalPhone,
            hospitalWebsite,
            donationDate,
            donationTimeSlot
        } = req.body;

        if (!donorName || !donorPhone || !bloodGroup || !hospitalName || !donationDate || !donationTimeSlot) {
            return res.status(400).json({
                message: "Please provide all required fields: Name, Phone, Blood Group, Centre, Date, and Time Slot."
            });
        }

        await ensureDonationsTable();

        const [result] = await db.execute(`
            INSERT INTO blood_donations 
            (
                user_id,
                donor_name,
                donor_email,
                donor_phone,
                blood_group,
                hospital_name,
                hospital_address,
                hospital_phone,
                hospital_website,
                donation_date,
                donation_time_slot,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED')
        `, [
            userId || null,
            donorName,
            donorEmail || null,
            donorPhone,
            bloodGroup,
            hospitalName,
            hospitalAddress || null,
            hospitalPhone || null,
            hospitalWebsite || null,
            donationDate,
            donationTimeSlot
        ]);

        return res.status(201).json({
            message: "Blood donation appointment scheduled successfully!",
            appointment: {
                donationId: result.insertId,
                donorName,
                donorPhone,
                bloodGroup,
                hospitalName,
                donationDate,
                donationTimeSlot,
                status: "SCHEDULED"
            }
        });

    } catch (error) {
        console.error("Error booking donation appointment:", error);
        return res.status(500).json({
            message: "Failed to schedule donation appointment"
        });
    }
};

// Get list of blood donation appointments (optionally filtered by user)
export const getDonations = async (req, res) => {
    try {
        const userId = req.query.userId;

        await ensureDonationsTable();

        let query = "SELECT * FROM blood_donations";
        const params = [];

        if (userId) {
            query += " WHERE user_id = ?";
            params.push(userId);
        }

        query += " ORDER BY donation_date DESC, created_at DESC";

        const [appointments] = await db.execute(query, params);

        return res.status(200).json({
            appointments: appointments || []
        });

    } catch (error) {
        console.error("Error fetching donation appointments:", error);
        return res.status(500).json({
            message: "Failed to load donation appointments"
        });
    }
};

// Cancel a donation appointment
export const cancelDonation = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ message: "Appointment ID is required" });
        }

        await ensureDonationsTable();

        await db.execute(`
            UPDATE blood_donations
            SET status = 'CANCELLED'
            WHERE donation_id = ?
        `, [id]);

        return res.status(200).json({
            message: "Donation appointment cancelled successfully"
        });
    } catch (error) {
        console.error("Error cancelling donation appointment:", error);
        return res.status(500).json({
            message: "Failed to cancel donation appointment"
        });
    }
};
