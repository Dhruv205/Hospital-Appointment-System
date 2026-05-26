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
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   a.appointment_date, a.appointment_time
            FROM Notification n
            LEFT JOIN Doctor d ON n.doctor_id = d.doctor_id
            LEFT JOIN Patient p ON n.patient_id = p.patient_id
            LEFT JOIN Appointment a ON n.appointment_id = a.appointment_id
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

        let notifications = result.data || [];

        if (userType === 'doctor') {
            notifications = notifications.map(notif => {
                let customMessage = notif.message;
                const patientName = notif.patient_name || 'Patient';
                
                let dateStr = '';
                if (notif.appointment_date) {
                    const date = new Date(notif.appointment_date);
                    dateStr = date.toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                }
                
                let timeStr = '';
                if (notif.appointment_time) {
                    const parts = notif.appointment_time.split(':');
                    if (parts.length >= 2) {
                        let hours = parseInt(parts[0]);
                        const minutes = parts[1];
                        const ampm = hours >= 12 ? 'PM' : 'AM';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        timeStr = `${hours}:${minutes} ${ampm}`;
                    } else {
                        timeStr = notif.appointment_time;
                    }
                }
                
                const appointmentDateTimeStr = dateStr && timeStr ? `on ${dateStr} at ${timeStr}` : '';

                switch (notif.notification_type) {
                    case 'appointment_approved':
                        customMessage = `You have an appointment scheduled ${appointmentDateTimeStr} for patient ${patientName}.`;
                        break;
                    case 'appointment_rejected':
                        customMessage = `You rejected the appointment request ${appointmentDateTimeStr} for patient ${patientName}.`;
                        break;
                    case 'appointment_reminder':
                        if (notif.message.toLowerCase().includes('cancel')) {
                            customMessage = `Appointment ${appointmentDateTimeStr} for patient ${patientName} has been cancelled.`;
                        } else if (notif.message.toLowerCase().includes('complete')) {
                            customMessage = `Appointment ${appointmentDateTimeStr} for patient ${patientName} has been marked as completed.`;
                        } else if (notif.message.toLowerCase().includes('received') || notif.message.toLowerCase().includes('request')) {
                            customMessage = `You have a new appointment request ${appointmentDateTimeStr} from patient ${patientName}.`;
                        } else {
                            customMessage = `Reminder: You have an appointment scheduled ${appointmentDateTimeStr} for patient ${patientName}.`;
                        }
                        break;
                    case 'doctor_message':
                        if (notif.message.includes('alternative doctor')) {
                            customMessage = `Alternative doctor suggestion sent for patient ${patientName}'s appointment ${appointmentDateTimeStr}.`;
                        } else {
                            customMessage = `Message sent to patient ${patientName}: "${notif.message}"`;
                        }
                        break;
                    default:
                        break;
                }

                return {
                    ...notif,
                    message: customMessage
                };
            });
        }

        res.json({
            success: true,
            data: notifications
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
