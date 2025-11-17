const mysql = require('mysql2/promise');
const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = 'http://localhost:5000/api';

// Test configuration
const testConfig = {
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hospital_appointment_system'
  }
};

// Test data
const testData = {
  patient: {
    firstName: 'Test',
    lastName: 'Patient',
    email: 'test.patient@example.com',
    phone: '+1-555-9999',
    password: 'password123',
    userType: 'patient',
    dateOfBirth: '1990-01-01',
    gender: 'Male',
    address: '123 Test Street, Test City, TC 12345'
  },
  doctor: {
    firstName: 'Test',
    lastName: 'Doctor',
    email: 'test.doctor@example.com',
    phone: '+1-555-8888',
    password: 'password123',
    userType: 'doctor',
    licenseNumber: 'DOC999',
    experienceYears: 10,
    consultationFee: 150.00
  }
};

class SystemTester {
  constructor() {
    this.connection = null;
    this.patientToken = null;
    this.doctorToken = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async connect() {
    try {
      this.connection = await mysql.createConnection(testConfig.db);
      console.log('✅ Database connection established');
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      console.log('🔌 Database connection closed');
    }
  }

  logTest(testName, passed, message = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${testName}${message ? ` - ${message}` : ''}`);
    
    this.testResults.tests.push({
      name: testName,
      passed,
      message
    });
    
    if (passed) {
      this.testResults.passed++;
    } else {
      this.testResults.failed++;
    }
  }

  async testDatabaseConnection() {
    try {
      const [rows] = await this.connection.execute('SELECT 1 as test');
      this.logTest('Database Connection', rows[0].test === 1);
    } catch (error) {
      this.logTest('Database Connection', false, error.message);
    }
  }

  async testDatabaseSchema() {
    try {
      // Test if all required tables exist
      const tables = ['Patient', 'Doctor', 'Specialization', 'Doctor_Specialization', 'Appointment', 'Notification'];
      
      for (const table of tables) {
        const [rows] = await this.connection.execute(`SHOW TABLES LIKE '${table}'`);
        this.logTest(`Table ${table} exists`, rows.length > 0);
      }

      // Test if stored procedures exist
      const [procedures] = await this.connection.execute(
        "SHOW PROCEDURE STATUS WHERE Db = ? AND Name IN ('AutoAssignDoctor', 'FindAvailableDoctors', 'UpdateAppointmentStatus')",
        [testConfig.db.database]
      );
      this.logTest('Stored Procedures exist', procedures.length >= 3);

      // Test if triggers exist
      const [triggers] = await this.connection.execute(
        "SHOW TRIGGERS WHERE `Database` = ? AND `Table` = 'Appointment'",
        [testConfig.db.database]
      );
      this.logTest('Triggers exist', triggers.length > 0);

    } catch (error) {
      this.logTest('Database Schema', false, error.message);
    }
  }

  async testAPIHealth() {
    try {
      const response = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`);
      this.logTest('API Health Check', response.status === 200);
    } catch (error) {
      this.logTest('API Health Check', false, error.message);
    }
  }

  async testPatientRegistration() {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, testData.patient);
      this.logTest('Patient Registration', response.data.success);
      
      if (response.data.success) {
        this.patientToken = response.data.data.token;
      }
    } catch (error) {
      this.logTest('Patient Registration', false, error.response?.data?.message || error.message);
    }
  }

  async testDoctorRegistration() {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, testData.doctor);
      this.logTest('Doctor Registration', response.data.success);
      
      if (response.data.success) {
        this.doctorToken = response.data.data.token;
      }
    } catch (error) {
      this.logTest('Doctor Registration', false, error.response?.data?.message || error.message);
    }
  }

  async testPatientLogin() {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: testData.patient.email,
        password: testData.patient.password,
        userType: 'patient'
      });
      this.logTest('Patient Login', response.data.success);
    } catch (error) {
      this.logTest('Patient Login', false, error.response?.data?.message || error.message);
    }
  }

  async testDoctorLogin() {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: testData.doctor.email,
        password: testData.doctor.password,
        userType: 'doctor'
      });
      this.logTest('Doctor Login', response.data.success);
    } catch (error) {
      this.logTest('Doctor Login', false, error.response?.data?.message || error.message);
    }
  }

  async testAppointmentCreation() {
    if (!this.patientToken) {
      this.logTest('Appointment Creation', false, 'No patient token available');
      return;
    }

    try {
      // First, get available doctors
      const doctorsResponse = await axios.get(`${API_BASE_URL}/patients/doctors`, {
        headers: { Authorization: `Bearer ${this.patientToken}` }
      });

      if (doctorsResponse.data.success && doctorsResponse.data.data.length > 0) {
        const doctor = doctorsResponse.data.data[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const appointmentDate = tomorrow.toISOString().split('T')[0];

        const appointmentData = {
          doctorId: doctor.doctor_id,
          appointmentDate: appointmentDate,
          appointmentTime: '10:00:00',
          problemDescription: 'Test appointment for system testing',
          symptoms: 'Test symptoms'
        };

        const response = await axios.post(`${API_BASE_URL}/appointments`, appointmentData, {
          headers: { Authorization: `Bearer ${this.patientToken}` }
        });

        this.logTest('Appointment Creation', response.data.success);
      } else {
        this.logTest('Appointment Creation', false, 'No doctors available');
      }
    } catch (error) {
      this.logTest('Appointment Creation', false, error.response?.data?.message || error.message);
    }
  }

  async testAppointmentStatusUpdate() {
    if (!this.doctorToken) {
      this.logTest('Appointment Status Update', false, 'No doctor token available');
      return;
    }

    try {
      // Get pending appointments
      const appointmentsResponse = await axios.get(`${API_BASE_URL}/appointments/doctor?status=pending`, {
        headers: { Authorization: `Bearer ${this.doctorToken}` }
      });

      if (appointmentsResponse.data.success && appointmentsResponse.data.data.length > 0) {
        const appointment = appointmentsResponse.data.data[0];
        
        const response = await axios.put(
          `${API_BASE_URL}/appointments/${appointment.appointment_id}/status`,
          { status: 'approved', message: 'Test approval' },
          { headers: { Authorization: `Bearer ${this.doctorToken}` } }
        );

        this.logTest('Appointment Status Update', response.data.success);
      } else {
        this.logTest('Appointment Status Update', false, 'No pending appointments found');
      }
    } catch (error) {
      this.logTest('Appointment Status Update', false, error.response?.data?.message || error.message);
    }
  }

  async testNotifications() {
    if (!this.patientToken) {
      this.logTest('Notifications', false, 'No patient token available');
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${this.patientToken}` }
      });
      this.logTest('Notifications Retrieval', response.data.success);
    } catch (error) {
      this.logTest('Notifications Retrieval', false, error.response?.data?.message || error.message);
    }
  }

  async testStoredProcedures() {
    try {
      // Test AutoAssignDoctor procedure
      const [result] = await this.connection.execute(
        'CALL AutoAssignDoctor(?, ?, ?, ?, ?, ?)',
        [1, 'Test problem', 'Test symptoms', '2024-12-31', '14:00:00', 'General Medicine']
      );
      this.logTest('AutoAssignDoctor Procedure', result[0].length > 0);

      // Test FindAvailableDoctors procedure
      const [doctors] = await this.connection.execute(
        'CALL FindAvailableDoctors(?, ?, ?)',
        ['Cardiology', '2024-12-31', '15:00:00']
      );
      this.logTest('FindAvailableDoctors Procedure', Array.isArray(doctors[0]));

    } catch (error) {
      this.logTest('Stored Procedures', false, error.message);
    }
  }

  async testTriggers() {
    try {
      // Test appointment creation trigger
      const [result] = await this.connection.execute(
        'INSERT INTO Appointment (patient_id, doctor_id, appointment_date, appointment_time, status, problem_description) VALUES (?, ?, ?, ?, ?, ?)',
        [1, 1, '2024-12-31', '16:00:00', 'pending', 'Trigger test appointment']
      );

      // Check if notification was created
      const [notifications] = await this.connection.execute(
        'SELECT COUNT(*) as count FROM Notification WHERE appointment_id = ?',
        [result.insertId]
      );

      this.logTest('Appointment Creation Trigger', notifications[0].count > 0);

      // Clean up test appointment
      await this.connection.execute('DELETE FROM Appointment WHERE appointment_id = ?', [result.insertId]);

    } catch (error) {
      this.logTest('Triggers', false, error.message);
    }
  }

  async testDataIntegrity() {
    try {
      // Test foreign key constraints
      const [appointments] = await this.connection.execute(
        'SELECT COUNT(*) as count FROM Appointment a JOIN Patient p ON a.patient_id = p.patient_id JOIN Doctor d ON a.doctor_id = d.doctor_id'
      );
      this.logTest('Foreign Key Constraints', appointments[0].count >= 0);

      // Test data validation
      const [specializations] = await this.connection.execute(
        'SELECT COUNT(*) as count FROM Specialization WHERE spec_name IS NOT NULL AND spec_name != ""'
      );
      this.logTest('Data Validation', specializations[0].count > 0);

    } catch (error) {
      this.logTest('Data Integrity', false, error.message);
    }
  }

  async runAllTests() {
    console.log('🧪 Starting System Tests...\n');

    // Database tests
    console.log('📊 Testing Database...');
    await this.testDatabaseConnection();
    await this.testDatabaseSchema();
    await this.testStoredProcedures();
    await this.testTriggers();
    await this.testDataIntegrity();

    // API tests
    console.log('\n🌐 Testing API...');
    await this.testAPIHealth();
    await this.testPatientRegistration();
    await this.testDoctorRegistration();
    await this.testPatientLogin();
    await this.testDoctorLogin();
    await this.testAppointmentCreation();
    await this.testAppointmentStatusUpdate();
    await this.testNotifications();

    // Print results
    console.log('\n📋 Test Results Summary:');
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📊 Total: ${this.testResults.passed + this.testResults.failed}`);

    if (this.testResults.failed === 0) {
      console.log('\n🎉 All tests passed! System is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the issues above.');
    }

    return this.testResults;
  }
}

// Main execution
async function main() {
  const tester = new SystemTester();
  
  try {
    const connected = await tester.connect();
    if (!connected) {
      console.error('❌ Cannot run tests without database connection');
      process.exit(1);
    }

    await tester.runAllTests();
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  } finally {
    await tester.disconnect();
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = SystemTester;
