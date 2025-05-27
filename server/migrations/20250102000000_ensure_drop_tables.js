const models = require("../models");

/**
 * 🔧 ENSURE DROP TABLES MIGRATION
 * 
 * This migration ensures that the drops and drop_signups tables exist.
 * It's safe to run multiple times and will only create tables if they don't exist.
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    console.log('🔧 Ensuring drop tables exist...');
    
    try {
        // Check if drops table exists
        const hasDropsTable = await knex.schema.hasTable("drops");
        if (!hasDropsTable) {
            console.log('📝 Creating drops table...');
            await models.createDropTable(knex);
            console.log('✅ drops table created');
        } else {
            console.log('✅ drops table already exists');
        }
        
        // Check if drop_signups table exists
        const hasDropSignupsTable = await knex.schema.hasTable("drop_signups");
        if (!hasDropSignupsTable) {
            console.log('📝 Creating drop_signups table...');
            await models.createDropSignupTable(knex);
            console.log('✅ drop_signups table created');
        } else {
            console.log('✅ drop_signups table already exists');
        }
        
        console.log('🎉 Drop tables verification complete');
        
    } catch (error) {
        console.error('🚨 Error ensuring drop tables:', error);
        throw error;
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    // Don't drop tables in down migration for safety
    console.log('⚠️ Down migration for drop tables skipped for safety');
    return Promise.resolve();
};
