-- Comprehensive SQL Queries for Hospital Appointment Management System

USE hospital_appointment_system;

-- ==============================================
-- 1. BASIC CRUD OPERATIONS
-- ==============================================

-- 1.1 Create a new patient
INSERT INTO Patient (first_name, last_name, email, phone, password_hash, date_of_birth, gender, address)
VALUES ('Alice', 'Johnson', 'alice.johnson@email.com', '+1-555-2001', '$2b$10$example_hash_alice', '1995-05-15', 'Female', '789 Oak Street, City, State');

-- 1.2 Create a new doctor
INSERT INTO Doctor (first_name, last_name, email, phone, password_hash, license_number, experience_years, consultation_fee)
VALUES ('Dr. James', 'Miller', 'james.miller@hospital.com', '+1-555-0201', '$2b$10$example_hash_james', 'DOC006', 7, 160.00);

-- 1.3 Create a new appointment
INSERT INTO Appointment (patient_id, doctor_id, appointment_date, appointment_time, status, problem_description, symptoms)
VALUES (1, 1, '2024-02-20', '14:00:00', 'pending', 'Regular checkup and blood pressure monitoring', 'No specific symptoms');

-- 1.4 Update appointment status
UPDATE Appointment 
SET status = 'approved', updated_at = CURRENT_TIMESTAMP
WHERE appointment_id = 1;

-- 1.5 Delete a cancelled appointment
DELETE FROM Appointment 
WHERE appointment_id = 1 AND status = 'cancelled';

-- ==============================================
-- 2. COMPLEX QUERIES WITH JOINS
-- ==============================================

-- 2.1 View all appointments for a specific doctor with patient details
SELECT 
    a.appointment_id,
    CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
    p.email AS patient_email,
    p.phone AS patient_phone,
    a.appointment_date,
    a.appointment_time,
    a.status,
    a.problem_description,
    a.symptoms
FROM Appointment a
JOIN Patient p ON a.patient_id = p.patient_id
WHERE a.doctor_id = 1
ORDER BY a.appointment_date DESC, a.appointment_time DESC;

-- 2.2 View upcoming appointments for a specific patient
SELECT 
    a.appointment_id,
    CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
    s.spec_name AS specialization,
    a.appointment_date,
    a.appointment_time,
    a.status,
    a.problem_description
FROM Appointment a
JOIN Doctor d ON a.doctor_id = d.doctor_id
LEFT JOIN Doctor_Specialization ds ON d.doctor_id = ds.doctor_id
LEFT JOIN Specialization s ON ds.spec_id = s.spec_id
WHERE a.patient_id = 1
AND a.appointment_date >= CURDATE()
AND a.status IN ('approved', 'pending')
ORDER BY a.appointment_date ASC, a.appointment_time ASC;

-- 2.3 Count total appointments per specialization
SELECT 
    s.spec_name AS specialization,
    COUNT(a.appointment_id) AS total_appointments,
    COUNT(CASE WHEN a.status = 'approved' THEN 1 END) AS approved_appointments,
    COUNT(CASE WHEN a.status = 'pending' THEN 1 END) AS pending_appointments,
    COUNT(CASE WHEN a.status = 'completed' THEN 1 END) AS completed_appointments
FROM Specialization s
LEFT JOIN Doctor_Specialization ds ON s.spec_id = ds.spec_id
LEFT JOIN Doctor d ON ds.doctor_id = d.doctor_id
LEFT JOIN Appointment a ON d.doctor_id = a.doctor_id
GROUP BY s.spec_id, s.spec_name
ORDER BY total_appointments DESC;

-- 2.4 Find available doctors by specialization
SELECT 
    d.doctor_id,
    CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
    s.spec_name AS specialization,
    d.consultation_fee,
    ds.proficiency_level,
    d.experience_years,
    COUNT(a.appointment_id) AS total_appointments
FROM Doctor d
JOIN Doctor_Specialization ds ON d.doctor_id = ds.doctor_id
JOIN Specialization s ON ds.spec_id = s.spec_id
LEFT JOIN Appointment a ON d.doctor_id = a.doctor_id 
    AND a.appointment_date = '2024-02-20' 
    AND a.appointment_time = '10:00:00'
    AND a.status IN ('approved', 'pending')
WHERE s.spec_name LIKE '%Cardiology%'
AND a.appointment_id IS NULL
ORDER BY ds.proficiency_level DESC, d.experience_years DESC;

-- ==============================================
-- 3. AGGREGATION AND STATISTICAL QUERIES
-- ==============================================

-- 3.1 Doctor performance statistics
SELECT 
    d.doctor_id,
    CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
    COUNT(a.appointment_id) AS total_appointments,
    COUNT(CASE WHEN a.status = 'completed' THEN 1 END) AS completed_appointments,
    COUNT(CASE WHEN a.status = 'approved' THEN 1 END) AS approved_appointments,
    COUNT(CASE WHEN a.status = 'rejected' THEN 1 END) AS rejected_appointments,
    ROUND(COUNT(CASE WHEN a.status = 'completed' THEN 1 END) * 100.0 / COUNT(a.appointment_id), 2) AS completion_rate,
    AVG(d.consultation_fee) AS avg_consultation_fee
FROM Doctor d
LEFT JOIN Appointment a ON d.doctor_id = a.doctor_id
GROUP BY d.doctor_id, d.first_name, d.last_name
ORDER BY completion_rate DESC;

-- 3.2 Monthly appointment trends
SELECT 
    YEAR(appointment_date) AS year,
    MONTH(appointment_date) AS month,
    MONTHNAME(appointment_date) AS month_name,
    COUNT(*) AS total_appointments,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) AS approved_appointments,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_appointments
FROM Appointment
WHERE appointment_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
GROUP BY YEAR(appointment_date), MONTH(appointment_date), MONTHNAME(appointment_date)
ORDER BY year DESC, month DESC;

-- 3.3 Patient appointment history with doctor details
SELECT 
    p.patient_id,
    CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
    COUNT(a.appointment_id) AS total_appointments,
    COUNT(CASE WHEN a.status = 'completed' THEN 1 END) AS completed_appointments,
    MAX(a.appointment_date) AS last_appointment_date,
    GROUP_CONCAT(DISTINCT CONCAT(d.first_name, ' ', d.last_name) SEPARATOR ', ') AS doctors_visited
FROM Patient p
LEFT JOIN Appointment a ON p.patient_id = a.patient_id
LEFT JOIN Doctor d ON a.doctor_id = d.doctor_id
GROUP BY p.patient_id, p.first_name, p.last_name
ORDER BY total_appointments DESC;

-- ==============================================
-- 4. SEARCH AND FILTERING QUERIES
-- ==============================================

-- 4.1 Search appointments by problem description
SELECT 
    a.appointment_id,
    CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
    CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
    a.appointment_date,
    a.appointment_time,
    a.status,
    a.problem_description
FROM Appointment a
JOIN Patient p ON a.patient_id = p.patient_id
JOIN Doctor d ON a.doctor_id = d.doctor_id
WHERE a.problem_description LIKE '%chest%' OR a.problem_description LIKE '%heart%'
ORDER BY a.appointment_date DESC;

-- 4.2 Find appointments within a date range
SELECT 
    a.appointment_id,
    CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
    CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
    a.appointment_date,
    a.appointment_time,
    a.status
FROM Appointment a
JOIN Patient p ON a.patient_id = p.patient_id
JOIN Doctor d ON a.doctor_id = d.doctor_id
WHERE a.appointment_date BETWEEN '2024-02-01' AND '2024-02-29'
ORDER BY a.appointment_date, a.appointment_time;

-- 4.3 Find doctors with specific experience level
SELECT 
    d.doctor_id,
    CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
    d.experience_years,
    d.consultation_fee,
    s.spec_name AS specialization,
    ds.proficiency_level
FROM Doctor d
JOIN Doctor_Specialization ds ON d.doctor_id = ds.doctor_id
JOIN Specialization s ON ds.spec_id = s.spec_id
WHERE d.experience_years >= 10
AND ds.proficiency_level IN ('Advanced', 'Expert')
ORDER BY d.experience_years DESC;

-- ==============================================
-- 5. NOTIFICATION AND MESSAGING QUERIES
-- ==============================================

-- 5.1 Get unread notifications for a patient
SELECT 
    n.notification_id,
    n.message,
    n.notification_type,
    n.created_at,
    CONCAT(d.first_name, ' ', d.last_name) AS doctor_name
FROM Notification n
JOIN Doctor d ON n.doctor_id = d.doctor_id
WHERE n.patient_id = 1
AND n.is_read = FALSE
ORDER BY n.created_at DESC;

-- 5.2 Get all notifications for a specific appointment
SELECT 
    n.notification_id,
    n.message,
    n.notification_type,
    n.is_read,
    n.created_at,
    CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
    CONCAT(d.first_name, ' ', d.last_name) AS doctor_name
FROM Notification n
JOIN Patient p ON n.patient_id = p.patient_id
JOIN Doctor d ON n.doctor_id = d.doctor_id
WHERE n.appointment_id = 1
ORDER BY n.created_at ASC;

-- 5.3 Mark notifications as read
UPDATE Notification 
SET is_read = TRUE 
WHERE patient_id = 1 AND is_read = FALSE;

-- ==============================================
-- 6. BUSINESS LOGIC QUERIES
-- ==============================================

-- 6.1 Find conflicting appointments (double booking check)
SELECT 
    a1.appointment_id AS appointment1_id,
    a2.appointment_id AS appointment2_id,
    a1.doctor_id,
    CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
    a1.appointment_date,
    a1.appointment_time
FROM Appointment a1
JOIN Appointment a2 ON a1.doctor_id = a2.doctor_id
JOIN Doctor d ON a1.doctor_id = d.doctor_id
WHERE a1.appointment_id != a2.appointment_id
AND a1.appointment_date = a2.appointment_date
AND a1.appointment_time = a2.appointment_time
AND a1.status IN ('approved', 'pending')
AND a2.status IN ('approved', 'pending');

-- 6.2 Find doctors with no appointments on a specific date
SELECT 
    d.doctor_id,
    CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
    s.spec_name AS specialization,
    d.consultation_fee
FROM Doctor d
LEFT JOIN Doctor_Specialization ds ON d.doctor_id = ds.doctor_id
LEFT JOIN Specialization s ON ds.spec_id = s.spec_id
LEFT JOIN Appointment a ON d.doctor_id = a.doctor_id 
    AND a.appointment_date = '2024-02-20'
    AND a.status IN ('approved', 'pending')
WHERE a.appointment_id IS NULL
ORDER BY s.spec_name, d.experience_years DESC;

-- 6.3 Calculate average consultation time per doctor
SELECT 
    d.doctor_id,
    CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
    COUNT(a.appointment_id) AS total_appointments,
    AVG(TIMESTAMPDIFF(MINUTE, 
        CONCAT(a.appointment_date, ' ', a.appointment_time), 
        CONCAT(a.appointment_date, ' ', ADDTIME(a.appointment_time, '01:00:00'))
    )) AS avg_consultation_minutes
FROM Doctor d
LEFT JOIN Appointment a ON d.doctor_id = a.doctor_id
WHERE a.status = 'completed'
GROUP BY d.doctor_id, d.first_name, d.last_name
ORDER BY avg_consultation_minutes DESC;

-- ==============================================
-- 7. REPORTING QUERIES
-- ==============================================

-- 7.1 Daily appointment summary
SELECT 
    appointment_date,
    COUNT(*) AS total_appointments,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) AS approved_appointments,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_appointments,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_appointments,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_appointments
FROM Appointment
WHERE appointment_date >= CURDATE()
GROUP BY appointment_date
ORDER BY appointment_date;

-- 7.2 Revenue report by doctor
SELECT 
    d.doctor_id,
    CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
    d.consultation_fee,
    COUNT(a.appointment_id) AS total_appointments,
    COUNT(CASE WHEN a.status = 'completed' THEN 1 END) AS completed_appointments,
    SUM(CASE WHEN a.status = 'completed' THEN d.consultation_fee ELSE 0 END) AS total_revenue
FROM Doctor d
LEFT JOIN Appointment a ON d.doctor_id = a.doctor_id
WHERE a.appointment_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY d.doctor_id, d.first_name, d.last_name, d.consultation_fee
ORDER BY total_revenue DESC;

-- 7.3 Patient satisfaction metrics (based on completion rate)
SELECT 
    p.patient_id,
    CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
    COUNT(a.appointment_id) AS total_appointments,
    COUNT(CASE WHEN a.status = 'completed' THEN 1 END) AS completed_appointments,
    ROUND(COUNT(CASE WHEN a.status = 'completed' THEN 1 END) * 100.0 / COUNT(a.appointment_id), 2) AS completion_rate
FROM Patient p
LEFT JOIN Appointment a ON p.patient_id = a.patient_id
GROUP BY p.patient_id, p.first_name, p.last_name
HAVING total_appointments > 0
ORDER BY completion_rate DESC;

-- ==============================================
-- 8. MAINTENANCE AND CLEANUP QUERIES
-- ==============================================

-- 8.1 Find old pending appointments that should be cleaned up
SELECT 
    appointment_id,
    patient_id,
    doctor_id,
    appointment_date,
    appointment_time,
    created_at,
    DATEDIFF(CURDATE(), created_at) AS days_old
FROM Appointment
WHERE status = 'pending'
AND created_at < DATE_SUB(CURDATE(), INTERVAL 7 DAY)
ORDER BY created_at ASC;

-- 8.2 Archive completed appointments older than 1 year
-- (This would typically be done with a separate archive table)
SELECT 
    appointment_id,
    patient_id,
    doctor_id,
    appointment_date,
    appointment_time,
    status,
    created_at
FROM Appointment
WHERE status = 'completed'
AND appointment_date < DATE_SUB(CURDATE(), INTERVAL 1 YEAR)
ORDER BY appointment_date ASC;

-- 8.3 Clean up old notifications
SELECT 
    notification_id,
    appointment_id,
    patient_id,
    doctor_id,
    notification_type,
    created_at,
    DATEDIFF(CURDATE(), created_at) AS days_old
FROM Notification
WHERE created_at < DATE_SUB(CURDATE(), INTERVAL 30 DAY)
AND is_read = TRUE
ORDER BY created_at ASC;
