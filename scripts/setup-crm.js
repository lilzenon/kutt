#!/usr/bin/env node

/**
 * 🚀 CRM DATABASE SETUP SCRIPT
 *
 * This script initializes the CRM database with all required tables,
 * indexes, and views. Run this after setting up your CRM database
 * on Render or any other PostgreSQL provider.
 *
 * Usage:
 *   node scripts/setup-crm.js
 *   npm run setup:crm
 */

const path = require('path');
const knex = require('knex');

// Load environment variables
require('dotenv').config();

// Set CRM database environment variables for setup
process.env.CRM_DB_CLIENT = 'pg';
process.env.CRM_DB_HOST = 'dpg-d0qvadbipnbc73eppoh0-a.virginia-postgres.render.com';
process.env.CRM_DB_PORT = '5432';
process.env.CRM_DB_NAME = 'b2b_crm';
process.env.CRM_DB_USER = 'b2b_admin';
process.env.CRM_DB_PASSWORD = 'acKb8qN3utIVlhDOTnZqmgehb7X04t0Q';
process.env.CRM_DB_SSL = 'true';

// Import CRM configuration
const crmConfig = require('../knexfile.crm.js');

console.log('🚀 CRM Database Setup Script');
console.log('============================');

async function setupCRM() {
    let crmDb;

    try {
        console.log('📡 Connecting to CRM database...');

        // Create database connection
        crmDb = knex(crmConfig);

        // Test connection
        await crmDb.raw('SELECT 1');
        console.log('✅ Connected to CRM database successfully');

        // Check if migrations table exists
        const hasMigrationsTable = await crmDb.schema.hasTable('knex_migrations_crm');
        if (!hasMigrationsTable) {
            console.log('📋 Creating migrations table...');
            await crmDb.schema.createTable('knex_migrations_crm', table => {
                table.increments('id').primary();
                table.string('name').notNullable();
                table.integer('batch').notNullable();
                table.timestamp('migration_time').defaultTo(crmDb.fn.now());
            });
        }

        // Run migrations
        console.log('🔄 Running CRM database migrations...');
        const [batchNo, log] = await crmDb.migrate.latest({
            directory: path.join(__dirname, '../server/migrations/crm'),
            tableName: 'knex_migrations_crm'
        });

        if (log.length === 0) {
            console.log('✅ Database is already up to date');
        } else {
            console.log(`✅ Ran ${log.length} migrations:`);
            log.forEach(migration => {
                console.log(`   - ${migration}`);
            });
        }

        // Verify tables were created
        console.log('🔍 Verifying table creation...');
        const tables = await crmDb.raw(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);

        const tableNames = tables.rows.map(row => row.table_name);
        const expectedTables = [
            'contacts',
            'contact_notes',
            'contact_activities',
            'sms_campaigns',
            'sms_messages',
            'sms_opt_outs',
            'sms_templates',
            'events',
            'customer_journeys',
            'cohorts',
            'cohort_memberships',
            'attributions',
            'segments',
            'segment_memberships'
        ];

        console.log('📊 Created tables:');
        expectedTables.forEach(tableName => {
            if (tableNames.includes(tableName)) {
                console.log(`   ✅ ${tableName}`);
            } else {
                console.log(`   ❌ ${tableName} (missing)`);
            }
        });

        // Check views
        console.log('👁️ Checking database views...');
        const views = await crmDb.raw(`
            SELECT table_name
            FROM information_schema.views
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        const viewNames = views.rows.map(row => row.table_name);
        const expectedViews = [
            'contact_summary',
            'campaign_performance',
            'contact_engagement'
        ];

        expectedViews.forEach(viewName => {
            if (viewNames.includes(viewName)) {
                console.log(`   ✅ ${viewName}`);
            } else {
                console.log(`   ❌ ${viewName} (missing)`);
            }
        });

        // Database statistics
        console.log('📈 Database statistics:');
        for (const tableName of expectedTables) {
            if (tableNames.includes(tableName)) {
                try {
                    const count = await crmDb(tableName).count('* as count').first();
                    console.log(`   📊 ${tableName}: ${count.count} records`);
                } catch (error) {
                    console.log(`   ⚠️ ${tableName}: Error getting count`);
                }
            }
        }

        // Test basic operations
        console.log('🧪 Testing basic operations...');

        // Test contact creation
        try {
            const testContact = {
                uuid: require('crypto').randomUUID(),
                email: 'test@example.com',
                first_name: 'Test',
                last_name: 'User',
                full_name: 'Test User',
                lifecycle_stage: 'subscriber',
                lead_status: 'new',
                email_opt_in: true,
                sms_opt_in: false,
                source: 'setup_script',
                is_active: true,
                created_at: new Date(),
                updated_at: new Date()
            };

            // Check if test contact already exists
            const existingContact = await crmDb('contacts')
                .where('email', testContact.email)
                .first();

            if (!existingContact) {
                const [contact] = await crmDb('contacts')
                    .insert(testContact)
                    .returning('*');
                console.log(`   ✅ Created test contact: ${contact.uuid}`);

                // Clean up test contact
                await crmDb('contacts').where('id', contact.id).del();
                console.log(`   🧹 Cleaned up test contact`);
            } else {
                console.log(`   ✅ Test contact operations verified (existing contact found)`);
            }

        } catch (error) {
            console.log(`   ❌ Contact operations test failed: ${error.message}`);
        }

        console.log('');
        console.log('🎉 CRM Database Setup Complete!');
        console.log('================================');
        console.log('');
        console.log('📋 Next Steps:');
        console.log('1. Update your .env file with CRM database credentials');
        console.log('2. Set up Twilio API credentials for SMS marketing');
        console.log('3. Configure event tracking in your application');
        console.log('4. Start collecting customer data from drop pages');
        console.log('');
        console.log('🔗 Database Connection Info:');
        console.log(`   Host: ${crmConfig.connection.host}`);
        console.log(`   Database: ${crmConfig.connection.database}`);
        console.log(`   User: ${crmConfig.connection.user}`);
        console.log(`   SSL: ${crmConfig.connection.ssl}`);
        console.log('');

    } catch (error) {
        console.error('🚨 CRM setup failed:', error);
        process.exit(1);
    } finally {
        if (crmDb) {
            await crmDb.destroy();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run setup if called directly
if (require.main === module) {
    setupCRM()
        .then(() => {
            console.log('✅ Setup completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('🚨 Setup failed:', error);
            process.exit(1);
        });
}

module.exports = { setupCRM };