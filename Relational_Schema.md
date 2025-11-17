# Normalized Relational Schema (3NF)

## Database: hospital_appointment_system

### 1. Patient Table
```sql
Patient (patient_id, first_name, last_name, email, phone, password_hash, 
         date_of_birth, gender, address, created_at)
```
- **Primary Key**: patient_id
- **Unique Constraints**: email, phone
- **Functional Dependencies**: 
  - patient_id → first_name, last_name, email, phone, password_hash, date_of_birth, gender, address, created_at

### 2. Doctor Table
```sql
Doctor (doctor_id, first_name, last_name, email, phone, password_hash, 
        license_number, experience_years, consultation_fee, created_at)
```
- **Primary Key**: doctor_id
- **Unique Constraints**: email, phone, license_number
- **Functional Dependencies**:
  - doctor_id → first_name, last_name, email, phone, password_hash, license_number, experience_years, consultation_fee, created_at

### 3. Specialization Table
```sql
Specialization (spec_id, spec_name, description)
```
- **Primary Key**: spec_id
- **Unique Constraints**: spec_name
- **Functional Dependencies**:
  - spec_id → spec_name, description

### 4. Doctor_Specialization Table (Junction Table)
```sql
Doctor_Specialization (doctor_id, spec_id, proficiency_level)
```
- **Primary Key**: (doctor_id, spec_id)
- **Foreign Keys**: doctor_id → Doctor(doctor_id), spec_id → Specialization(spec_id)
- **Functional Dependencies**:
  - (doctor_id, spec_id) → proficiency_level

### 5. Appointment Table
```sql
Appointment (appointment_id, patient_id, doctor_id, appointment_date, 
            appointment_time, status, problem_description, symptoms, 
            created_at, updated_at)
```
- **Primary Key**: appointment_id
- **Foreign Keys**: patient_id → Patient(patient_id), doctor_id → Doctor(doctor_id)
- **Check Constraints**: status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')
- **Functional Dependencies**:
  - appointment_id → patient_id, doctor_id, appointment_date, appointment_time, status, problem_description, symptoms, created_at, updated_at

### 6. Notification Table
```sql
Notification (notification_id, appointment_id, patient_id, doctor_id, 
             message, notification_type, is_read, created_at)
```
- **Primary Key**: notification_id
- **Foreign Keys**: 
  - appointment_id → Appointment(appointment_id)
  - patient_id → Patient(patient_id)
  - doctor_id → Doctor(doctor_id)
- **Check Constraints**: notification_type IN ('appointment_approved', 'appointment_rejected', 'appointment_reminder', 'doctor_message')
- **Functional Dependencies**:
  - notification_id → appointment_id, patient_id, doctor_id, message, notification_type, is_read, created_at

## Normalization Analysis

### First Normal Form (1NF)
- All tables have atomic values
- No repeating groups
- Each cell contains a single value

### Second Normal Form (2NF)
- All tables are in 1NF
- All non-key attributes are fully functionally dependent on the primary key
- No partial dependencies exist

### Third Normal Form (3NF)
- All tables are in 2NF
- No transitive dependencies exist
- All non-key attributes are directly dependent on the primary key

## Referential Integrity Rules

1. **Cascade Delete**: When a patient is deleted, all their appointments and notifications are deleted
2. **Cascade Delete**: When a doctor is deleted, all their appointments and notifications are deleted
3. **Restrict Delete**: Cannot delete a specialization if doctors are still associated with it
4. **Restrict Delete**: Cannot delete an appointment if notifications exist for it

## Indexes for Performance

1. **Patient Table**:
   - INDEX idx_patient_email (email)
   - INDEX idx_patient_phone (phone)

2. **Doctor Table**:
   - INDEX idx_doctor_email (email)
   - INDEX idx_doctor_license (license_number)

3. **Appointment Table**:
   - INDEX idx_appointment_patient (patient_id)
   - INDEX idx_appointment_doctor (doctor_id)
   - INDEX idx_appointment_date (appointment_date)
   - INDEX idx_appointment_status (status)

4. **Notification Table**:
   - INDEX idx_notification_patient (patient_id)
   - INDEX idx_notification_doctor (doctor_id)
   - INDEX idx_notification_appointment (appointment_id)
   - INDEX idx_notification_read (is_read)

## Business Rules

1. A patient can have multiple appointments
2. A doctor can have multiple appointments
3. A doctor can have multiple specializations
4. An appointment must have exactly one patient and one doctor
5. Appointments cannot be scheduled in the past
6. A doctor cannot have overlapping appointments
7. Notifications are automatically created when appointment status changes
8. Auto-assignment occurs when a doctor is unavailable
