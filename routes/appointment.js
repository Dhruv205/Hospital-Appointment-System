const express = require('express');
const { body, validationResult } = require('express-validator');
const { executeQuery, executeTransaction } = require('../config/database');
const { authenticateToken, requirePatient, requireDoctor } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const appointmentValidation = [
    body('doctorId').isInt({ min: 1 }).withMessage('Valid doctor ID required'),
    body('appointmentDate').isISO8601().withMessage('Valid appointment date required'),
    body('appointmentTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid appointment time required'),
    body('problemDescription').isLength({ min: 10, max: 1000 }).withMessage('Problem description must be 10-1000 characters'),
    body('symptoms').optional().isLength({ max: 500 }).withMessage('Symptoms must be less than 500 characters')
];

// Create new appointment (Patient only)
router.post('/', authenticateToken, requirePatient, appointmentValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { doctorId, appointmentDate, appointmentTime, problemDescription, symptoms } = req.body;
        const patientId = req.user.userId;

        // Check if appointment date is in the future
        const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
        if (appointmentDateTime <= new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Appointment must be scheduled for a future date and time'
            });
        }

        // Check if doctor exists
        const doctorQuery = 'SELECT doctor_id, first_name, last_name FROM Doctor WHERE doctor_id = ?';
        const doctorResult = await executeQuery(doctorQuery, [doctorId]);
        
        if (!doctorResult.success || doctorResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found'
            });
        }

        // Check for time conflicts
        const conflictQuery = `
            SELECT appointment_id FROM Appointment 
            WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? 
            AND status IN ('approved', 'pending')
        `;
        const conflictResult = await executeQuery(conflictQuery, [doctorId, appointmentDate, appointmentTime]);
        
        if (conflictResult.success && conflictResult.data.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Doctor is not available at this time slot'
            });
        }

        // Create appointment
        const insertQuery = `
            INSERT INTO Appointment (patient_id, doctor_id, appointment_date, appointment_time, 
                                   status, problem_description, symptoms)
            VALUES (?, ?, ?, ?, 'pending', ?, ?)
        `;
        
        const result = await executeQuery(insertQuery, [
            patientId, doctorId, appointmentDate, appointmentTime, problemDescription, symptoms
        ]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to create appointment',
                error: result.error
            });
        }

        const appointmentId = result.data.insertId;

        res.status(201).json({
            success: true,
            message: 'Appointment request created successfully',
            data: {
                appointmentId: appointmentId,
                doctorName: `${doctorResult.data[0].first_name} ${doctorResult.data[0].last_name}`,
                appointmentDate: appointmentDate,
                appointmentTime: appointmentTime,
                status: 'pending'
            }
        });

    } catch (error) {
        console.error('Create appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while creating appointment'
        });
    }
});

// Get patient's appointments
router.get('/patient', authenticateToken, requirePatient, async (req, res) => {
    try {
        const patientId = req.user.userId;
        const { status, date, limit = 10, offset = 0 } = req.query;

        let query = `
            SELECT a.appointment_id, a.appointment_date, a.appointment_time, a.status,
                   a.problem_description, a.symptoms, a.created_at, a.updated_at,
                   CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
                   d.email AS doctor_email, d.phone AS doctor_phone,
                   GROUP_CONCAT(s.spec_name SEPARATOR ', ') AS specialization
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

        if (date) {
            query += ' AND a.appointment_date = ?';
            params.push(date);
        }

        query += ' GROUP BY a.appointment_id ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT ? OFFSET ?';
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
        console.error('Fetch patient appointments error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching appointments'
        });
    }
});

// Get doctor's appointments
router.get('/doctor', authenticateToken, requireDoctor, async (req, res) => {
    try {
        const doctorId = req.user.userId;
        const { status, date, limit = 10, offset = 0 } = req.query;

        let query = `
            SELECT a.appointment_id, a.appointment_date, a.appointment_time, a.status,
                   a.problem_description, a.symptoms, a.created_at, a.updated_at,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   p.email AS patient_email, p.phone AS patient_phone
            FROM Appointment a
            JOIN Patient p ON a.patient_id = p.patient_id
            WHERE a.doctor_id = ?
        `;
        
        const params = [doctorId];

        if (status) {
            query += ' AND a.status = ?';
            params.push(status);
        }

        if (date) {
            query += ' AND a.appointment_date = ?';
            params.push(date);
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
        console.error('Fetch doctor appointments error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching appointments'
        });
    }
});

// Get specific appointment details
router.get('/:appointmentId', authenticateToken, async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { userId, userType } = req.user;

        let query = `
            SELECT a.appointment_id, a.appointment_date, a.appointment_time, a.status,
                   a.problem_description, a.symptoms, a.created_at, a.updated_at,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   p.email AS patient_email, p.phone AS patient_phone,
                   CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
                   d.email AS doctor_email, d.phone AS doctor_phone,
                   GROUP_CONCAT(s.spec_name SEPARATOR ', ') AS specialization
            FROM Appointment a
            JOIN Patient p ON a.patient_id = p.patient_id
            JOIN Doctor d ON a.doctor_id = d.doctor_id
            LEFT JOIN Doctor_Specialization ds ON d.doctor_id = ds.doctor_id
            LEFT JOIN Specialization s ON ds.spec_id = s.spec_id
            WHERE a.appointment_id = ?
        `;
        
        const params = [appointmentId];

        // Add access control
        if (userType === 'patient') {
            query += ' AND a.patient_id = ?';
            params.push(userId);
        } else if (userType === 'doctor') {
            query += ' AND a.doctor_id = ?';
            params.push(userId);
        }

        query += ' GROUP BY a.appointment_id';
        const result = await executeQuery(query, params);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch appointment',
                error: result.error
            });
        }

        if (result.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found or access denied'
            });
        }

        res.json({
            success: true,
            data: result.data[0]
        });

    } catch (error) {
        console.error('Fetch appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching appointment'
        });
    }
});

// Update appointment status (Doctor only)
router.put('/:appointmentId/status', authenticateToken, requireDoctor, [
    body('status').isIn(['approved', 'rejected', 'completed', 'cancelled']).withMessage('Invalid status'),
    body('message').optional().isLength({ max: 500 }).withMessage('Message must be less than 500 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { appointmentId } = req.params;
        const { status, message } = req.body;
        const doctorId = req.user.userId;

        // Check if appointment exists and belongs to this doctor
        const checkQuery = `
            SELECT appointment_id, patient_id, status, appointment_date, appointment_time 
            FROM Appointment 
            WHERE appointment_id = ? AND doctor_id = ?
        `;
        const checkResult = await executeQuery(checkQuery, [appointmentId, doctorId]);

        if (!checkResult.success || checkResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found or access denied'
            });
        }

        const appointment = checkResult.data[0];

        // Update the status of the appointment in the database
        const updateQuery = 'UPDATE Appointment SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE appointment_id = ?';
        const updateResult = await executeQuery(updateQuery, [status, appointmentId]);

        if (!updateResult.success || updateResult.data.affectedRows === 0) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update appointment status',
                error: updateResult.error
            });
        }

        // Build notification message
        let notificationType = 'appointment_reminder';
        let notificationMessage = '';

        switch (status) {
            case 'approved':
                notificationType = 'appointment_approved';
                notificationMessage = `Your appointment has been approved for ${appointment.appointment_date} at ${appointment.appointment_time}. Please arrive 15 minutes early.`;
                break;
            case 'rejected':
                notificationType = 'appointment_rejected';
                notificationMessage = `Your appointment request for ${appointment.appointment_date} at ${appointment.appointment_time} has been rejected. Please contact us to reschedule.`;
                break;
            case 'completed':
                notificationType = 'appointment_reminder';
                notificationMessage = 'Your appointment has been marked as completed. Thank you for visiting us.';
                break;
            default:
                notificationMessage = `Appointment status updated to: ${status}`;
                break;
        }

        if (message) {
            notificationMessage = `${notificationMessage} Doctor Note: ${message}`;
        }

        const notificationQuery = `
            INSERT INTO Notification (appointment_id, patient_id, doctor_id, message, notification_type)
            VALUES (?, ?, ?, ?, ?)
        `;
        const notificationResult = await executeQuery(notificationQuery, [
            appointmentId,
            appointment.patient_id,
            doctorId,
            notificationMessage,
            notificationType
        ]);

        if (!notificationResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Appointment status updated but failed to send notification',
                error: notificationResult.error
            });
        }

        res.json({
            success: true,
            message: 'Appointment status updated successfully',
            data: {
                appointmentId: appointmentId,
                newStatus: status,
                notificationMessage
            }
        });

    } catch (error) {
        console.error('Update appointment status error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while updating appointment status'
        });
    }
});

// Cancel appointment (Patient only)
router.put('/:appointmentId/cancel', authenticateToken, requirePatient, async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const patientId = req.user.userId;

        // Check if appointment exists and belongs to this patient
        const checkQuery = 'SELECT appointment_id, status FROM Appointment WHERE appointment_id = ? AND patient_id = ?';
        const checkResult = await executeQuery(checkQuery, [appointmentId, patientId]);

        if (!checkResult.success || checkResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found or access denied'
            });
        }

        const appointment = checkResult.data[0];

        // Check if appointment can be cancelled
        if (appointment.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Appointment is already cancelled'
            });
        }

        if (appointment.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel completed appointment'
            });
        }

        // Update status to cancelled
        const updateQuery = 'UPDATE Appointment SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE appointment_id = ?';
        const updateResult = await executeQuery(updateQuery, ['cancelled', appointmentId]);

        if (!updateResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to cancel appointment',
                error: updateResult.error
            });
        }

        res.json({
            success: true,
            message: 'Appointment cancelled successfully'
        });

    } catch (error) {
        console.error('Cancel appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while cancelling appointment'
        });
    }
});

// Auto-assign doctor (using stored procedure)
router.post('/auto-assign', authenticateToken, requirePatient, [
    body('problemDescription').isLength({ min: 10, max: 1000 }).withMessage('Problem description must be 10-1000 characters'),
    body('symptoms').optional().isLength({ max: 500 }).withMessage('Symptoms must be less than 500 characters'),
    body('appointmentDate').isISO8601().withMessage('Valid appointment date required'),
    body('appointmentTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid appointment time required'),
    body('preferredSpecialization').optional().isLength({ min: 2, max: 100 }).withMessage('Specialization must be 2-100 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { problemDescription, symptoms, appointmentDate, appointmentTime, preferredSpecialization = 'General Medicine' } = req.body;
        const patientId = req.user.userId;

        // Use stored procedure for auto-assignment
        const procedureQuery = 'CALL AutoAssignDoctor(?, ?, ?, ?, ?, ?)';
        const result = await executeQuery(procedureQuery, [
            patientId, problemDescription, symptoms, appointmentDate, appointmentTime, preferredSpecialization
        ]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to auto-assign doctor',
                error: result.error
            });
        }

        const procedureData = result.data[0];

        if (procedureData.status === 'SUCCESS') {
            res.status(201).json({
                success: true,
                message: 'Doctor auto-assigned successfully',
                data: {
                    appointmentId: procedureData.appointment_id,
                    assignedDoctorId: procedureData.assigned_doctor_id
                }
            });
        } else {
            res.status(409).json({
                success: false,
                message: 'No available doctors found for the requested time slot',
                data: {
                    status: procedureData.status
                }
            });
        }

    } catch (error) {
        console.error('Auto-assign doctor error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while auto-assigning doctor'
        });
    }
});

// Get appointment statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
    try {
        const { userId, userType } = req.user;
        const { startDate, endDate } = req.query;

        let query;
        let params;

        if (userType === 'patient') {
            query = `
                SELECT 
                    COUNT(*) AS total_appointments,
                    COUNT(CASE WHEN status = 'approved' THEN 1 END) AS approved_appointments,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_appointments,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_appointments,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_appointments
                FROM Appointment 
                WHERE patient_id = ?
            `;
            params = [userId];
        } else {
            query = `
                SELECT 
                    COUNT(*) AS total_appointments,
                    COUNT(CASE WHEN status = 'approved' THEN 1 END) AS approved_appointments,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_appointments,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_appointments,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_appointments
                FROM Appointment 
                WHERE doctor_id = ?
            `;
            params = [userId];
        }

        if (startDate && endDate) {
            query += ' AND appointment_date BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }

        const result = await executeQuery(query, params);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch appointment statistics',
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result.data[0]
        });

    } catch (error) {
        console.error('Fetch appointment stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching appointment statistics'
        });
    }
});

module.exports = router;
