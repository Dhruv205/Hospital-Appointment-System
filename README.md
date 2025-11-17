# Hospital Appointment Management System

A comprehensive Doctor-Patient Appointment Management System built with **React.js**, **Express.js**, and **MySQL**. This project demonstrates core Database Management Systems (DBMS) concepts including ER diagrams, normalized relational schema, SQL operations, stored procedures, triggers, and a modern web interface.

## 🏥 Features

### Patient Features
- **User Registration & Authentication** - Secure patient registration and login
- **Appointment Booking** - Book appointments with doctors based on specialization
- **Auto-Doctor Assignment** - Automatic assignment of alternative doctors when preferred doctor is unavailable
- **Appointment Management** - View, cancel, and track appointment status
- **Dashboard** - Overview of upcoming appointments and notifications
- **Profile Management** - Update personal information and preferences

### Doctor Features
- **Doctor Registration & Authentication** - Secure doctor registration with license verification
- **Appointment Management** - View, approve, reject, and manage patient appointments
- **Patient Management** - View assigned patients and their medical history
- **Specialization Management** - Add and manage medical specializations
- **Dashboard** - Overview of daily schedule and pending requests
- **Performance Analytics** - Track appointment statistics and completion rates

### System Features
- **Real-time Notifications** - Automatic notifications for appointment status changes
- **Auto-Assignment Logic** - Intelligent doctor assignment using stored procedures
- **Audit Logging** - Complete audit trail of all system changes
- **Responsive Design** - Modern, mobile-friendly user interface
- **Role-based Access Control** - Secure access based on user roles

## 🗄️ Database Design

### ER Diagram
The system includes a comprehensive Entity-Relationship diagram showing relationships between:
- **Patient** - Patient information and medical records
- **Doctor** - Doctor profiles and specializations
- **Specialization** - Medical specializations and descriptions
- **Appointment** - Appointment scheduling and management
- **Notification** - System notifications and messages
- **Doctor_Specialization** - Many-to-many relationship between doctors and specializations

### Normalized Schema (3NF)
- **First Normal Form (1NF)** - All tables have atomic values
- **Second Normal Form (2NF)** - No partial dependencies
- **Third Normal Form (3NF)** - No transitive dependencies

### Key Database Features
- **Referential Integrity** - Foreign key constraints and cascading deletes
- **Data Validation** - Check constraints and data type validation
- **Indexing** - Optimized indexes for performance
- **Stored Procedures** - Auto-assignment and business logic
- **Triggers** - Automatic notifications and audit logging

## 🚀 Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MySQL** - Database management system
- **JWT** - Authentication and authorization
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing
- **Helmet** - Security middleware

### Frontend
- **React.js** - User interface library
- **React Router** - Client-side routing
- **React Query** - Data fetching and caching
- **React Hook Form** - Form management
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library
- **React Hot Toast** - Notification system

## 📋 Prerequisites

Before running this project, make sure you have the following installed:

- **Node.js** (v16 or higher)
- **MySQL** (v8.0 or higher)
- **npm** or **yarn**

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd hospital-appointment-system
```

### 2. Database Setup
```bash
# Create MySQL database
mysql -u root -p
CREATE DATABASE hospital_appointment_system;

# Run database setup script
node scripts/setupDatabase.js
```

### 3. Backend Setup
```bash
# Install dependencies
npm install

# Create environment file
cp env.example .env

# Update .env with your database credentials
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=hospital_appointment_system
JWT_SECRET=your_jwt_secret_key
PORT=5000

# Start backend server
npm start
```

### 4. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

### 5. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **API Documentation**: http://localhost:5000

## 📊 Database Schema

### Tables
1. **Patient** - Patient information and medical records
2. **Doctor** - Doctor profiles and credentials
3. **Specialization** - Medical specializations
4. **Doctor_Specialization** - Doctor-specialization relationships
5. **Appointment** - Appointment scheduling and management
6. **Notification** - System notifications and messages
7. **appointment_audit_log** - Audit trail for appointment changes

### Stored Procedures
- `AutoAssignDoctor` - Automatically assigns alternative doctors
- `FindAvailableDoctors` - Finds available doctors by specialization
- `GetAppointmentStats` - Retrieves appointment statistics
- `GetPatientAppointmentHistory` - Gets patient appointment history
- `UpdateAppointmentStatus` - Updates appointment status with notifications
- `GetDoctorUpcomingAppointments` - Gets doctor's upcoming appointments

### Triggers
- `tr_appointment_status_change` - Creates notifications on status changes
- `tr_appointment_created` - Creates initial appointment notifications
- `tr_prevent_double_booking` - Prevents doctor double booking
- `tr_prevent_past_appointments` - Prevents scheduling past appointments
- `tr_appointment_audit` - Logs appointment changes for audit
- `tr_appointment_reminder_check` - Sends reminder notifications
- `tr_validate_doctor_specialization` - Validates doctor specialization
- `tr_auto_assign_alternative_doctor` - Auto-assigns alternative doctors

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

### Appointments
- `POST /api/appointments` - Create appointment
- `GET /api/appointments/patient` - Get patient appointments
- `GET /api/appointments/doctor` - Get doctor appointments
- `GET /api/appointments/:id` - Get appointment details
- `PUT /api/appointments/:id/status` - Update appointment status
- `PUT /api/appointments/:id/cancel` - Cancel appointment
- `POST /api/appointments/auto-assign` - Auto-assign doctor

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/read-all` - Mark all notifications as read
- `DELETE /api/notifications/:id` - Delete notification

### Admin
- `GET /api/admin/stats` - Get system statistics
- `GET /api/admin/users` - Get all users
- `GET /api/admin/appointments` - Get all appointments
- `GET /api/admin/logs` - Get system logs

## 🧪 Testing

### Database Testing
```bash
# Test database connection
node -e "require('./config/database').testConnection()"

# Run sample queries
mysql -u root -p hospital_appointment_system < sql_queries.sql
```

### API Testing
```bash
# Test API endpoints
curl -X GET http://localhost:5000/api/health
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password","userType":"patient"}'
```

## 📈 Performance Features

- **Connection Pooling** - Efficient database connection management
- **Query Optimization** - Indexed queries for better performance
- **Caching** - React Query for client-side caching
- **Rate Limiting** - API rate limiting for security
- **Lazy Loading** - Component lazy loading for better UX

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcryptjs for password security
- **CORS Protection** - Cross-origin request protection
- **Input Validation** - Server-side input validation
- **SQL Injection Prevention** - Parameterized queries
- **Rate Limiting** - API abuse prevention

## 📱 Responsive Design

The application is fully responsive and works on:
- **Desktop** - Full-featured experience
- **Tablet** - Optimized for touch interaction
- **Mobile** - Mobile-first design approach

## 🚀 Deployment

### Backend Deployment
```bash
# Build for production
npm run build

# Start production server
NODE_ENV=production npm start
```

### Frontend Deployment
```bash
# Build for production
cd frontend
npm run build

# Serve static files
npx serve -s build
```

### Database Deployment
```bash
# Export database
mysqldump -u root -p hospital_appointment_system > database_backup.sql

# Import database
mysql -u root -p hospital_appointment_system < database_backup.sql
```

## 📚 Learning Outcomes

This project demonstrates:

1. **Database Design** - ER modeling and normalization
2. **SQL Programming** - Complex queries, stored procedures, triggers
3. **Backend Development** - RESTful API design and implementation
4. **Frontend Development** - Modern React.js application
5. **Full-Stack Integration** - Seamless frontend-backend communication
6. **Database Management** - MySQL administration and optimization
7. **Security Implementation** - Authentication and authorization
8. **System Architecture** - Scalable and maintainable code structure

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🎯 Future Enhancements

- **Video Consultations** - Integrate video calling functionality
- **Payment Integration** - Online payment processing
- **Mobile App** - Native mobile applications
- **AI Recommendations** - AI-powered doctor recommendations
- **Telemedicine** - Remote consultation features
- **Analytics Dashboard** - Advanced analytics and reporting
- **Multi-language Support** - Internationalization
- **Advanced Scheduling** - Recurring appointments and availability management

---

**Note**: This is a comprehensive demonstration project showcasing DBMS concepts, full-stack development, and modern web technologies. It's designed for educational purposes and can be extended for real-world applications.
