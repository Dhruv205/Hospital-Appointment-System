# ER Diagram for Doctor-Patient Appointment Management System

## Entity-Relationship Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Patient     │    │     Doctor      │    │ Specialization  │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ patient_id (PK) │    │ doctor_id (PK)  │    │ spec_id (PK)    │
│ first_name      │    │ first_name      │    │ spec_name       │
│ last_name       │    │ last_name       │    │ description     │
│ email           │    │ email           │    │                 │
│ phone           │    │ phone           │    │                 │
│ password_hash   │    │ password_hash   │    │                 │
│ date_of_birth   │    │ license_number  │    │                 │
│ gender          │    │ experience_yrs  │    │                 │
│ address         │    │ consultation_fee│    │                 │
│ created_at      │    │ created_at      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         │                       │                       │
         │              ┌────────▼────────┐              │
         │              │ Doctor_Specialization │              │
         │              ├─────────────────┤              │
         │              │ doctor_id (FK)  │              │
         │              │ spec_id (FK)    │              │
         │              │ proficiency_lvl │              │
         │              └─────────────────┘              │
         │                       │                       │
         │                       │                       │
         │                       │                       │
         │              ┌────────▼────────┐              │
         │              │   Appointment   │              │
         │              ├─────────────────┤              │
         │              │ appointment_id  │              │
         │              │ patient_id (FK) │              │
         │              │ doctor_id (FK)  │              │
         │              │ appointment_date│              │
         │              │ appointment_time│              │
         │              │ status          │              │
         │              │ problem_desc    │              │
         │              │ symptoms        │              │
         │              │ created_at      │              │
         │              │ updated_at      │              │
         │              └─────────────────┘              │
         │                       │                       │
         │                       │                       │
         │              ┌────────▼────────┐              │
         │              │  Notification   │              │
         │              ├─────────────────┤              │
         │              │ notification_id │              │
         │              │ appointment_id  │              │
         │              │ patient_id (FK) │              │
         │              │ doctor_id (FK)  │              │
         │              │ message         │              │
         │              │ notification_type│             │
         │              │ is_read         │              │
         │              │ created_at      │              │
         │              └─────────────────┘              │
         │                       │                       │
         │                       │                       │
         └───────────────────────┴───────────────────────┘
```

## Relationships

1. **Patient** (1) ←→ (M) **Appointment**: One patient can have many appointments
2. **Doctor** (1) ←→ (M) **Appointment**: One doctor can have many appointments
3. **Doctor** (M) ←→ (M) **Specialization**: Many-to-many relationship through Doctor_Specialization
4. **Appointment** (1) ←→ (M) **Notification**: One appointment can have many notifications
5. **Patient** (1) ←→ (M) **Notification**: One patient can receive many notifications
6. **Doctor** (1) ←→ (M) **Notification**: One doctor can send many notifications

## Key Design Decisions

- **Patient** and **Doctor** are separate entities with their own authentication
- **Specialization** is a separate entity to allow multiple specializations per doctor
- **Doctor_Specialization** junction table includes proficiency level
- **Appointment** includes problem description and symptoms for better matching
- **Notification** table for communication between patients and doctors
- All entities include audit fields (created_at, updated_at)
- Status field in Appointment for tracking (pending, approved, rejected, completed, cancelled)
