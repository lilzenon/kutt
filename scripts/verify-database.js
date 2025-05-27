#!/usr/bin/env node

/**
 * 🔍 DATABASE VERIFICATION SCRIPT
 *
 * This script checks if all required tables exist in the database
 * and creates them if they're missing.
 */

require('dotenv').config();

const knex = require('knex');
const models = require('../server/models');

async function verifyDatabase() {
    console.log('🔍 Database Verification Script');
    console.log('==============================');

    // Set minimal environment for verification
    if (!process.env.JWT_SECRET) {
        process.env.JWT_SECRET = "securekey";
    }

    // Only set required CRM env vars to avoid validation errors
    process.env.CRM_DB_HOST = process.env.CRM_DB_HOST || 'localhost';
    process.env.CRM_DB_NAME = process.env.CRM_DB_NAME || 'crm';
    process.env.CRM_DB_USER = process.env.CRM_DB_USER || 'user';
    process.env.CRM_DB_PASSWORD = process.env.CRM_DB_PASSWORD || 'password';

    // Use the same configuration as the main app
    const env = require('../server/env');

    const isSQLite = env.DB_CLIENT === "sqlite3" || env.DB_CLIENT === "better-sqlite3";

    const dbConfig = {
        client: env.DB_CLIENT,
        connection: {
            ...(isSQLite && { filename: env.DB_FILENAME }),
            host: env.DB_HOST,
            port: env.DB_PORT,
            database: env.DB_NAME,
            user: env.DB_USER,
            password: env.DB_PASSWORD,
            ssl: env.DB_SSL,
            pool: {
                min: env.DB_POOL_MIN || 0,
                max: env.DB_POOL_MAX || 10
            }
        },
        useNullAsDefault: true
    };

    console.log('📡 Database Configuration:');
    console.log(`   Client: ${dbConfig.client}`);
    console.log(`   Host: ${dbConfig.connection.host || 'N/A'}`);
    console.log(`   Database: ${dbConfig.connection.database || dbConfig.connection.filename}`);
    console.log(`   User: ${dbConfig.connection.user || 'N/A'}`);
    console.log(`   SSL: ${dbConfig.connection.ssl}`);
    console.log('');

    let db;

    try {
        // Create database connection
        console.log('🔌 Connecting to database...');
        db = knex(dbConfig);

        // Test connection
        await db.raw('SELECT 1');
        console.log('✅ Database connection successful');

        // Check required tables
        console.log('📋 Checking required tables...');

        const requiredTables = [
            'users',
            'domains',
            'hosts',
            'links',
            'visits',
            'ips',
            'drops',
            'drop_signups'
        ];

        const existingTables = [];
        const missingTables = [];

        for (const tableName of requiredTables) {
            const exists = await db.schema.hasTable(tableName);
            if (exists) {
                existingTables.push(tableName);
                console.log(`   ✅ ${tableName}`);
            } else {
                missingTables.push(tableName);
                console.log(`   ❌ ${tableName} (missing)`);
            }
        }

        console.log('');
        console.log(`📊 Table Status: ${existingTables.length}/${requiredTables.length} tables exist`);

        if (missingTables.length > 0) {
            console.log('🔧 Creating missing tables...');

            // Create missing tables
            for (const tableName of missingTables) {
                try {
                    switch (tableName) {
                        case 'drops':
                            console.log('   📝 Creating drops table...');
                            await models.createDropTable(db);
                            console.log('   ✅ drops table created');
                            break;
                        case 'drop_signups':
                            console.log('   📝 Creating drop_signups table...');
                            await models.createDropSignupTable(db);
                            console.log('   ✅ drop_signups table created');
                            break;
                        default:
                            console.log(`   ⚠️ Don't know how to create table: ${tableName}`);
                    }
                } catch (error) {
                    console.error(`   🚨 Failed to create ${tableName}:`, error.message);
                }
            }
        }

        // Verify drop_signups table structure
        console.log('🔍 Verifying drop_signups table structure...');
        const hasDropSignups = await db.schema.hasTable('drop_signups');

        if (hasDropSignups) {
            const columns = await db('drop_signups').columnInfo();
            console.log('   📋 drop_signups columns:');
            Object.keys(columns).forEach(col => {
                console.log(`      - ${col}: ${columns[col].type}`);
            });

            // Test insert/select
            console.log('🧪 Testing drop_signups operations...');

            // Check if we have any drops to test with
            const dropCount = await db('drops').count('id as count').first();
            console.log(`   📊 Found ${dropCount.count} drops in database`);

            if (parseInt(dropCount.count) > 0) {
                const testDrop = await db('drops').first();
                console.log(`   🎯 Testing with drop: ${testDrop.title} (${testDrop.slug})`);

                // Test signup creation (and cleanup)
                try {
                    const testSignup = {
                        drop_id: testDrop.id,
                        email: 'test@example.com',
                        name: 'Test User',
                        ip_address: '127.0.0.1',
                        user_agent: 'Test Agent',
                        created_at: new Date(),
                        updated_at: new Date()
                    };

                    // Insert test signup
                    const [signupId] = await db('drop_signups').insert(testSignup);
                    console.log(`   ✅ Test signup created with ID: ${signupId}`);

                    // Verify it exists
                    const createdSignup = await db('drop_signups').where('id', signupId).first();
                    console.log(`   ✅ Test signup verified: ${createdSignup.email}`);

                    // Clean up
                    await db('drop_signups').where('id', signupId).del();
                    console.log(`   🧹 Test signup cleaned up`);

                } catch (testError) {
                    console.error(`   🚨 Signup test failed:`, testError.message);
                }
            } else {
                console.log('   ⚠️ No drops found - cannot test signup operations');
            }
        } else {
            console.error('   🚨 drop_signups table still missing after creation attempt');
        }

        // Final status
        console.log('');
        console.log('🎉 Database Verification Complete!');
        console.log('==================================');

        if (missingTables.length === 0) {
            console.log('✅ All required tables exist');
            console.log('✅ Database is ready for drop signups');
        } else {
            console.log(`⚠️ ${missingTables.length} tables were missing but should now be created`);
            console.log('🔄 You may need to run migrations: npm run migrate');
        }

    } catch (error) {
        console.error('🚨 Database verification failed:', error);
        console.error('');
        console.error('🔧 Troubleshooting steps:');
        console.error('1. Check your database connection settings');
        console.error('2. Ensure the database server is running');
        console.error('3. Verify database credentials');
        console.error('4. Run migrations: npm run migrate');

        process.exit(1);
    } finally {
        if (db) {
            await db.destroy();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run verification
verifyDatabase()
    .then(() => {
        console.log('✅ Verification completed successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('🚨 Verification failed:', error);
        process.exit(1);
    });