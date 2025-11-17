const express = require('express');
const { executeQuery } = require('../config/database');
const { authenticateToken, requireDoctor } = require('../middleware/auth');

const router = express.Router();

// Get doctor dashboard data
router.get('/dashboard', authenticateToken, requireDoctor, async (req, res) => {
    try {
        const doctorId = req.user.userId;

        // Get today's appointments
        const todayQuery = `
            SELECT a.appointment_id, a.appointment_date, a.appointment_time, a.status,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   p.phone AS patient_phone, a.problem_description
            FROM Appointment a
            JOIN Patient p ON a.patient_id = p.patient_id
            WHERE a.doctor_id = ? AND a.appointment_date = CURDATE()
            ORDER BY a.appointment_time ASC
        `;

        // Get pending appointment requests
        const pendingQuery = `
            SELECT a.appointment_id, a.appointment_date, a.appointment_time,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   p.phone AS patient_phone, a.problem_description, a.symptoms,
                   a.created_at
            FROM Appointment a
            JOIN Patient p ON a.patient_id = p.patient_id
            WHERE a.doctor_id = ? AND a.status = 'pending'
            ORDER BY a.created_at ASC
            LIMIT 10
        `;

        // Get appointment statistics
        const statsQuery = `
            SELECT 
                COUNT(*) AS total_appointments,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) AS approved_appointments,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_appointments,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_appointments
            FROM Appointment 
            WHERE doctor_id = ?
        `;

        // Get upcoming appointments (next 7 days)
        const upcomingQuery = `
            SELECT a.appointment_id, a.appointment_date, a.appointment_time, a.status,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   a.problem_description
            FROM Appointment a
            JOIN Patient p ON a.patient_id = p.patient_id
            WHERE a.doctor_id = ? 
            AND a.appointment_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
            AND a.status IN ('approved', 'pending')
            ORDER BY a.appointment_date ASC, a.appointment_time ASC
        `;

        const [todayResult, pendingResult, statsResult, upcomingResult] = await Promise.all([
            executeQuery(todayQuery, [doctorId]),
            executeQuery(pendingQuery, [doctorId]),
            executeQuery(statsQuery, [doctorId]),
            executeQuery(upcomingQuery, [doctorId])
        ]);

        if (!todayResult.success || !pendingResult.success || !statsResult.success || !upcomingResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch dashboard data'
            });
        }

        res.json({
            success: true,
            data: {
                todayAppointments: todayResult.data,
                pendingRequests: pendingResult.data,
                upcomingAppointments: upcomingResult.data,
                statistics: statsResult.data[0]
            }
        });

    } catch (error) {
        console.error('Doctor dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching dashboard data'
        });
    }
});

// Get doctor's specializations
router.get('/specializations', authenticateToken, requireDoctor, async (req, res) => {
    try {
        const doctorId = req.user.userId;

        const query = `
            SELECT s.spec_id, s.spec_name, s.description, ds.proficiency_level
            FROM Specialization s
            JOIN Doctor_Specialization ds ON s.spec_id = ds.spec_id
            WHERE ds.doctor_id = ?
            ORDER BY ds.proficiency_level DESC, s.spec_name
        `;

        const result = await executeQuery(query, [doctorId]);

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
        console.error('Fetch doctor specializations error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching specializations'
        });
    }
});

// Add specialization to doctor
router.post('/specializations', authenticateToken, requireDoctor, async (req, res) => {
    try {
        const doctorId = req.user.userId;
        const { specId, proficiencyLevel = 'Intermediate' } = req.body;

        // Check if specialization exists
        const specQuery = 'SELECT spec_id FROM Specialization WHERE spec_id = ?';
        const specResult = await executeQuery(specQuery, [specId]);

        if (!specResult.success || specResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Specialization not found'
            });
        }

        // Check if doctor already has this specialization
        const existingQuery = 'SELECT doctor_id FROM Doctor_Specialization WHERE doctor_id = ? AND spec_id = ?';
        const existingResult = await executeQuery(existingQuery, [doctorId, specId]);

        if (existingResult.success && existingResult.data.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Doctor already has this specialization'
            });
        }

        // Add specialization
        const insertQuery = `
            INSERT INTO Doctor_Specialization (doctor_id, spec_id, proficiency_level)
            VALUES (?, ?, ?)
        `;

        const result = await executeQuery(insertQuery, [doctorId, specId, proficiencyLevel]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to add specialization',
                error: result.error
            });
        }

        res.status(201).json({
            success: true,
            message: 'Specialization added successfully'
        });

    } catch (error) {
        console.error('Add specialization error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while adding specialization'
        });
    }
});

// Get doctor's patients
router.get('/patients', authenticateToken, requireDoctor, async (req, res) => {
    try {
        const doctorId = req.user.userId;
        const { limit = 20, offset = 0 } = req.query;

        const query = `
            SELECT DISTINCT p.patient_id, CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   p.email, p.phone, p.date_of_birth, p.gender,
                   COUNT(a.appointment_id) AS total_appointments,
                   MAX(a.appointment_date) AS last_appointment_date
            FROM Patient p
            JOIN Appointment a ON p.patient_id = a.patient_id
            WHERE a.doctor_id = ?
            GROUP BY p.patient_id, p.first_name, p.last_name, p.email, p.phone, p.date_of_birth, p.gender
            ORDER BY last_appointment_date DESC
            LIMIT ? OFFSET ?
        `;

        const result = await executeQuery(query, [doctorId, parseInt(limit), parseInt(offset)]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch patients',
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result.data
        });

    } catch (error) {
        console.error('Fetch doctor patients error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching patients'
        });
    }
});

// Get doctor's schedule for a specific date
router.get('/schedule/:date', authenticateToken, requireDoctor, async (req, res) => {
    try {
        const doctorId = req.user.userId;
        const { date } = req.params;

        const query = `
            SELECT a.appointment_id, a.appointment_time, a.status,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   p.phone AS patient_phone, a.problem_description
            FROM Appointment a
            JOIN Patient p ON a.patient_id = p.patient_id
            WHERE a.doctor_id = ? AND a.appointment_date = ?
            ORDER BY a.appointment_time ASC
        `;

        const result = await executeQuery(query, [doctorId, date]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch schedule',
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result.data
        });

    } catch (error) {
        console.error('Fetch doctor schedule error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching schedule'
        });
    }
});

// Get doctor's performance statistics
router.get('/performance', authenticateToken, requireDoctor, async (req, res) => {
    try {
        const doctorId = req.user.userId;
        const { startDate, endDate } = req.query;

        let query = `
            SELECT 
                COUNT(*) AS total_appointments,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_appointments,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) AS approved_appointments,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) AS rejected_appointments,
                ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*), 2) AS completion_rate,
                AVG(consultation_fee) AS avg_consultation_fee
            FROM Appointment a
            JOIN Doctor d ON a.doctor_id = d.doctor_id
            WHERE a.doctor_id = ?
        `;

        const params = [doctorId];

        if (startDate && endDate) {
            query += ' AND a.appointment_date BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }

        const result = await executeQuery(query, params);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch performance statistics',
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result.data[0]
        });

    } catch (error) {
        console.error('Fetch performance statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching performance statistics'
        });
    }
});

module.exports = router;
