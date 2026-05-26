const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hospital_appointment_system'
};

async function testNotificationRewrite() {
    console.log('🧪 Verifying Notification Rewording Logic...');
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Successfully connected to database.');

        // Select a sample notification joined with Doctor, Patient, and Appointment
        const query = `
            SELECT n.notification_id, n.message, n.notification_type, n.is_read, n.created_at,
                   CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   a.appointment_date, a.appointment_time
            FROM Notification n
            LEFT JOIN Doctor d ON n.doctor_id = d.doctor_id
            LEFT JOIN Patient p ON n.patient_id = p.patient_id
            LEFT JOIN Appointment a ON n.appointment_id = a.appointment_id
            LIMIT 5
        `;

        const [rows] = await connection.execute(query);
        console.log(`\nFound ${rows.length} notifications to test rewrite logic against.\n`);

        rows.forEach((notif, index) => {
            console.log(`--------------------------------------------------`);
            console.log(`[Notification #${index + 1}] Type: ${notif.notification_type}`);
            console.log(`Original (Patient-facing stored in DB):`);
            console.log(`  "${notif.message}"`);

            // Apply our doctor formatting logic
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

            console.log(`Formatted (Doctor-centric):`);
            console.log(`  "${customMessage}"`);
        });

    } catch (err) {
        console.error('❌ Error during test run:', err.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

testNotificationRewrite();
