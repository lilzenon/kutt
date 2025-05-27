#!/usr/bin/env node

/**
 * 🧪 CRM DATABASE CONNECTION TEST
 * 
 * Quick test to verify CRM database connectivity
 * and basic functionality before running full setup.
 */

require('dotenv').config();

// Set CRM database environment variables for testing
process.env.CRM_DB_CLIENT = 'pg';
process.env.CRM_DB_HOST = 'dpg-d0qvadbipnbc73eppoh0-a.virginia-postgres.render.com';
process.env.CRM_DB_PORT = '5432';
process.env.CRM_DB_NAME = 'b2b_crm';
process.env.CRM_DB_USER = 'b2b_admin';
process.env.CRM_DB_PASSWORD = 'acKb8qN3utIVlhDOTnZqmgehb7X04t0Q';
process.env.CRM_DB_SSL = 'true';

const knex = require('knex');

async function testCRMConnection() {
    console.log('🧪 Testing CRM Database Connection');
    console.log('==================================');
    
    const crmConfig = {
        client: 'pg',
        connection: {
            host: process.env.CRM_DB_HOST,
            port: parseInt(process.env.CRM_DB_PORT),
            database: process.env.CRM_DB_NAME,
            user: process.env.CRM_DB_USER,
            password: process.env.CRM_DB_PASSWORD,
            ssl: process.env.CRM_DB_SSL === 'true'
        },
        useNullAsDefault: true
    };
    
    console.log('📡 Connection Details:');
    console.log(`   Host: ${crmConfig.connection.host}`);
    console.log(`   Database: ${crmConfig.connection.database}`);
    console.log(`   User: ${crmConfig.connection.user}`);
    console.log(`   SSL: ${crmConfig.connection.ssl}`);
    console.log('');
    
    let db;
    
    try {
        // Create connection
        console.log('🔌 Connecting to database...');
        db = knex(crmConfig);
        
        // Test basic query
        console.log('🔍 Testing basic query...');
        const result = await db.raw('SELECT NOW() as current_time, version() as version');
        console.log('✅ Connection successful!');
        console.log(`   Time: ${result.rows[0].current_time}`);
        console.log(`   Version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
        
        // Check existing tables
        console.log('📋 Checking existing tables...');
        const tables = await db.raw(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);
        
        if (tables.rows.length > 0) {
            console.log('📊 Existing tables:');
            tables.rows.forEach(row => {
                console.log(`   - ${row.table_name}`);
            });
        } else {
            console.log('📊 No tables found (fresh database)');
        }
        
        // Test write permissions
        console.log('✏️ Testing write permissions...');
        try {
            await db.raw(`
                CREATE TABLE IF NOT EXISTS test_connection (
                    id SERIAL PRIMARY KEY,
                    test_data TEXT,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);
            
            await db.raw(`
                INSERT INTO test_connection (test_data) 
                VALUES ('Connection test successful')
            `);
            
            const testResult = await db.raw('SELECT * FROM test_connection LIMIT 1');
            console.log('✅ Write permissions confirmed');
            console.log(`   Test record: ${testResult.rows[0].test_data}`);
            
            // Clean up
            await db.raw('DROP TABLE test_connection');
            console.log('🧹 Cleaned up test table');
            
        } catch (writeError) {
            console.log('❌ Write permission test failed:', writeError.message);
        }
        
        console.log('');
        console.log('🎉 CRM Database Connection Test Complete!');
        console.log('=========================================');
        console.log('✅ Database is ready for CRM setup');
        console.log('');
        console.log('📋 Next steps:');
        console.log('1. Run: npm run setup:crm');
        console.log('2. Update your .env file with CRM credentials');
        console.log('3. Start integrating CRM with your application');
        
    } catch (error) {
        console.error('🚨 Connection test failed:', error.message);
        console.error('');
        console.error('🔧 Troubleshooting:');
        console.error('1. Check your database credentials');
        console.error('2. Ensure the database server is running');
        console.error('3. Verify network connectivity');
        console.error('4. Check SSL configuration');
        
        process.exit(1);
    } finally {
        if (db) {
            await db.destroy();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run test
testCRMConnection()
    .then(() => {
        console.log('✅ Test completed successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('🚨 Test failed:', error);
        process.exit(1);
    });
