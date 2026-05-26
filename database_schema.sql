-- Hospital Appointment Management System Database Schema
-- MySQL Database Creation Script (XAMPP-compatible, fixed version)

-- Create database
CREATE DATABASE IF NOT EXISTS hospital_appointment_system;
USE hospital_appointment_system;

-- Drop tables if they exist (in correct order due to foreign key constraints)
DROP TABLE IF EXISTS Notification;
DROP TABLE IF EXISTS Appointment;
DROP TABLE IF EXISTS Doctor_Specialization;
DROP TABLE IF EXISTS Specialization;
DROP TABLE IF EXISTS Doctor;
DROP TABLE IF EXISTS Patient;

-- 1. Patient Table
CREATE TABLE Patient (
    patient_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender ENUM('Male', 'Female', 'Other') NOT NULL,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT chk_patient_email CHECK (email LIKE '%@%.%'),
    CONSTRAINT chk_patient_phone CHECK (phone REGEXP '^[0-9+\\-\\s()]+$')
);

-- Trigger to validate date_of_birth
DELIMITER $$

CREATE TRIGGER trg_check_patient_dob
BEFORE INSERT ON Patient
FOR EACH ROW
BEGIN
    IF NEW.date_of_birth > CURDATE() THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Date of birth cannot be in the future';
    END IF;
END$$

DELIMITER ;

-- 2. Doctor Table
CREATE TABLE Doctor (
    doctor_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    license_number VARCHAR(20) UNIQUE NOT NULL,
    experience_years INT NOT NULL DEFAULT 0,
    consultation_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT chk_doctor_email CHECK (email LIKE '%@%.%'),
    CONSTRAINT chk_doctor_phone CHECK (phone REGEXP '^[0-9+\\-\\s()]+$'),
    CONSTRAINT chk_doctor_experience CHECK (experience_years >= 0),
    CONSTRAINT chk_doctor_fee CHECK (consultation_fee >= 0)
);

-- 3. Specialization Table
CREATE TABLE Specialization (
    spec_id INT AUTO_INCREMENT PRIMARY KEY,
    spec_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,

    -- Constraints
    CONSTRAINT chk_spec_name CHECK (LENGTH(spec_name) >= 2)
);

-- 4. Doctor_Specialization Junction Table
CREATE TABLE Doctor_Specialization (
    doctor_id INT NOT NULL,
    spec_id INT NOT NULL,
    proficiency_level ENUM('Beginner', 'Intermediate', 'Advanced', 'Expert') DEFAULT 'Intermediate',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Primary Key
    PRIMARY KEY (doctor_id, spec_id),

    -- Foreign Keys
    FOREIGN KEY (doctor_id) REFERENCES Doctor(doctor_id) ON DELETE CASCADE,
    FOREIGN KEY (spec_id) REFERENCES Specialization(spec_id) ON DELETE CASCADE
);

-- 5. Appointment Table
CREATE TABLE Appointment (
    appointment_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'completed', 'cancelled') DEFAULT 'pending',
    problem_description TEXT NOT NULL,
    symptoms TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Foreign Keys
    FOREIGN KEY (patient_id) REFERENCES Patient(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES Doctor(doctor_id) ON DELETE CASCADE,

    -- Constraints
    CONSTRAINT chk_appointment_time CHECK (appointment_time BETWEEN '08:00:00' AND '18:00:00'),
    CONSTRAINT chk_problem_description CHECK (LENGTH(problem_description) >= 10)
);

-- Trigger to prevent past appointment dates
DELIMITER $$

CREATE TRIGGER trg_check_appointment_date
BEFORE INSERT ON Appointment
FOR EACH ROW
BEGIN
    IF NEW.appointment_date < CURDATE() THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Appointment date cannot be in the past';
    END IF;
END$$

DELIMITER ;

-- 6. Notification Table
CREATE TABLE Notification (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT NOT NULL,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    message TEXT NOT NULL,
    notification_type ENUM('appointment_approved', 'appointment_rejected', 'appointment_reminder', 'doctor_message') NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Keys
    FOREIGN KEY (appointment_id) REFERENCES Appointment(appointment_id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES Patient(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES Doctor(doctor_id) ON DELETE CASCADE,

    -- Constraints
    CONSTRAINT chk_notification_message CHECK (LENGTH(message) >= 5)
);

-- 7. Blacklisted Tokens Table (Session Management)
CREATE TABLE Blacklisted_Tokens (
    token VARCHAR(512) PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for Performance
CREATE INDEX idx_patient_email ON Patient(email);
CREATE INDEX idx_patient_phone ON Patient(phone);
CREATE INDEX idx_patient_name ON Patient(first_name, last_name);

CREATE INDEX idx_doctor_email ON Doctor(email);
CREATE INDEX idx_doctor_phone ON Doctor(phone);
CREATE INDEX idx_doctor_license ON Doctor(license_number);
CREATE INDEX idx_doctor_name ON Doctor(first_name, last_name);

CREATE INDEX idx_appointment_patient ON Appointment(patient_id);
CREATE INDEX idx_appointment_doctor ON Appointment(doctor_id);
CREATE INDEX idx_appointment_date ON Appointment(appointment_date);
CREATE INDEX idx_appointment_status ON Appointment(status);
CREATE INDEX idx_appointment_datetime ON Appointment(appointment_date, appointment_time);

CREATE INDEX idx_notification_patient ON Notification(patient_id);
CREATE INDEX idx_notification_doctor ON Notification(doctor_id);
CREATE INDEX idx_notification_appointment ON Notification(appointment_id);
CREATE INDEX idx_notification_read ON Notification(is_read);
CREATE INDEX idx_notification_type ON Notification(notification_type);

CREATE INDEX idx_spec_name ON Specialization(spec_name);
CREATE INDEX idx_doc_spec_doctor ON Doctor_Specialization(doctor_id);
CREATE INDEX idx_doc_spec_specialization ON Doctor_Specialization(spec_id);

-- Insert Sample Data
INSERT INTO Specialization (spec_name, description) VALUES
('Cardiology', 'Heart and cardiovascular system specialist'),
('Dermatology', 'Skin, hair, and nail specialist'),
('Neurology', 'Brain and nervous system specialist'),
('Orthopedics', 'Bones, joints, and muscles specialist'),
('Pediatrics', 'Children and adolescent health specialist'),
('Psychiatry', 'Mental health and behavioral specialist'),
('General Medicine', 'General health and internal medicine specialist');

INSERT INTO Doctor (first_name, last_name, email, phone, password_hash, license_number, experience_years, consultation_fee) VALUES
('Amit', 'Trivedi', 'amittrivedi@hospital.com', '+1-555-0101', '$2b$10$example_hash_1', 'DOC001', 8, 150.00),
('Dhruv', 'Bisht', 'dhruvbisht@hospital.com', '+1-555-0102', '$2b$10$example_hash_2', 'DOC002', 12, 200.00),
('Ayush', 'Deopa', 'ayushdeopa@hospital.com', '+1-555-0103', '$2b$10$example_hash_3', 'DOC003', 5, 120.00),
('Deepak', 'Singh', 'deepaksingh@hospital.com', '+1-555-0104', '$2b$10$example_hash_4', 'DOC004', 15, 250.00),
('Shashank', 'Aggarwal', 'shashankaggarwal@hospital.com', '+1-555-0105', '$2b$10$example_hash_5', 'DOC005', 10, 180.00);

INSERT INTO Doctor_Specialization (doctor_id, spec_id, proficiency_level) VALUES
(1, 1, 'Expert'),
(1, 6, 'Advanced'),
(2, 2, 'Expert'),
(2, 7, 'Advanced'),
(3, 3, 'Advanced'),
(3, 5, 'Expert'),
(4, 4, 'Expert'),
(4, 7, 'Advanced'),
(5, 6, 'Expert'),
(5, 7, 'Advanced');

INSERT INTO Patient (first_name, last_name, email, phone, password_hash, date_of_birth, gender, address) VALUES
('Ravi', 'Kumar', 'ravikumar@email.com', '+1-555-1001', '$2b$10$example_hash_p1', '1985-03-15', 'Male', '123 Main St, City, State'),
('Rahul', 'Chauhan', 'rahulchauhan@email.com', '+1-555-1002', '$2b$10$example_hash_p2', '1990-07-22', 'Female', '456 Oak Ave, City, State'),
('Gaurav', 'Rawat', 'gauravrawat@email.com', '+1-555-1003', '$2b$10$example_hash_p3', '1978-11-08', 'Male', '789 Pine Rd, City, State'),
('Ritika', 'Rautela', 'ritikarautela@email.com', '+1-555-1004', '$2b$10$example_hash_p4', '1992-01-30', 'Female', '321 Elm St, City, State'),
('Aayush', 'Kaji', 'aayushkaji@email.com', '+1-555-1005', '$2b$10$example_hash_p5', '1988-09-12', 'Male', '654 Maple Dr, City, State');

INSERT INTO Appointment (patient_id, doctor_id, appointment_date, appointment_time, status, problem_description, symptoms) VALUES
(1, 1, '2026-10-15', '10:00:00', 'approved', 'Chest pain and shortness of breath', 'Chest discomfort, difficulty breathing, fatigue'),
(2, 2, '2026-10-16', '14:30:00', 'pending', 'Skin rash and itching', 'Red bumps on arms and legs, severe itching'),
(3, 3, '2026-10-17', '09:15:00', 'approved', 'Headaches and dizziness', 'Frequent headaches, feeling dizzy, blurred vision'),
(4, 4, '2026-10-18', '11:00:00', 'pending', 'Knee pain and swelling', 'Pain in right knee, swelling, difficulty walking'),
(5, 5, '2026-10-19', '15:45:00', 'approved', 'Anxiety and depression', 'Feeling anxious, depressed mood, sleep problems');

INSERT INTO Notification (appointment_id, patient_id, doctor_id, message, notification_type) VALUES
(1, 1, 1, 'Your appointment has been approved for October 15th at 10:00 AM.', 'appointment_approved'),
(3, 3, 3, 'Your appointment has been approved for October 17th at 9:15 AM.', 'appointment_approved'),
(5, 5, 5, 'Your appointment has been approved for October 19th at 3:45 PM.', 'appointment_approved');

-- Create a view for appointment details with patient and doctor info
CREATE OR REPLACE VIEW appointment_details AS
SELECT
    a.appointment_id,
    CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
    p.email AS patient_email,
    p.phone AS patient_phone,
    CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
    d.email AS doctor_email,
    d.phone AS doctor_phone,
    s.spec_name AS specialization,
    a.appointment_date,
    a.appointment_time,
    a.status,
    a.problem_description,
    a.symptoms,
    a.created_at,
    a.updated_at
FROM Appointment a
JOIN Patient p ON a.patient_id = p.patient_id
JOIN Doctor d ON a.doctor_id = d.doctor_id
LEFT JOIN Doctor_Specialization ds ON d.doctor_id = ds.doctor_id
LEFT JOIN Specialization s ON ds.spec_id = s.spec_id;

-- Create a view for doctor availability
CREATE OR REPLACE VIEW doctor_availability AS
SELECT
    d.doctor_id,
    CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
    s.spec_name AS specialization,
    d.consultation_fee,
    COUNT(a.appointment_id) AS total_appointments,
    COUNT(CASE WHEN a.status = 'approved' AND a.appointment_date >= CURDATE() THEN 1 END) AS upcoming_appointments
FROM Doctor d
LEFT JOIN Doctor_Specialization ds ON d.doctor_id = ds.doctor_id
LEFT JOIN Specialization s ON ds.spec_id = s.spec_id
LEFT JOIN Appointment a ON d.doctor_id = a.doctor_id
GROUP BY d.doctor_id, d.first_name, d.last_name, s.spec_name, d.consultation_fee;
