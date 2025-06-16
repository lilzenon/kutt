const env = require("../env");

const isMySQL = env.DB_CLIENT === "mysql" || env.DB_CLIENT === "mysql2";

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
async function up(knex) {
    const ifNotExists = isMySQL ? "" : "IF NOT EXISTS";

    // Performance indexes for analytics queries
    await knex.raw(`
        CREATE INDEX ${ifNotExists} drops_user_id_active_created_idx 
        ON drops (user_id, is_active, created_at DESC);
    `);

    await knex.raw(`
        CREATE INDEX ${ifNotExists} drop_signups_drop_id_created_idx 
        ON drop_signups (drop_id, created_at DESC);
    `);

    await knex.raw(`
        CREATE INDEX ${ifNotExists} drop_signups_email_created_idx 
        ON drop_signups (email, created_at DESC);
    `);

    await knex.raw(`
        CREATE INDEX ${ifNotExists} links_user_id_visit_count_idx 
        ON links (user_id, visit_count DESC, created_at DESC);
    `);

    await knex.raw(`
        CREATE INDEX ${ifNotExists} visits_link_id_created_idx 
        ON visits (link_id, created_at DESC);
    `);

    // Composite index for fan analytics
    await knex.raw(`
        CREATE INDEX ${ifNotExists} drop_signups_user_analytics_idx
        ON drop_signups (drop_id, email, created_at DESC, referrer);
    `);

    // Search optimization indexes
    await knex.raw(`
        CREATE INDEX ${ifNotExists} drop_signups_search_idx
        ON drop_signups (email, name, phone);
    `);

    await knex.raw(`
        CREATE INDEX ${ifNotExists} drops_title_search_idx
        ON drops (title, description);
    `);

    // Full-text search indexes for PostgreSQL
    if (!isMySQL) {
        await knex.raw(`
            CREATE INDEX ${ifNotExists} drop_signups_fulltext_idx
            ON drop_signups USING gin(to_tsvector('english', coalesce(email, '') || ' ' || coalesce(name, '') || ' ' || coalesce(phone, '')));
        `);

        await knex.raw(`
            CREATE INDEX ${ifNotExists} drops_fulltext_idx
            ON drops USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));
        `);
    }

    console.log("✅ Created analytics performance and search indexes");
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
async function down(knex) {
    await knex.raw(`DROP INDEX IF EXISTS drops_user_id_active_created_idx;`);
    await knex.raw(`DROP INDEX IF EXISTS drop_signups_drop_id_created_idx;`);
    await knex.raw(`DROP INDEX IF EXISTS drop_signups_email_created_idx;`);
    await knex.raw(`DROP INDEX IF EXISTS links_user_id_visit_count_idx;`);
    await knex.raw(`DROP INDEX IF EXISTS visits_link_id_created_idx;`);
    await knex.raw(`DROP INDEX IF EXISTS drop_signups_user_analytics_idx;`);
    await knex.raw(`DROP INDEX IF EXISTS drop_signups_search_idx;`);
    await knex.raw(`DROP INDEX IF EXISTS drops_title_search_idx;`);
    await knex.raw(`DROP INDEX IF EXISTS drop_signups_fulltext_idx;`);
    await knex.raw(`DROP INDEX IF EXISTS drops_fulltext_idx;`);

    console.log("✅ Dropped analytics performance and search indexes");
}

module.exports = {
    up,
    down,
};