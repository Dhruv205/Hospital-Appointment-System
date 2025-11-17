const express = require('express');
const { executeQuery } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user's notifications
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { userId, userType } = req.user;
        const { isRead, limit = 20, offset = 0 } = req.query;

        let query = `
            SELECT n.notification_id, n.message, n.notification_type, n.is_read, n.created_at,
                   CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name
            FROM Notification n
            LEFT JOIN Doctor d ON n.doctor_id = d.doctor_id
            LEFT JOIN Patient p ON n.patient_id = p.patient_id
            WHERE n.${userType}_id = ?
        `;
        
        const params = [userId];

        if (isRead !== undefined) {
            query += ' AND n.is_read = ?';
            params.push(isRead === 'true');
        }

        query += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const result = await executeQuery(query, params);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch notifications',
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result.data
        });

    } catch (error) {
        console.error('Fetch notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching notifications'
        });
    }
});

// Mark notification as read
router.put('/:notificationId/read', authenticateToken, async (req, res) => {
    try {
        const { notificationId } = req.params;
        const { userId, userType } = req.user;

        // Check if notification exists and belongs to user
        const checkQuery = `SELECT notification_id FROM Notification WHERE notification_id = ? AND ${userType}_id = ?`;
        const checkResult = await executeQuery(checkQuery, [notificationId, userId]);

        if (!checkResult.success || checkResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found or access denied'
            });
        }

        // Mark as read
        const updateQuery = 'UPDATE Notification SET is_read = TRUE WHERE notification_id = ?';
        const result = await executeQuery(updateQuery, [notificationId]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to mark notification as read',
                error: result.error
            });
        }

        res.json({
            success: true,
            message: 'Notification marked as read'
        });

    } catch (error) {
        console.error('Mark notification as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while updating notification'
        });
    }
});

// Mark all notifications as read
router.put('/read-all', authenticateToken, async (req, res) => {
    try {
        const { userId, userType } = req.user;

        const query = `UPDATE Notification SET is_read = TRUE WHERE ${userType}_id = ? AND is_read = FALSE`;
        const result = await executeQuery(query, [userId]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to mark all notifications as read',
                error: result.error
            });
        }

        res.json({
            success: true,
            message: `${result.data.affectedRows} notifications marked as read`
        });

    } catch (error) {
        console.error('Mark all notifications as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while updating notifications'
        });
    }
});

// Get unread notification count
router.get('/unread-count', authenticateToken, async (req, res) => {
    try {
        const { userId, userType } = req.user;

        const query = `SELECT COUNT(*) as unread_count FROM Notification WHERE ${userType}_id = ? AND is_read = FALSE`;
        const result = await executeQuery(query, [userId]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch unread count',
                error: result.error
            });
        }

        res.json({
            success: true,
            data: {
                unreadCount: result.data[0].unread_count
            }
        });

    } catch (error) {
        console.error('Fetch unread count error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching unread count'
        });
    }
});

// Delete notification
router.delete('/:notificationId', authenticateToken, async (req, res) => {
    try {
        const { notificationId } = req.params;
        const { userId, userType } = req.user;

        // Check if notification exists and belongs to user
        const checkQuery = `SELECT notification_id FROM Notification WHERE notification_id = ? AND ${userType}_id = ?`;
        const checkResult = await executeQuery(checkQuery, [notificationId, userId]);

        if (!checkResult.success || checkResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found or access denied'
            });
        }

        // Delete notification
        const deleteQuery = 'DELETE FROM Notification WHERE notification_id = ?';
        const result = await executeQuery(deleteQuery, [notificationId]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to delete notification',
                error: result.error
            });
        }

        res.json({
            success: true,
            message: 'Notification deleted successfully'
        });

    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while deleting notification'
        });
    }
});

// Send message to patient (Doctor only)
router.post('/send-message', authenticateToken, async (req, res) => {
    try {
        const { userId, userType } = req.user;
        const { appointmentId, message } = req.body;

        if (userType !== 'doctor') {
            return res.status(403).json({
                success: false,
                message: 'Only doctors can send messages'
            });
        }

        // Get appointment details
        const appointmentQuery = `
            SELECT appointment_id, patient_id, doctor_id 
            FROM Appointment 
            WHERE appointment_id = ? AND doctor_id = ?
        `;
        const appointmentResult = await executeQuery(appointmentQuery, [appointmentId, userId]);

        if (!appointmentResult.success || appointmentResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found or access denied'
            });
        }

        const appointment = appointmentResult.data[0];

        // Create notification
        const insertQuery = `
            INSERT INTO Notification (appointment_id, patient_id, doctor_id, message, notification_type)
            VALUES (?, ?, ?, ?, 'doctor_message')
        `;

        const result = await executeQuery(insertQuery, [
            appointmentId, appointment.patient_id, appointment.doctor_id, message
        ]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to send message',
                error: result.error
            });
        }

        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            data: {
                notificationId: result.data.insertId
            }
        });

    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while sending message'
        });
    }
});

module.exports = router;
