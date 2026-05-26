const mysql = require('mysql2/promise');

async function test() {
    const connection = await mysql.createConnection({
        host: 'centerbeam.proxy.rlwy.net',
        port: 37761,
        user: 'root',
        password: 'ruRfBYMNpfSuxaxxHmolbYxDFytigvea',
        database: 'railway'
    });
    
    try {
        const query = `
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
            GROUP BY a.appointment_id 
            ORDER BY a.appointment_date DESC, a.appointment_time DESC 
            LIMIT ? OFFSET ?
        `;
        const [rows] = await connection.query(query, [1, 10, 0]);
        console.log("Success:", rows);
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await connection.end();
    }
}
test();
