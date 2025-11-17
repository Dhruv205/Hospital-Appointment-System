-- Triggers for Hospital Appointment Management System

USE hospital_appointment_system;

-- 1. Trigger to automatically create notification when appointment status changes
DELIMITER //

CREATE TRIGGER tr_appointment_status_change
AFTER UPDATE ON Appointment
FOR EACH ROW
BEGIN
    DECLARE v_message TEXT;
    DECLARE v_notification_type VARCHAR(30);
    
    -- Only create notification if status actually changed
    IF OLD.status != NEW.status THEN
        -- Determine notification type and message based on new status
        CASE NEW.status
            WHEN 'approved' THEN
                SET v_notification_type = 'appointment_approved';
                SET v_message = CONCAT('Your appointment has been approved for ', 
                                     NEW.appointment_date, ' at ', NEW.appointment_time, 
                                     '. Please arrive 15 minutes early.');
            WHEN 'rejected' THEN
                SET v_notification_type = 'appointment_rejected';
                SET v_message = CONCAT('Your appointment request for ', 
                                     NEW.appointment_date, ' at ', NEW.appointment_time, 
                                     ' has been rejected. Please contact us to reschedule.');
            WHEN 'completed' THEN
                SET v_notification_type = 'appointment_reminder';
                SET v_message = 'Your appointment has been marked as completed. Thank you for visiting us.';
            WHEN 'cancelled' THEN
                SET v_notification_type = 'appointment_reminder';
                SET v_message = CONCAT('Your appointment for ', 
                                     NEW.appointment_date, ' at ', NEW.appointment_time, 
                                     ' has been cancelled.');
            ELSE
                SET v_notification_type = 'doctor_message';
                SET v_message = CONCAT('Appointment status updated to: ', NEW.status);
        END CASE;
        
        -- Insert notification
        INSERT INTO Notification (appointment_id, patient_id, doctor_id, message, notification_type)
        VALUES (NEW.appointment_id, NEW.patient_id, NEW.doctor_id, v_message, v_notification_type);
    END IF;
END //

-- 2. Trigger to log appointment creation
CREATE TRIGGER tr_appointment_created
AFTER INSERT ON Appointment
FOR EACH ROW
BEGIN
    DECLARE v_message TEXT;
    
    -- Create initial notification for appointment request
    SET v_message = CONCAT('Your appointment request has been received for ', 
                          NEW.appointment_date, ' at ', NEW.appointment_time, 
                          '. We will notify you once it is reviewed by the doctor.');
    
    INSERT INTO Notification (appointment_id, patient_id, doctor_id, message, notification_type)
    VALUES (NEW.appointment_id, NEW.patient_id, NEW.doctor_id, v_message, 'appointment_reminder');
END //

-- 3. Trigger to prevent double booking of doctors
CREATE TRIGGER tr_prevent_double_booking
BEFORE INSERT ON Appointment
FOR EACH ROW
BEGIN
    DECLARE v_conflict_count INT DEFAULT 0;
    
    -- Check for existing appointments at the same time
    SELECT COUNT(*) INTO v_conflict_count
    FROM Appointment
    WHERE doctor_id = NEW.doctor_id
    AND appointment_date = NEW.appointment_date
    AND appointment_time = NEW.appointment_time
    AND status IN ('approved', 'pending');
    
    -- If conflict found, signal error
    IF v_conflict_count > 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Doctor is already booked at this time slot. Please choose a different time.';
    END IF;
END //

-- 4. Trigger to prevent past appointments
CREATE TRIGGER tr_prevent_past_appointments
BEFORE INSERT ON Appointment
FOR EACH ROW
BEGIN
    -- Check if appointment is in the past
    IF NEW.appointment_date < CURDATE() OR 
       (NEW.appointment_date = CURDATE() AND NEW.appointment_time < CURTIME()) THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Cannot schedule appointments in the past.';
    END IF;
END //

-- 5. Trigger to update appointment updated_at timestamp
CREATE TRIGGER tr_appointment_updated
BEFORE UPDATE ON Appointment
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END //

-- 6. Trigger to create audit log for appointment changes
CREATE TABLE IF NOT EXISTS appointment_audit_log (
    audit_id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_by VARCHAR(50),
    change_reason TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_audit_appointment (appointment_id),
    INDEX idx_audit_timestamp (changed_at)
);

CREATE TRIGGER tr_appointment_audit
AFTER UPDATE ON Appointment
FOR EACH ROW
BEGIN
    -- Log status changes
    IF OLD.status != NEW.status THEN
        INSERT INTO appointment_audit_log (appointment_id, old_status, new_status, changed_by, change_reason)
        VALUES (NEW.appointment_id, OLD.status, NEW.status, USER(), 'Status updated via trigger');
    END IF;
END //

-- 7. Trigger to send reminder notifications (for future implementation)
CREATE TRIGGER tr_appointment_reminder_check
AFTER UPDATE ON Appointment
FOR EACH ROW
BEGIN
    DECLARE v_hours_until_appointment INT;
    DECLARE v_message TEXT;
    
    -- Check if appointment is approved and within 24 hours
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        SET v_hours_until_appointment = TIMESTAMPDIFF(HOUR, NOW(), 
            CONCAT(NEW.appointment_date, ' ', NEW.appointment_time));
        
        -- Send reminder if appointment is within 24 hours
        IF v_hours_until_appointment <= 24 AND v_hours_until_appointment > 0 THEN
            SET v_message = CONCAT('Reminder: You have an appointment tomorrow at ', 
                                 NEW.appointment_time, '. Please arrive 15 minutes early.');
            
            INSERT INTO Notification (appointment_id, patient_id, doctor_id, message, notification_type)
            VALUES (NEW.appointment_id, NEW.patient_id, NEW.doctor_id, v_message, 'appointment_reminder');
        END IF;
    END IF;
END //

-- 8. Trigger to validate doctor specialization before appointment creation
CREATE TRIGGER tr_validate_doctor_specialization
BEFORE INSERT ON Appointment
FOR EACH ROW
BEGIN
    DECLARE v_specialization_count INT DEFAULT 0;
    DECLARE v_problem_keywords TEXT;
    
    -- Extract keywords from problem description (simplified)
    SET v_problem_keywords = LOWER(NEW.problem_description);
    
    -- Check if doctor has relevant specialization based on problem keywords
    -- This is a simplified check - in practice, you'd use more sophisticated matching
    SELECT COUNT(*) INTO v_specialization_count
    FROM Doctor_Specialization ds
    JOIN Specialization s ON ds.spec_id = s.spec_id
    WHERE ds.doctor_id = NEW.doctor_id
    AND (
        (v_problem_keywords LIKE '%heart%' OR v_problem_keywords LIKE '%chest%') AND s.spec_name LIKE '%Cardiology%'
        OR (v_problem_keywords LIKE '%skin%' OR v_problem_keywords LIKE '%rash%') AND s.spec_name LIKE '%Dermatology%'
        OR (v_problem_keywords LIKE '%head%' OR v_problem_keywords LIKE '%brain%') AND s.spec_name LIKE '%Neurology%'
        OR (v_problem_keywords LIKE '%bone%' OR v_problem_keywords LIKE '%joint%') AND s.spec_name LIKE '%Orthopedics%'
        OR (v_problem_keywords LIKE '%child%' OR v_problem_keywords LIKE '%baby%') AND s.spec_name LIKE '%Pediatrics%'
        OR (v_problem_keywords LIKE '%mental%' OR v_problem_keywords LIKE '%anxiety%') AND s.spec_name LIKE '%Psychiatry%'
        OR s.spec_name LIKE '%General%' OR s.spec_name LIKE '%Medicine%'
    );
    
    -- If no relevant specialization found, still allow but log it
    IF v_specialization_count = 0 THEN
        -- Log the mismatch (in a real system, you might want to flag this for review)
        INSERT INTO appointment_audit_log (appointment_id, old_status, new_status, changed_by, change_reason)
        VALUES (NEW.appointment_id, 'new', 'pending', USER(), 
                CONCAT('Warning: Doctor may not have specialization matching problem: ', NEW.problem_description));
    END IF;
END //

-- 9. Trigger to automatically assign alternative doctor if original is unavailable
CREATE TRIGGER tr_auto_assign_alternative_doctor
AFTER INSERT ON Appointment
FOR EACH ROW
BEGIN
    DECLARE v_alternative_doctor_id INT DEFAULT NULL;
    DECLARE v_spec_id INT DEFAULT NULL;
    DECLARE v_message TEXT;
    
    -- Only process if appointment is pending
    IF NEW.status = 'pending' THEN
        -- Find doctor's primary specialization
        SELECT ds.spec_id INTO v_spec_id
        FROM Doctor_Specialization ds
        WHERE ds.doctor_id = NEW.doctor_id
        ORDER BY ds.proficiency_level DESC
        LIMIT 1;
        
        -- Find alternative doctor with same specialization
        SELECT d.doctor_id INTO v_alternative_doctor_id
        FROM Doctor d
        JOIN Doctor_Specialization ds ON d.doctor_id = ds.doctor_id
        WHERE ds.spec_id = v_spec_id
        AND d.doctor_id != NEW.doctor_id
        AND d.doctor_id NOT IN (
            SELECT doctor_id 
            FROM Appointment 
            WHERE appointment_date = NEW.appointment_date 
            AND appointment_time = NEW.appointment_time
            AND status IN ('approved', 'pending')
        )
        ORDER BY ds.proficiency_level DESC, d.experience_years DESC
        LIMIT 1;
        
        -- If alternative found, create a notification suggesting the alternative
        IF v_alternative_doctor_id IS NOT NULL THEN
            SET v_message = CONCAT('Note: An alternative doctor with similar specialization is available if needed. ',
                                 'Contact us if you would like to switch doctors.');
            
            INSERT INTO Notification (appointment_id, patient_id, doctor_id, message, notification_type)
            VALUES (NEW.appointment_id, NEW.patient_id, NEW.doctor_id, v_message, 'doctor_message');
        END IF;
    END IF;
END //

DELIMITER ;
