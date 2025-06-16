// Debug script to check database schema and data
const knexConfig = require('./knexfile.js');
const knex = require('knex')(knexConfig);

async function debugDatabase() {
    try {
        console.log('🔍 DEBUGGING DATABASE SCHEMA AND DATA');
        console.log('='.repeat(50));
        
        // Check if drops table exists
        console.log('\n1️⃣ Checking drops table schema...');
        const hasDropsTable = await knex.schema.hasTable('drops');
        console.log('Drops table exists:', hasDropsTable);
        
        if (hasDropsTable) {
            // Get table info
            const tableInfo = await knex('drops').columnInfo();
            console.log('\nDrops table columns:');
            Object.keys(tableInfo).forEach(column => {
                console.log(`  - ${column}: ${tableInfo[column].type}`);
            });
            
            // Check if overscroll_background_color column exists
            const hasOverscrollColumn = 'overscroll_background_color' in tableInfo;
            console.log('\noverscroll_background_color column exists:', hasOverscrollColumn);
            
            // Get sample data
            console.log('\n2️⃣ Checking sample drop data...');
            const drops = await knex('drops')
                .select('id', 'title', 'background_color', 'overscroll_background_color')
                .limit(5);
            
            console.log('Sample drops:');
            drops.forEach(drop => {
                console.log(`  ID: ${drop.id}, Title: "${drop.title}"`);
                console.log(`    Background: ${drop.background_color}`);
                console.log(`    Overscroll: ${drop.overscroll_background_color || 'NULL'}`);
            });
            
            // Check migration status
            console.log('\n3️⃣ Checking migration status...');
            const migrations = await knex('knex_migrations')
                .select('name', 'batch', 'migration_time')
                .orderBy('migration_time', 'desc')
                .limit(10);
            
            console.log('Recent migrations:');
            migrations.forEach(migration => {
                console.log(`  - ${migration.name} (batch ${migration.batch})`);
            });
            
            // Check if our migration ran
            const ourMigration = migrations.find(m => m.name.includes('add_overscroll_background_color'));
            console.log('\nOur overscroll migration status:', ourMigration ? 'APPLIED' : 'NOT FOUND');
        }
        
    } catch (error) {
        console.error('❌ Database debug error:', error.message);
    } finally {
        await knex.destroy();
        console.log('\n🏁 Database debug completed.');
    }
}

debugDatabase();
