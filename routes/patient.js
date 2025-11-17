const express = require('express');
const { executeQuery } = require('../config/database');
const { authenticateToken, requirePatient } = require('../middleware/auth');

const router = express.Router();

// Get patient dashboard data
router.get('/dashboard', authenticateToken, requirePatient, async (req, res) => {
    try {
        const patientId = req.user.userId;

        // Get upcoming appointments
        const upcomingQuery = `
            SELECT a.appointment_id, a.appointment_date, a.appointment_time, a.status,
                   CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
                   s.spec_name AS specialization
            FROM Appointment a
            JOIN Doctor d ON a.doctor_id = d.doctor_id
            LEFT JOIN Doctor_Specialization ds ON d.doctor_id = ds.doctor_id
            LEFT JOIN Specialization s ON ds.spec_id = s.spec_id
            WHERE a.patient_id = ? AND a.appointment_date >= CURDATE()
            ORDER BY a.appointment_date ASC, a.appointment_time ASC
            LIMIT 5
        `;

        // Get unread notifications
        const notificationsQuery = `
            SELECT n.notification_id, n.message, n.notification_type, n.created_at,
                   CONCAT(d.first_name, ' ', d.last_name) AS doctor_name
            FROM Notification n
            JOIN Doctor d ON n.doctor_id = d.doctor_id
            WHERE n.patient_id = ? AND n.is_read = FALSE
            ORDER BY n.created_at DESC
            LIMIT 10
        `;

        // Get appointment statistics
        const statsQuery = `
            SELECT 
                COUNT(*) AS total_appointments,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) AS approved_appointments,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_appointments,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_appointments,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_appointments,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) AS rejected_appointments,
                COUNT(CASE WHEN appointment_date >= CURDATE() AND status IN ('approved', 'pending') THEN 1 END) AS upcoming_appointments,
                COUNT(CASE WHEN status = 'completed' AND YEAR(appointment_date) = YEAR(CURDATE()) AND MONTH(appointment_date) = MONTH(CURDATE()) THEN 1 END) AS completed_appointments_this_month,
                COUNT(DISTINCT CASE WHEN status IN ('approved', 'pending', 'completed') THEN doctor_id END) AS distinct_doctors_seen
            FROM Appointment 
            WHERE patient_id = ?
        `;

        // Get recent appointment activity
        const recentActivityQuery = `
            SELECT 
                a.appointment_id,
                a.appointment_date,
                a.appointment_time,
                a.status,
                a.problem_description,
                CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
                s.spec_name AS specialization
            FROM Appointment a
            JOIN Doctor d ON a.doctor_id = d.doctor_id
            LEFT JOIN Doctor_Specialization ds ON d.doctor_id = ds.doctor_id
            LEFT JOIN Specialization s ON ds.spec_id = s.spec_id
            WHERE a.patient_id = ?
            ORDER BY a.appointment_date DESC, a.appointment_time DESC
            LIMIT 6
        `;

        const [upcomingResult, notificationsResult, statsResult, recentActivityResult] = await Promise.all([
            executeQuery(upcomingQuery, [patientId]),
            executeQuery(notificationsQuery, [patientId]),
            executeQuery(statsQuery, [patientId]),
            executeQuery(recentActivityQuery, [patientId])
        ]);

        if (!upcomingResult.success || !notificationsResult.success || !statsResult.success || !recentActivityResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch dashboard data'
            });
        }

        res.json({
            success: true,
            data: {
                upcomingAppointments: upcomingResult.data,
                notifications: notificationsResult.data,
                statistics: statsResult.data[0],
                nextAppointment: upcomingResult.data?.[0] || null,
                recentActivity: recentActivityResult.data
            }
        });

    } catch (error) {
        console.error('Patient dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching dashboard data'
        });
    }
});

// Get available doctors by specialization
router.get('/doctors', authenticateToken, requirePatient, async (req, res) => {
    try {
        const { specialization, date, time } = req.query;

        let query = `
            SELECT d.doctor_id, CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
                   d.consultation_fee, ds.proficiency_level, d.experience_years,
                   s.spec_name AS specialization
            FROM Doctor d
            LEFT JOIN Doctor_Specialization ds ON d.doctor_id = ds.doctor_id
            LEFT JOIN Specialization s ON ds.spec_id = s.spec_id
            WHERE 1=1
        `;
        
        const params = [];

        if (specialization) {
            query += ' AND s.spec_name LIKE ?';
            params.push(`%${specialization}%`);
        }

        if (date && time) {
            query += ` AND d.doctor_id NOT IN (
                SELECT doctor_id FROM Appointment 
                WHERE appointment_date = ? AND appointment_time = ? 
                AND status IN ('approved', 'pending')
            )`;
            params.push(date, time);
        }

        // Remove duplicate doctors when multiple specializations exist
        query += ' GROUP BY d.doctor_id, d.first_name, d.last_name, d.consultation_fee, d.experience_years';
        query += ' ORDER BY doctor_name';

        const result = await executeQuery(query, params);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch available doctors',
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result.data
        });

    } catch (error) {
        console.error('Fetch available doctors error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching doctors'
        });
    }
});

// Get specializations
router.get('/specializations', authenticateToken, requirePatient, async (req, res) => {
    try {
        const query = 'SELECT spec_id, spec_name, description FROM Specialization ORDER BY spec_name';
        const result = await executeQuery(query);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch specializations',
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result.data
        });

    } catch (error) {
        console.error('Fetch specializations error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching specializations'
        });
    }
});

// Get patient's appointment history
router.get('/appointments/history', authenticateToken, requirePatient, async (req, res) => {
    try {
        const patientId = req.user.userId;
        const { limit = 20, offset = 0, status } = req.query;

        let query = `
            SELECT a.appointment_id, a.appointment_date, a.appointment_time, a.status,
                   a.problem_description, a.created_at,
                   CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
                   s.spec_name AS specialization
            FROM Appointment a
            JOIN Doctor d ON a.doctor_id = d.doctor_id
            LEFT JOIN Doctor_Specialization ds ON d.doctor_id = ds.doctor_id
            LEFT JOIN Specialization s ON ds.spec_id = s.spec_id
            WHERE a.patient_id = ?
        `;
        
        const params = [patientId];

        if (status) {
            query += ' AND a.status = ?';
            params.push(status);
        }

        query += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const result = await executeQuery(query, params);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch appointment history',
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result.data
        });

    } catch (error) {
        console.error('Fetch appointment history error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching appointment history'
        });
    }
});

module.exports = router;
