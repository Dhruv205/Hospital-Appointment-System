const express = require('express');
const { executeQuery } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Auto-initialize the Consultation_Message table
const initTable = async () => {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS Consultation_Message (
            message_id INT AUTO_INCREMENT PRIMARY KEY,
            appointment_id INT NOT NULL,
            sender_id INT NOT NULL,
            sender_type ENUM('doctor', 'patient') NOT NULL,
            message_text TEXT DEFAULT NULL,
            image_url VARCHAR(512) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (appointment_id) REFERENCES Appointment(appointment_id) ON DELETE CASCADE
        )
    `;
    await executeQuery(createTableQuery);
};
initTable();

// 1. Get chat history for an appointment
router.get('/:appointmentId', authenticateToken, async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { userId, userType } = req.user;

        // Verify user is patient or doctor of the appointment
        const verifyQuery = `
            SELECT patient_id, doctor_id 
            FROM Appointment 
            WHERE appointment_id = ?
        `;
        const verifyResult = await executeQuery(verifyQuery, [appointmentId]);

        if (!verifyResult.success || verifyResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        const appointment = verifyResult.data[0];
        if (
            (userType === 'patient' && appointment.patient_id !== userId) ||
            (userType === 'doctor' && appointment.doctor_id !== userId)
        ) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const fetchQuery = `
            SELECT message_id, appointment_id, sender_id, sender_type, message_text, image_url, created_at
            FROM Consultation_Message
            WHERE appointment_id = ?
            ORDER BY created_at ASC
        `;
        const fetchResult = await executeQuery(fetchQuery, [appointmentId]);

        res.json({
            success: true,
            data: fetchResult.data || []
        });
    } catch (err) {
        console.error('Fetch chat messages error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch chat messages'
        });
    }
});

// 2. Send a new message (supports optional photo)
router.post('/:appointmentId', authenticateToken, async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { userId, userType } = req.user;
        const { messageText, image } = req.body;

        // Verify user is patient or doctor of the appointment
        const verifyQuery = `
            SELECT patient_id, doctor_id 
            FROM Appointment 
            WHERE appointment_id = ?
        `;
        const verifyResult = await executeQuery(verifyQuery, [appointmentId]);

        if (!verifyResult.success || verifyResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        const appointment = verifyResult.data[0];
        if (
            (userType === 'patient' && appointment.patient_id !== userId) ||
            (userType === 'doctor' && appointment.doctor_id !== userId)
        ) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        let imageUrl = null;

        // Handle Base64 Image upload if present
        if (image) {
            const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                const imageType = matches[1];
                const base64Data = matches[2];
                const buffer = Buffer.from(base64Data, 'base64');

                // Establish safe uploads directory in project root
                const uploadsDir = path.join(__dirname, '../uploads');
                if (!fs.existsSync(uploadsDir)) {
                    fs.mkdirSync(uploadsDir, { recursive: true });
                }

                const fileExt = imageType.split('/')[1] || 'png';
                const fileName = `chat_${Date.now()}_${Math.round(Math.random() * 1000)}.${fileExt}`;
                const filePath = path.join(uploadsDir, fileName);

                fs.writeFileSync(filePath, buffer);
                imageUrl = `/uploads/${fileName}`;
            }
        }

        const insertQuery = `
            INSERT INTO Consultation_Message (appointment_id, sender_id, sender_type, message_text, image_url)
            VALUES (?, ?, ?, ?, ?)
        `;
        const insertResult = await executeQuery(insertQuery, [
            appointmentId, userId, userType, messageText || null, imageUrl
        ]);

        if (!insertResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to save message'
            });
        }

        res.status(201).json({
            success: true,
            data: {
                message_id: insertResult.data.insertId,
                appointment_id: parseInt(appointmentId),
                sender_id: userId,
                sender_type: userType,
                message_text: messageText || null,
                image_url: imageUrl,
                created_at: new Date().toISOString()
            }
        });
    } catch (err) {
        console.error('Send message error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to send message'
        });
    }
});

module.exports = router;
