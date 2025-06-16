/**
 * Contact Book Database Migration
 * Creates tables and indexes for comprehensive contact management
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
async function up(knex) {
    console.log("🗄️ Creating Contact Book tables and indexes...");

    // Check database type for conditional features
    const isMySQL = knex.client.config.client === 'mysql2' || knex.client.config.client === 'mysql';
    const ifNotExists = isMySQL ? 'IF NOT EXISTS' : '';

    // 1. Contact Groups Table
    const hasContactGroupsTable = await knex.schema.hasTable('contact_groups');
    if (!hasContactGroupsTable) {
        await knex.schema.createTable('contact_groups', table => {
            table.increments('id').primary();
            table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.string('name', 100).notNullable();
            table.text('description');
            table.string('color', 7).defaultTo('#3b82f6'); // Hex color for UI
            table.integer('contact_count').defaultTo(0);
            table.timestamps(true, true);
            
            // Indexes
            table.index(['user_id', 'name'], 'contact_groups_user_name_idx');
            table.index('user_id', 'contact_groups_user_idx');
        });
        console.log("✅ Created contact_groups table");
    }

    // 2. Contact Group Memberships Table (Many-to-Many)
    const hasContactGroupMembershipsTable = await knex.schema.hasTable('contact_group_memberships');
    if (!hasContactGroupMembershipsTable) {
        await knex.schema.createTable('contact_group_memberships', table => {
            table.increments('id').primary();
            table.integer('group_id').unsigned().notNullable().references('id').inTable('contact_groups').onDelete('CASCADE');
            table.integer('contact_user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.integer('added_by_user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.timestamps(true, true);
            
            // Unique constraint to prevent duplicate memberships
            table.unique(['group_id', 'contact_user_id'], 'unique_group_contact');
            
            // Indexes
            table.index('group_id', 'contact_memberships_group_idx');
            table.index('contact_user_id', 'contact_memberships_contact_idx');
            table.index('added_by_user_id', 'contact_memberships_added_by_idx');
        });
        console.log("✅ Created contact_group_memberships table");
    }

    // 3. Contact Notes Table
    const hasContactNotesTable = await knex.schema.hasTable('contact_notes');
    if (!hasContactNotesTable) {
        await knex.schema.createTable('contact_notes', table => {
            table.increments('id').primary();
            table.integer('contact_user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.integer('created_by_user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.text('note').notNullable();
            table.enu('type', ['general', 'communication', 'preference', 'important']).defaultTo('general');
            table.boolean('is_private').defaultTo(false);
            table.timestamps(true, true);
            
            // Indexes
            table.index(['contact_user_id', 'created_at'], 'contact_notes_contact_date_idx');
            table.index('created_by_user_id', 'contact_notes_created_by_idx');
            table.index('type', 'contact_notes_type_idx');
        });
        console.log("✅ Created contact_notes table");
    }

    // 4. Contact Interactions Table (for tracking communication history)
    const hasContactInteractionsTable = await knex.schema.hasTable('contact_interactions');
    if (!hasContactInteractionsTable) {
        await knex.schema.createTable('contact_interactions', table => {
            table.increments('id').primary();
            table.integer('contact_user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.integer('initiated_by_user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.enu('interaction_type', ['email', 'sms', 'call', 'meeting', 'drop_signup', 'link_click', 'other']).notNullable();
            table.string('subject', 200);
            table.text('description');
            table.json('metadata'); // Store additional data like email IDs, drop IDs, etc.
            table.timestamp('interaction_date').defaultTo(knex.fn.now());
            table.timestamps(true, true);
            
            // Indexes
            table.index(['contact_user_id', 'interaction_date'], 'contact_interactions_contact_date_idx');
            table.index('initiated_by_user_id', 'contact_interactions_initiated_by_idx');
            table.index('interaction_type', 'contact_interactions_type_idx');
            table.index('interaction_date', 'contact_interactions_date_idx');
        });
        console.log("✅ Created contact_interactions table");
    }

    // 5. Enhanced User Profile Data (extend existing users table)
    const hasLocationColumn = await knex.schema.hasColumn('users', 'location_data');
    if (!hasLocationColumn) {
        await knex.schema.alterTable('users', table => {
            table.json('location_data'); // Store city, state, country, timezone, etc.
            table.string('acquisition_channel', 50); // How they found the platform
            table.timestamp('last_activity_at');
            table.integer('total_drop_signups').defaultTo(0);
            table.integer('total_link_clicks').defaultTo(0);
            table.decimal('engagement_score', 5, 2).defaultTo(0); // 0-100 engagement score
            table.json('preferences'); // User preferences and settings
            table.text('bio'); // User bio/description
            table.string('website', 255);
            table.string('social_links', 1000); // JSON string of social media links
        });
        console.log("✅ Enhanced users table with contact book fields");
    }

    // 6. Contact Book Search Indexes
    await knex.raw(`
        CREATE INDEX ${ifNotExists} users_contact_search_idx 
        ON users (email, first_name, last_name, phone, company);
    `);

    await knex.raw(`
        CREATE INDEX ${ifNotExists} users_activity_idx 
        ON users (last_activity_at DESC, total_drop_signups DESC, engagement_score DESC);
    `);

    await knex.raw(`
        CREATE INDEX ${ifNotExists} users_acquisition_idx 
        ON users (acquisition_channel, created_at DESC);
    `);

    // PostgreSQL Full-text search indexes
    if (!isMySQL) {
        await knex.raw(`
            CREATE INDEX ${ifNotExists} users_fulltext_search_idx 
            ON users USING gin(to_tsvector('english', 
                coalesce(email, '') || ' ' || 
                coalesce(first_name, '') || ' ' || 
                coalesce(last_name, '') || ' ' || 
                coalesce(phone, '') || ' ' || 
                coalesce(company, '') || ' ' || 
                coalesce(bio, '')
            ));
        `);

        await knex.raw(`
            CREATE INDEX ${ifNotExists} contact_notes_fulltext_idx 
            ON contact_notes USING gin(to_tsvector('english', note));
        `);
    }

    // 7. Contact Book Performance Indexes
    await knex.raw(`
        CREATE INDEX ${ifNotExists} drop_signups_contact_analytics_idx 
        ON drop_signups (email, created_at DESC, drop_id);
    `);

    await knex.raw(`
        CREATE INDEX ${ifNotExists} visits_contact_analytics_idx 
        ON visits (created_at DESC, link_id);
    `);

    console.log("✅ Created Contact Book performance indexes");
    console.log("🎉 Contact Book database migration completed successfully!");
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
async function down(knex) {
    console.log("🗄️ Rolling back Contact Book migration...");

    // Drop indexes first
    await knex.raw(`DROP INDEX IF EXISTS users_contact_search_idx;`);
    await knex.raw(`DROP INDEX IF EXISTS users_activity_idx;`);
    await knex.raw(`DROP INDEX IF EXISTS users_acquisition_idx;`);
    await knex.raw(`DROP INDEX IF EXISTS users_fulltext_search_idx;`);
    await knex.raw(`DROP INDEX IF EXISTS contact_notes_fulltext_idx;`);
    await knex.raw(`DROP INDEX IF EXISTS drop_signups_contact_analytics_idx;`);
    await knex.raw(`DROP INDEX IF EXISTS visits_contact_analytics_idx;`);

    // Drop tables in reverse order (respecting foreign key constraints)
    await knex.schema.dropTableIfExists('contact_interactions');
    await knex.schema.dropTableIfExists('contact_notes');
    await knex.schema.dropTableIfExists('contact_group_memberships');
    await knex.schema.dropTableIfExists('contact_groups');

    // Remove added columns from users table
    const hasLocationColumn = await knex.schema.hasColumn('users', 'location_data');
    if (hasLocationColumn) {
        await knex.schema.alterTable('users', table => {
            table.dropColumn('location_data');
            table.dropColumn('acquisition_channel');
            table.dropColumn('last_activity_at');
            table.dropColumn('total_drop_signups');
            table.dropColumn('total_link_clicks');
            table.dropColumn('engagement_score');
            table.dropColumn('preferences');
            table.dropColumn('bio');
            table.dropColumn('website');
            table.dropColumn('social_links');
        });
    }

    console.log("✅ Contact Book migration rolled back successfully");
}

module.exports = {
    up,
    down
};
