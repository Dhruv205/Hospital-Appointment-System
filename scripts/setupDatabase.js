const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Helper to clean SQL queries (removes DELIMITER commands, USE, and CREATE DATABASE)
function cleanSQL(sqlText) {
    return sqlText
        // Remove DELIMITER declarations (they are client-only commands and throw syntax errors on server)
        .replace(/DELIMITER\s+\S+/gi, '')
        // Remove CREATE DATABASE statements (which cause permission errors on managed database hosts)
        .replace(/CREATE DATABASE\s+IF\s+NOT\s+EXISTS\s+\w+;/gi, '')
        .replace(/CREATE DATABASE\s+\w+;/gi, '')
        // Remove USE statements (so we stay in our selected database container)
        .replace(/USE\s+\w+;/gi, '')
        // Replace END$$ or similar custom delimiters with END;
        .replace(/END\$\$/g, 'END;')
        .replace(/END\s*\/\//g, 'END;');
}

async function setupDatabase() {
    let connection;
    
    try {
        console.log('🚀 Starting direct database setup...');
        
        const dbName = process.env.DB_NAME || 'hospital_appointment_system';
        console.log(`📦 Target Database Name: ${dbName}`);
        
        // Connect directly to target database with multipleStatements enabled
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: dbName,
            multipleStatements: true
        });

        console.log('✅ Connected to database successfully!');

        // 1. Read, Clean, and Execute schema file
        const schemaPath = path.join(__dirname, '..', 'database_schema.sql');
        const rawSchemaSQL = fs.readFileSync(schemaPath, 'utf8');
        const schemaSQL = cleanSQL(rawSchemaSQL);
        
        console.log('📄 Executing database schema & sample data...');
        await connection.query(schemaSQL);
        console.log('✅ Database schema and sample data created successfully!');

        // 2. Read, Clean, and Execute stored procedures
        const proceduresPath = path.join(__dirname, '..', 'stored_procedures.sql');
        const rawProceduresSQL = fs.readFileSync(proceduresPath, 'utf8');
        const proceduresSQL = cleanSQL(rawProceduresSQL);
        
        console.log('📄 Executing stored procedures...');
        await connection.query(proceduresSQL);
        console.log('✅ Stored procedures created successfully!');

        // 3. Read, Clean, and Execute triggers
        const triggersPath = path.join(__dirname, '..', 'triggers.sql');
        const rawTriggersSQL = fs.readFileSync(triggersPath, 'utf8');
        const triggersSQL = cleanSQL(rawTriggersSQL);
        
        console.log('📄 Executing triggers...');
        await connection.query(triggersSQL);
        console.log('✅ Triggers created successfully!');

        console.log('🎉 Database setup completed successfully!');
        
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

// Run setup if executed directly
if (require.main === module) {
    setupDatabase();
}

module.exports = setupDatabase;
