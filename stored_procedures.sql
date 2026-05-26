-- Stored Procedures for Hospital Appointment Management System

USE hospital_appointment_system;

-- Drop procedures if they exist to allow clean re-runs
DROP PROCEDURE IF EXISTS AutoAssignDoctor;
DROP PROCEDURE IF EXISTS FindAvailableDoctors;
DROP PROCEDURE IF EXISTS GetAppointmentStats;
DROP PROCEDURE IF EXISTS GetPatientAppointmentHistory;
DROP PROCEDURE IF EXISTS UpdateAppointmentStatus;
DROP PROCEDURE IF EXISTS GetDoctorUpcomingAppointments;

-- 1. Procedure to auto-assign an alternative doctor when one is unavailable
DELIMITER //

CREATE PROCEDURE AutoAssignDoctor(
    IN p_patient_id INT,
    IN p_problem_description TEXT,
    IN p_symptoms TEXT,
    IN p_appointment_date DATE,
    IN p_appointment_time TIME,
    IN p_preferred_specialization VARCHAR(100)
)
BEGIN
    DECLARE v_doctor_id INT DEFAULT NULL;
    DECLARE v_appointment_id INT DEFAULT NULL;
    DECLARE v_spec_id INT DEFAULT NULL;
    DECLARE v_message TEXT;
    DECLARE v_notification_id INT;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Find the specialization ID
    SELECT spec_id INTO v_spec_id 
    FROM Specialization 
    WHERE spec_name = p_preferred_specialization 
    LIMIT 1;
    
    -- If no specific specialization found, try to find by problem keywords
    IF v_spec_id IS NULL THEN
        SELECT spec_id INTO v_spec_id
        FROM Specialization
        WHERE spec_name LIKE '%General%' OR spec_name LIKE '%Medicine%'
        LIMIT 1;
    END IF;
    
    -- Find an available doctor with the required specialization
    -- Priority: 1. Same specialization, 2. General Medicine, 3. Any available doctor
    SELECT d.doctor_id INTO v_doctor_id
    FROM Doctor d
    JOIN Doctor_Specialization ds ON d.doctor_id = ds.doctor_id
    WHERE ds.spec_id = v_spec_id
    AND d.doctor_id NOT IN (
        SELECT doctor_id 
        FROM Appointment 
        WHERE appointment_date = p_appointment_date 
        AND appointment_time = p_appointment_time
        AND status IN ('approved', 'pending')
    )
    ORDER BY ds.proficiency_level DESC, d.experience_years DESC
    LIMIT 1;
    
    -- If no doctor found with preferred specialization, try General Medicine
    IF v_doctor_id IS NULL THEN
        SELECT d.doctor_id INTO v_doctor_id
        FROM Doctor d
        JOIN Doctor_Specialization ds ON d.doctor_id = ds.doctor_id
        JOIN Specialization s ON ds.spec_id = s.spec_id
        WHERE s.spec_name LIKE '%General%' OR s.spec_name LIKE '%Medicine%'
        AND d.doctor_id NOT IN (
            SELECT doctor_id 
            FROM Appointment 
            WHERE appointment_date = p_appointment_date 
            AND appointment_time = p_appointment_time
            AND status IN ('approved', 'pending')
        )
        ORDER BY ds.proficiency_level DESC, d.experience_years DESC
        LIMIT 1;
    END IF;
    
    -- If still no doctor found, find any available doctor
    IF v_doctor_id IS NULL THEN
        SELECT d.doctor_id INTO v_doctor_id
        FROM Doctor d
        WHERE d.doctor_id NOT IN (
            SELECT doctor_id 
            FROM Appointment 
            WHERE appointment_date = p_appointment_date 
            AND appointment_time = p_appointment_time
            AND status IN ('approved', 'pending')
        )
        ORDER BY d.experience_years DESC
        LIMIT 1;
    END IF;
    
    -- If a doctor is found, create the appointment
    IF v_doctor_id IS NOT NULL THEN
        INSERT INTO Appointment (patient_id, doctor_id, appointment_date, appointment_time, 
                               status, problem_description, symptoms)
        VALUES (p_patient_id, v_doctor_id, p_appointment_date, p_appointment_time, 
                'approved', p_problem_description, p_symptoms);
        
        SET v_appointment_id = LAST_INSERT_ID();
        
        -- Create notification for patient
        SET v_message = CONCAT('Your appointment has been automatically assigned to a doctor for ', 
                              p_appointment_date, ' at ', p_appointment_time, 
                              '. You will receive confirmation details shortly.');
        
        INSERT INTO Notification (appointment_id, patient_id, doctor_id, message, notification_type)
        VALUES (v_appointment_id, p_patient_id, v_doctor_id, v_message, 'appointment_approved');
        
        -- Create notification for doctor
        SET v_message = CONCAT('New appointment assigned: Patient ID ', p_patient_id, 
                              ' for ', p_appointment_date, ' at ', p_appointment_time, 
                              '. Problem: ', LEFT(p_problem_description, 100));
        
        INSERT INTO Notification (appointment_id, patient_id, doctor_id, message, notification_type)
        VALUES (v_appointment_id, p_patient_id, v_doctor_id, v_message, 'doctor_message');
        
        SELECT v_appointment_id AS appointment_id, v_doctor_id AS assigned_doctor_id, 'SUCCESS' AS status;
    ELSE
        SELECT NULL AS appointment_id, NULL AS assigned_doctor_id, 'NO_DOCTOR_AVAILABLE' AS status;
    END IF;
    
    COMMIT;
END //

-- 2. Procedure to find available doctors by specialization and time slot
CREATE PROCEDURE FindAvailableDoctors(
    IN p_specialization VARCHAR(100),
    IN p_appointment_date DATE,
    IN p_appointment_time TIME
)
BEGIN
    DECLARE v_spec_id INT DEFAULT NULL;
    
    -- Find specialization ID
    SELECT spec_id INTO v_spec_id 
    FROM Specialization 
    WHERE spec_name LIKE CONCAT('%', p_specialization, '%')
    LIMIT 1;
    
    -- If no specific specialization found, use General Medicine
    IF v_spec_id IS NULL THEN
        SELECT spec_id INTO v_spec_id
        FROM Specialization
        WHERE spec_name LIKE '%General%' OR spec_name LIKE '%Medicine%'
        LIMIT 1;
    END IF;
    
    -- Return available doctors
    SELECT 
        d.doctor_id,
        CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
        s.spec_name AS specialization,
        d.consultation_fee,
        ds.proficiency_level,
        d.experience_years
    FROM Doctor d
    JOIN Doctor_Specialization ds ON d.doctor_id = ds.doctor_id
    JOIN Specialization s ON ds.spec_id = s.spec_id
    WHERE ds.spec_id = v_spec_id
    AND d.doctor_id NOT IN (
        SELECT doctor_id 
        FROM Appointment 
        WHERE appointment_date = p_appointment_date 
        AND appointment_time = p_appointment_time
        AND status IN ('approved', 'pending')
    )
    ORDER BY ds.proficiency_level DESC, d.experience_years DESC;
END //

-- 3. Procedure to get appointment statistics
CREATE PROCEDURE GetAppointmentStats(
    IN p_doctor_id INT,
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    SELECT 
        COUNT(*) AS total_appointments,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) AS approved_appointments,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_appointments,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) AS rejected_appointments,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_appointments,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_appointments,
        AVG(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) * 100 AS completion_rate
    FROM Appointment
    WHERE doctor_id = p_doctor_id
    AND appointment_date BETWEEN p_start_date AND p_end_date;
END //

-- 4. Procedure to get patient appointment history
CREATE PROCEDURE GetPatientAppointmentHistory(
    IN p_patient_id INT,
    IN p_limit INT
)
BEGIN
    SELECT 
        a.appointment_id,
        CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
        s.spec_name AS specialization,
        a.appointment_date,
        a.appointment_time,
        a.status,
        a.problem_description,
        a.created_at
    FROM Appointment a
    JOIN Doctor d ON a.doctor_id = d.doctor_id
    LEFT JOIN Doctor_Specialization ds ON d.doctor_id = ds.doctor_id
    LEFT JOIN Specialization s ON ds.spec_id = s.spec_id
    WHERE a.patient_id = p_patient_id
    ORDER BY a.appointment_date DESC, a.appointment_time DESC
    LIMIT p_limit;
END //

-- 5. Procedure to update appointment status and send notifications
CREATE PROCEDURE UpdateAppointmentStatus(
    IN p_appointment_id INT,
    IN p_new_status VARCHAR(20),
    IN p_doctor_message TEXT
)
BEGIN
    DECLARE v_patient_id INT;
    DECLARE v_doctor_id INT;
    DECLARE v_appointment_date DATE;
    DECLARE v_appointment_time TIME;
    DECLARE v_message TEXT;
    DECLARE v_notification_type VARCHAR(30);
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Get appointment details
    SELECT patient_id, doctor_id, appointment_date, appointment_time
    INTO v_patient_id, v_doctor_id, v_appointment_date, v_appointment_time
    FROM Appointment
    WHERE appointment_id = p_appointment_id;
    
    -- Update appointment status
    UPDATE Appointment 
    SET status = p_new_status, updated_at = CURRENT_TIMESTAMP
    WHERE appointment_id = p_appointment_id;
    
    -- Determine notification type and message
    CASE p_new_status
        WHEN 'approved' THEN
            SET v_notification_type = 'appointment_approved';
            SET v_message = CONCAT('Your appointment has been approved for ', 
                                 v_appointment_date, ' at ', v_appointment_time, 
                                 '. Please arrive 15 minutes early.');
        WHEN 'rejected' THEN
            SET v_notification_type = 'appointment_rejected';
            SET v_message = CONCAT('Your appointment request for ', 
                                 v_appointment_date, ' at ', v_appointment_time, 
                                 ' has been rejected. Please contact us to reschedule.');
        WHEN 'completed' THEN
            SET v_notification_type = 'appointment_reminder';
            SET v_message = 'Your appointment has been marked as completed. Thank you for visiting us.';
        ELSE
            SET v_notification_type = 'doctor_message';
            SET v_message = CONCAT('Appointment status updated to: ', p_new_status);
    END CASE;
    
    -- Add doctor message if provided
    IF p_doctor_message IS NOT NULL AND p_doctor_message != '' THEN
        SET v_message = CONCAT(v_message, ' Doctor Note: ', p_doctor_message);
    END IF;
    
    -- Create notification
    INSERT INTO Notification (appointment_id, patient_id, doctor_id, message, notification_type)
    VALUES (p_appointment_id, v_patient_id, v_doctor_id, v_message, v_notification_type);
    
    COMMIT;
    
    SELECT 'SUCCESS' AS status, v_message AS notification_message;
END //

-- 6. Procedure to get doctor's upcoming appointments
CREATE PROCEDURE GetDoctorUpcomingAppointments(
    IN p_doctor_id INT,
    IN p_days_ahead INT
)
BEGIN
    SELECT 
        a.appointment_id,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        p.phone AS patient_phone,
        a.appointment_date,
        a.appointment_time,
        a.status,
        a.problem_description,
        a.symptoms
    FROM Appointment a
    JOIN Patient p ON a.patient_id = p.patient_id
    WHERE a.doctor_id = p_doctor_id
    AND a.appointment_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL p_days_ahead DAY)
    AND a.status IN ('approved', 'pending')
    ORDER BY a.appointment_date ASC, a.appointment_time ASC;
END //

DELIMITER ;
