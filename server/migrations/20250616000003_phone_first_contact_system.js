/**
 * Phone-First Contact System Migration
 * Updates contact book to use phone numbers as primary identifiers
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
async function up(knex) {
    console.log("📞 Implementing phone-first contact identification system...");

    // Check database type for conditional features
    const isMySQL = knex.client.config.client === 'mysql2' || knex.client.config.client === 'mysql';
    const ifNotExists = isMySQL ? 'IF NOT EXISTS' : '';

    // 1. Add phone number normalization and validation
    await knex.raw(`
        CREATE INDEX ${ifNotExists} drop_signups_phone_primary_idx 
        ON drop_signups (phone, email, created_at DESC);
    `);

    await knex.raw(`
        CREATE INDEX ${ifNotExists} drop_signups_email_secondary_idx 
        ON drop_signups (email, phone, created_at DESC) 
        WHERE phone IS NULL OR phone = '';
    `);

    // 2. Update contact group memberships to support both phone and email identifiers
    const hasContactGroupMembershipsTable = await knex.schema.hasTable('contact_group_memberships');
    if (hasContactGroupMembershipsTable) {
        // Check if we need to add new columns
        const hasContactPhoneColumn = await knex.schema.hasColumn('contact_group_memberships', 'contact_phone');
        const hasContactEmailColumn = await knex.schema.hasColumn('contact_group_memberships', 'contact_email');

        if (!hasContactPhoneColumn || !hasContactEmailColumn) {
            await knex.schema.alterTable('contact_group_memberships', table => {
                if (!hasContactPhoneColumn) {
                    table.string('contact_phone', 20);
                }
                if (!hasContactEmailColumn) {
                    table.string('contact_email', 255);
                }
                table.string('contact_identifier_type', 10).defaultTo('email'); // 'phone' or 'email'
            });

            // Migrate existing data to use email as identifier
            await knex('contact_group_memberships')
                .update({
                    contact_email: knex.ref('contact_user_id'),
                    contact_identifier_type: 'email'
                });

            console.log("✅ Updated contact_group_memberships with hybrid identifiers");
        }
    }

    // 3. Update contact notes to support both identifiers
    const hasContactNotesTable = await knex.schema.hasTable('contact_notes');
    if (hasContactNotesTable) {
        const hasContactPhoneColumn = await knex.schema.hasColumn('contact_notes', 'contact_phone');
        const hasContactEmailColumn = await knex.schema.hasColumn('contact_notes', 'contact_email');

        if (!hasContactPhoneColumn || !hasContactEmailColumn) {
            await knex.schema.alterTable('contact_notes', table => {
                if (!hasContactPhoneColumn) {
                    table.string('contact_phone', 20);
                }
                if (!hasContactEmailColumn) {
                    table.string('contact_email', 255);
                }
                table.string('contact_identifier_type', 10).defaultTo('email');
            });

            // Migrate existing data
            await knex('contact_notes')
                .update({
                    contact_email: knex.ref('contact_user_id'),
                    contact_identifier_type: 'email'
                });

            console.log("✅ Updated contact_notes with hybrid identifiers");
        }
    }

    // 4. Update contact interactions to support both identifiers
    const hasContactInteractionsTable = await knex.schema.hasTable('contact_interactions');
    if (hasContactInteractionsTable) {
        const hasContactPhoneColumn = await knex.schema.hasColumn('contact_interactions', 'contact_phone');
        const hasContactEmailColumn = await knex.schema.hasColumn('contact_interactions', 'contact_email');

        if (!hasContactPhoneColumn || !hasContactEmailColumn) {
            await knex.schema.alterTable('contact_interactions', table => {
                if (!hasContactPhoneColumn) {
                    table.string('contact_phone', 20);
                }
                if (!hasContactEmailColumn) {
                    table.string('contact_email', 255);
                }
                table.string('contact_identifier_type', 10).defaultTo('email');
            });

            // Migrate existing data
            await knex('contact_interactions')
                .update({
                    contact_email: knex.ref('contact_user_id'),
                    contact_identifier_type: 'email'
                });

            console.log("✅ Updated contact_interactions with hybrid identifiers");
        }
    }

    // 5. Create optimized indexes for phone-first contact lookup
    await knex.raw(`
        CREATE INDEX ${ifNotExists} contact_group_memberships_phone_idx 
        ON contact_group_memberships (contact_phone, group_id);
    `);

    await knex.raw(`
        CREATE INDEX ${ifNotExists} contact_group_memberships_email_idx 
        ON contact_group_memberships (contact_email, group_id);
    `);

    await knex.raw(`
        CREATE INDEX ${ifNotExists} contact_notes_phone_idx 
        ON contact_notes (contact_phone, created_at DESC);
    `);

    await knex.raw(`
        CREATE INDEX ${ifNotExists} contact_notes_email_idx 
        ON contact_notes (contact_email, created_at DESC);
    `);

    await knex.raw(`
        CREATE INDEX ${ifNotExists} contact_interactions_phone_idx 
        ON contact_interactions (contact_phone, interaction_date DESC);
    `);

    await knex.raw(`
        CREATE INDEX ${ifNotExists} contact_interactions_email_idx 
        ON contact_interactions (contact_email, interaction_date DESC);
    `);

    // 6. Create a function to normalize phone numbers (PostgreSQL only)
    if (!isMySQL) {
        await knex.raw(`
            CREATE OR REPLACE FUNCTION normalize_phone(phone_input TEXT)
            RETURNS TEXT AS $$
            BEGIN
                -- Remove all non-digit characters except +
                RETURN regexp_replace(COALESCE(phone_input, ''), '[^0-9+]', '', 'g');
            END;
            $$ LANGUAGE plpgsql IMMUTABLE;
        `);

        // Create an index using the normalization function
        await knex.raw(`
            CREATE INDEX ${ifNotExists} drop_signups_normalized_phone_idx 
            ON drop_signups (normalize_phone(phone));
        `);

        console.log("✅ Created phone normalization function and index");
    }

    // 7. Add composite indexes for efficient contact queries
    await knex.raw(`
        CREATE INDEX ${ifNotExists} drop_signups_contact_lookup_idx 
        ON drop_signups (
            COALESCE(phone, email), 
            created_at DESC, 
            drop_id
        );
    `);

    console.log("✅ Created phone-first contact identification indexes");
    console.log("🎉 Phone-first contact system migration completed successfully!");
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
async function down(knex) {
    console.log("📞 Rolling back phone-first contact system...");

    // Drop indexes
    await knex.raw(`DROP INDEX IF EXISTS drop_signups_phone_primary_idx;`);
    await knex.raw(`DROP INDEX IF EXISTS drop_signups_email_secondary_idx;`);
    await knex.raw(`DROP INDEX IF EXISTS contact_group_memberships_phone_idx;`);
    await knex.raw(`DROP INDEX IF EXISTS contact_group_memberships_email_idx;`);
    await knex.raw(`DROP INDEX IF EXISTS contact_notes_phone_idx;`);
    await knex.raw(`DROP INDEX IF EXISTS contact_notes_email_idx;`);
    await knex.raw(`DROP INDEX IF EXISTS contact_interactions_phone_idx;`);
    await knex.raw(`DROP INDEX IF EXISTS contact_interactions_email_idx;`);
    await knex.raw(`DROP INDEX IF EXISTS drop_signups_normalized_phone_idx;`);
    await knex.raw(`DROP INDEX IF EXISTS drop_signups_contact_lookup_idx;`);

    // Drop PostgreSQL function
    await knex.raw(`DROP FUNCTION IF EXISTS normalize_phone(TEXT);`);

    // Remove added columns from contact tables
    const tables = ['contact_group_memberships', 'contact_notes', 'contact_interactions'];
    
    for (const tableName of tables) {
        const hasTable = await knex.schema.hasTable(tableName);
        if (hasTable) {
            await knex.schema.alterTable(tableName, table => {
                table.dropColumn('contact_phone');
                table.dropColumn('contact_email');
                table.dropColumn('contact_identifier_type');
            });
        }
    }

    console.log("✅ Phone-first contact system rollback completed");
}

module.exports = {
    up,
    down
};
