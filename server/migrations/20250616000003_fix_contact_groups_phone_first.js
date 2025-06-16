/**
 * Fix Contact Groups for Phone-First Contact System
 * Updates the contact_group_memberships table to work with phone/email identifiers
 * instead of user IDs, matching the phone-first contact book approach
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
async function up(knex) {
    console.log("🔧 Fixing Contact Groups for Phone-First System...");

    // Check if we need to update the contact_group_memberships table
    const hasContactPhoneColumn = await knex.schema.hasColumn('contact_group_memberships', 'contact_phone');
    
    if (!hasContactPhoneColumn) {
        console.log("📋 Updating contact_group_memberships table structure...");
        
        // Drop the existing table and recreate with correct structure
        await knex.schema.dropTableIfExists('contact_group_memberships');
        
        // Recreate with phone-first approach
        await knex.schema.createTable('contact_group_memberships', table => {
            table.increments('id').primary();
            table.integer('group_id').unsigned().notNullable().references('id').inTable('contact_groups').onDelete('CASCADE');
            
            // Phone-first contact identification
            table.string('contact_phone', 20); // Normalized phone number
            table.string('contact_email', 255); // Email address
            
            table.integer('added_by_user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.timestamps(true, true);
            
            // Ensure at least one contact method is provided
            table.check('contact_phone IS NOT NULL OR contact_email IS NOT NULL', 'contact_identifier_required');
            
            // Unique constraints to prevent duplicate memberships
            table.unique(['group_id', 'contact_phone'], 'unique_group_phone');
            table.unique(['group_id', 'contact_email'], 'unique_group_email');
            
            // Indexes for performance
            table.index('group_id', 'contact_memberships_group_idx');
            table.index('contact_phone', 'contact_memberships_phone_idx');
            table.index('contact_email', 'contact_memberships_email_idx');
            table.index('added_by_user_id', 'contact_memberships_added_by_idx');
        });
        
        console.log("✅ Updated contact_group_memberships table for phone-first system");
    }

    // Update contact_notes table to use phone/email identifiers
    const hasContactNotesPhoneColumn = await knex.schema.hasColumn('contact_notes', 'contact_phone');
    
    if (!hasContactNotesPhoneColumn) {
        console.log("📋 Updating contact_notes table structure...");
        
        // Drop and recreate contact_notes table
        await knex.schema.dropTableIfExists('contact_notes');
        
        await knex.schema.createTable('contact_notes', table => {
            table.increments('id').primary();
            
            // Phone-first contact identification
            table.string('contact_phone', 20); // Normalized phone number
            table.string('contact_email', 255); // Email address
            
            table.integer('created_by_user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.text('content').notNullable(); // Changed from 'note' to 'content'
            table.enu('type', ['general', 'communication', 'preference', 'important']).defaultTo('general');
            table.boolean('is_private').defaultTo(false);
            table.timestamps(true, true);
            
            // Ensure at least one contact method is provided
            table.check('contact_phone IS NOT NULL OR contact_email IS NOT NULL', 'contact_identifier_required');
            
            // Indexes
            table.index(['contact_phone', 'created_at'], 'contact_notes_phone_date_idx');
            table.index(['contact_email', 'created_at'], 'contact_notes_email_date_idx');
            table.index('created_by_user_id', 'contact_notes_created_by_idx');
            table.index('type', 'contact_notes_type_idx');
        });
        
        console.log("✅ Updated contact_notes table for phone-first system");
    }

    // Update contact_interactions table to use phone/email identifiers
    const hasContactInteractionsPhoneColumn = await knex.schema.hasColumn('contact_interactions', 'contact_phone');
    
    if (!hasContactInteractionsPhoneColumn) {
        console.log("📋 Updating contact_interactions table structure...");
        
        // Drop and recreate contact_interactions table
        await knex.schema.dropTableIfExists('contact_interactions');
        
        await knex.schema.createTable('contact_interactions', table => {
            table.increments('id').primary();
            
            // Phone-first contact identification
            table.string('contact_phone', 20); // Normalized phone number
            table.string('contact_email', 255); // Email address
            
            table.integer('initiated_by_user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.enu('interaction_type', ['email', 'sms', 'call', 'meeting', 'drop_signup', 'link_click', 'other']).notNullable();
            table.string('subject', 200);
            table.text('description');
            table.json('metadata'); // Store additional data like email IDs, drop IDs, etc.
            table.timestamp('interaction_date').defaultTo(knex.fn.now());
            table.timestamps(true, true);
            
            // Ensure at least one contact method is provided
            table.check('contact_phone IS NOT NULL OR contact_email IS NOT NULL', 'contact_identifier_required');
            
            // Indexes
            table.index(['contact_phone', 'interaction_date'], 'contact_interactions_phone_date_idx');
            table.index(['contact_email', 'interaction_date'], 'contact_interactions_email_date_idx');
            table.index('initiated_by_user_id', 'contact_interactions_initiated_by_idx');
            table.index('interaction_type', 'contact_interactions_type_idx');
            table.index('interaction_date', 'contact_interactions_date_idx');
        });
        
        console.log("✅ Updated contact_interactions table for phone-first system");
    }

    console.log("🎉 Contact Groups phone-first migration completed successfully!");
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
async function down(knex) {
    console.log("🗄️ Rolling back Contact Groups phone-first migration...");

    // This rollback would restore the original user_id based structure
    // For safety, we'll just drop the tables and let the original migration recreate them
    await knex.schema.dropTableIfExists('contact_interactions');
    await knex.schema.dropTableIfExists('contact_notes');
    await knex.schema.dropTableIfExists('contact_group_memberships');

    console.log("✅ Contact Groups phone-first migration rolled back");
}

module.exports = {
    up,
    down
};
