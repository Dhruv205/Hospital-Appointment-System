const express = require('express');
const { executeQuery } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get system statistics
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Get total counts
        const totalPatientsQuery = 'SELECT COUNT(*) as count FROM Patient';
        const totalDoctorsQuery = 'SELECT COUNT(*) as count FROM Doctor';
        const totalAppointmentsQuery = 'SELECT COUNT(*) as count FROM Appointment';
        const totalSpecializationsQuery = 'SELECT COUNT(*) as count FROM Specialization';

        // Get appointment status breakdown
        const appointmentStatusQuery = `
            SELECT status, COUNT(*) as count 
            FROM Appointment 
            GROUP BY status
        `;

        // Get monthly appointment trends
        const monthlyTrendsQuery = `
            SELECT 
                YEAR(appointment_date) as year,
                MONTH(appointment_date) as month,
                COUNT(*) as appointment_count
            FROM Appointment 
            WHERE appointment_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
            GROUP BY YEAR(appointment_date), MONTH(appointment_date)
            ORDER BY year DESC, month DESC
        `;

        // Get top specializations
        const topSpecializationsQuery = `
            SELECT s.spec_name, COUNT(a.appointment_id) as appointment_count
            FROM Specialization s
            LEFT JOIN Doctor_Specialization ds ON s.spec_id = ds.spec_id
            LEFT JOIN Doctor d ON ds.doctor_id = d.doctor_id
            LEFT JOIN Appointment a ON d.doctor_id = a.doctor_id
            GROUP BY s.spec_id, s.spec_name
            ORDER BY appointment_count DESC
            LIMIT 10
        `;

        const [
            totalPatientsResult,
            totalDoctorsResult,
            totalAppointmentsResult,
            totalSpecializationsResult,
            appointmentStatusResult,
            monthlyTrendsResult,
            topSpecializationsResult
        ] = await Promise.all([
            executeQuery(totalPatientsQuery),
            executeQuery(totalDoctorsQuery),
            executeQuery(totalAppointmentsQuery),
            executeQuery(totalSpecializationsQuery),
            executeQuery(appointmentStatusQuery),
            executeQuery(monthlyTrendsQuery),
            executeQuery(topSpecializationsQuery)
        ]);

        // Check if any query failed
        const results = [
            totalPatientsResult, totalDoctorsResult, totalAppointmentsResult,
            totalSpecializationsResult, appointmentStatusResult, monthlyTrendsResult,
            topSpecializationsResult
        ];

        const failedResult = results.find(result => !result.success);
        if (failedResult) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch system statistics',
                error: failedResult.error
            });
        }

        res.json({
            success: true,
            data: {
                totals: {
                    patients: totalPatientsResult.data[0].count,
                    doctors: totalDoctorsResult.data[0].count,
                    appointments: totalAppointmentsResult.data[0].count,
                    specializations: totalSpecializationsResult.data[0].count
                },
                appointmentStatus: appointmentStatusResult.data,
                monthlyTrends: monthlyTrendsResult.data,
                topSpecializations: topSpecializationsResult.data
            }
        });

    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching system statistics'
        });
    }
});

// Get all users (patients and doctors)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userType, limit = 50, offset = 0 } = req.query;

        let query;
        if (userType === 'patient') {
            query = `
                SELECT patient_id as id, first_name, last_name, email, phone, 
                       date_of_birth, gender, created_at, 'patient' as user_type
                FROM Patient
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            `;
        } else if (userType === 'doctor') {
            query = `
                SELECT doctor_id as id, first_name, last_name, email, phone,
                       license_number, experience_years, consultation_fee, created_at, 'doctor' as user_type
                FROM Doctor
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            `;
        } else {
            query = `
                SELECT patient_id as id, first_name, last_name, email, phone, 
                       date_of_birth, gender, created_at, 'patient' as user_type
                FROM Patient
                UNION ALL
                SELECT doctor_id as id, first_name, last_name, email, phone,
                       NULL as date_of_birth, NULL as gender, created_at, 'doctor' as user_type
                FROM Doctor
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            `;
        }

        const result = await executeQuery(query, [parseInt(limit), parseInt(offset)]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch users',
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result.data
        });

    } catch (error) {
        console.error('Fetch users error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching users'
        });
    }
});

// Get all appointments
router.get('/appointments', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { status, startDate, endDate, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT a.appointment_id, a.appointment_date, a.appointment_time, a.status,
                   a.problem_description, a.created_at, a.updated_at,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   p.email AS patient_email, p.phone AS patient_phone,
                   CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
                   d.email AS doctor_email, d.phone AS doctor_phone,
                   s.spec_name AS specialization
            FROM Appointment a
            JOIN Patient p ON a.patient_id = p.patient_id
            JOIN Doctor d ON a.doctor_id = d.doctor_id
            LEFT JOIN Doctor_Specialization ds ON d.doctor_id = ds.doctor_id
            LEFT JOIN Specialization s ON ds.spec_id = s.spec_id
            WHERE 1=1
        `;
        
        const params = [];

        if (status) {
            query += ' AND a.status = ?';
            params.push(status);
        }

        if (startDate) {
            query += ' AND a.appointment_date >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND a.appointment_date <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const result = await executeQuery(query, params);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch appointments',
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result.data
        });

    } catch (error) {
        console.error('Fetch appointments error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching appointments'
        });
    }
});

// Get system logs
router.get('/logs', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { limit = 100, offset = 0 } = req.query;

        const query = `
            SELECT audit_id, appointment_id, old_status, new_status, 
                   changed_by, change_reason, changed_at
            FROM appointment_audit_log
            ORDER BY changed_at DESC
            LIMIT ? OFFSET ?
        `;

        const result = await executeQuery(query, [parseInt(limit), parseInt(offset)]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch system logs',
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result.data
        });

    } catch (error) {
        console.error('Fetch logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching system logs'
        });
    }
});

// Create new specialization
router.post('/specializations', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { specName, description } = req.body;

        if (!specName || specName.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Specialization name is required and must be at least 2 characters'
            });
        }

        // Check if specialization already exists
        const checkQuery = 'SELECT spec_id FROM Specialization WHERE spec_name = ?';
        const checkResult = await executeQuery(checkQuery, [specName.trim()]);

        if (checkResult.success && checkResult.data.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Specialization already exists'
            });
        }

        // Create specialization
        const insertQuery = 'INSERT INTO Specialization (spec_name, description) VALUES (?, ?)';
        const result = await executeQuery(insertQuery, [specName.trim(), description || null]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to create specialization',
                error: result.error
            });
        }

        res.status(201).json({
            success: true,
            message: 'Specialization created successfully',
            data: {
                specId: result.data.insertId,
                specName: specName.trim(),
                description: description
            }
        });

    } catch (error) {
        console.error('Create specialization error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while creating specialization'
        });
    }
});

// Delete user
router.delete('/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { userType } = req.body;

        if (!userType || !['patient', 'doctor'].includes(userType)) {
            return res.status(400).json({
                success: false,
                message: 'User type is required and must be patient or doctor'
            });
        }

        let deleteQuery;
        if (userType === 'patient') {
            deleteQuery = 'DELETE FROM Patient WHERE patient_id = ?';
        } else {
            deleteQuery = 'DELETE FROM Doctor WHERE doctor_id = ?';
        }

        const result = await executeQuery(deleteQuery, [userId]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to delete user',
                error: result.error
            });
        }

        if (result.data.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User deleted successfully'
        });

    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while deleting user'
        });
    }
});

module.exports = router;
