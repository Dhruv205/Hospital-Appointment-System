const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
    let connection;
    
    try {
        console.log('🚀 Starting database setup...');
        
        // Connect to MySQL server (without specifying database)
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });

        console.log('✅ Connected to MySQL server');

        // Read and execute schema file
        const schemaPath = path.join(__dirname, '..', 'database_schema.sql');
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('📄 Reading database schema...');
        
        // Split SQL into individual statements
        const statements = schemaSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        console.log(`📝 Executing ${statements.length} SQL statements...`);

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.trim()) {
                try {
                    await connection.execute(statement);
                    console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`);
                } catch (error) {
                    console.warn(`⚠️  Statement ${i + 1} warning:`, error.message);
                }
            }
        }

        // Read and execute stored procedures
        const proceduresPath = path.join(__dirname, '..', 'stored_procedures.sql');
        const proceduresSQL = fs.readFileSync(proceduresPath, 'utf8');
        
        console.log('📄 Reading stored procedures...');
        
        const procedureStatements = proceduresSQL
            .split('//')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        console.log(`📝 Executing ${procedureStatements.length} stored procedure statements...`);

        for (let i = 0; i < procedureStatements.length; i++) {
            const statement = procedureStatements[i];
            if (statement.trim()) {
                try {
                    await connection.execute(statement);
                    console.log(`✅ Procedure statement ${i + 1}/${procedureStatements.length} executed successfully`);
                } catch (error) {
                    console.warn(`⚠️  Procedure statement ${i + 1} warning:`, error.message);
                }
            }
        }

        // Read and execute triggers
        const triggersPath = path.join(__dirname, '..', 'triggers.sql');
        const triggersSQL = fs.readFileSync(triggersPath, 'utf8');
        
        console.log('📄 Reading triggers...');
        
        const triggerStatements = triggersSQL
            .split('//')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        console.log(`📝 Executing ${triggerStatements.length} trigger statements...`);

        for (let i = 0; i < triggerStatements.length; i++) {
            const statement = triggerStatements[i];
            if (statement.trim()) {
                try {
                    await connection.execute(statement);
                    console.log(`✅ Trigger statement ${i + 1}/${triggerStatements.length} executed successfully`);
                } catch (error) {
                    console.warn(`⚠️  Trigger statement ${i + 1} warning:`, error.message);
                }
            }
        }

        console.log('🎉 Database setup completed successfully!');
        console.log('\n📊 Database Summary:');
        console.log('   - Database: hospital_appointment_system');
        console.log('   - Tables: Patient, Doctor, Specialization, Doctor_Specialization, Appointment, Notification');
        console.log('   - Stored Procedures: AutoAssignDoctor, FindAvailableDoctors, GetAppointmentStats, etc.');
        console.log('   - Triggers: Appointment status change notifications, audit logging, etc.');
        console.log('   - Sample data: 5 doctors, 5 patients, 5 appointments, 3 notifications');
        
        console.log('\n🔗 Next steps:');
        console.log('   1. Copy env.example to .env and update database credentials');
        console.log('   2. Run: npm install');
        console.log('   3. Run: npm start');
        console.log('   4. Access API at: http://localhost:5000/api');

    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    setupDatabase();
}

module.exports = setupDatabase;
