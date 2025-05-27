/**
 * 🎯 CONTACT MODEL - CORE CRM ENTITY
 *
 * RESEARCH-BASED DESIGN:
 * - Unified contact management (inspired by HubSpot, Salesforce)
 * - GDPR/CCPA compliant with consent tracking
 * - Phone number normalization for global SMS
 * - Deduplication and merge capabilities
 * - Lifecycle stage tracking
 * - Custom field extensibility
 */

async function createContactTable(knex) {
    const hasTable = await knex.schema.hasTable("contacts");
    if (!hasTable) {
        await knex.schema.createTable("contacts", table => {
            // Primary identification
            table.increments("id").primary();
            table.uuid("uuid").notNullable().defaultTo(knex.fn.uuid()).unique();

            // Core contact information
            table.string("email", 255).nullable().index();
            table.string("phone", 20).nullable().index(); // E.164 format
            table.string("phone_country_code", 5).nullable(); // ISO country code
            table.string("first_name", 100).nullable();
            table.string("last_name", 100).nullable();
            table.string("full_name", 200).nullable().index(); // Computed field
            table.string("company", 200).nullable();
            table.string("job_title", 150).nullable();

            // Contact preferences and status
            table.enu("lifecycle_stage", [
                "subscriber", "lead", "marketing_qualified_lead",
                "sales_qualified_lead", "opportunity", "customer",
                "evangelist", "other"
            ]).defaultTo("subscriber");

            table.enu("lead_status", [
                "new", "open", "in_progress", "open_deal",
                "unqualified", "attempted_to_contact", "connected",
                "bad_timing"
            ]).defaultTo("new");

            // Communication preferences
            table.boolean("email_opt_in").defaultTo(false);
            table.boolean("sms_opt_in").defaultTo(false);
            table.boolean("marketing_opt_in").defaultTo(false);
            table.datetime("email_opt_in_date").nullable();
            table.datetime("sms_opt_in_date").nullable();
            table.datetime("email_opt_out_date").nullable();
            table.datetime("sms_opt_out_date").nullable();

            // Verification status
            table.boolean("email_verified").defaultTo(false);
            table.boolean("phone_verified").defaultTo(false);
            table.datetime("email_verified_at").nullable();
            table.datetime("phone_verified_at").nullable();

            // Engagement tracking
            table.integer("email_opens").defaultTo(0);
            table.integer("email_clicks").defaultTo(0);
            table.integer("sms_replies").defaultTo(0);
            table.datetime("last_email_open").nullable();
            table.datetime("last_email_click").nullable();
            table.datetime("last_sms_reply").nullable();
            table.datetime("last_activity_date").nullable();

            // Source tracking
            table.string("source", 100).nullable(); // drop, manual, import, api
            table.integer("source_drop_id").nullable(); // Reference to drops table
            table.string("utm_source", 100).nullable();
            table.string("utm_medium", 100).nullable();
            table.string("utm_campaign", 100).nullable();
            table.string("utm_term", 100).nullable();
            table.string("utm_content", 100).nullable();

            // Geographic and device info
            table.string("country", 2).nullable(); // ISO country code
            table.string("state", 100).nullable();
            table.string("city", 100).nullable();
            table.string("timezone", 50).nullable();
            table.string("ip_address", 45).nullable();
            table.text("user_agent").nullable();

            // Custom fields (JSON for flexibility)
            table.jsonb("custom_fields").nullable();
            table.jsonb("tags").nullable(); // Array of tags

            // Data quality and deduplication
            table.integer("duplicate_of").nullable(); // Points to master contact
            table.boolean("is_duplicate").defaultTo(false);
            table.integer("merge_count").defaultTo(0); // How many contacts merged into this one
            table.float("data_quality_score").defaultTo(0); // 0-100 score

            // Privacy and compliance
            table.boolean("do_not_email").defaultTo(false);
            table.boolean("do_not_sms").defaultTo(false);
            table.boolean("do_not_call").defaultTo(false);
            table.datetime("gdpr_consent_date").nullable();
            table.string("gdpr_consent_source", 100).nullable();
            table.boolean("gdpr_right_to_be_forgotten").defaultTo(false);

            // System fields
            table.boolean("is_active").defaultTo(true);
            table.datetime("created_at").defaultTo(knex.fn.now());
            table.datetime("updated_at").defaultTo(knex.fn.now());
            table.integer("created_by").nullable(); // User ID from main database
            table.integer("updated_by").nullable(); // User ID from main database

            // Indexes for performance
            table.index(["email", "is_active"]);
            table.index(["phone", "is_active"]);
            table.index(["lifecycle_stage", "is_active"]);
            table.index(["source", "source_drop_id"]);
            table.index(["created_at"]);
            table.index(["last_activity_date"]);
            table.index(["email_opt_in", "is_active"]);
            table.index(["sms_opt_in", "is_active"]);

            // Unique constraints (simplified)
            table.unique(["email"]);
            table.unique(["phone"]);
        });

        console.log("✅ Created contacts table with comprehensive CRM schema");
    }
}

async function createContactNotesTable(knex) {
    const hasTable = await knex.schema.hasTable("contact_notes");
    if (!hasTable) {
        await knex.schema.createTable("contact_notes", table => {
            table.increments("id").primary();
            table.uuid("uuid").notNullable().defaultTo(knex.fn.uuid());

            table.integer("contact_id").unsigned().notNullable()
                .references("id").inTable("contacts").onDelete("CASCADE");

            table.text("content").notNullable();
            table.enu("type", ["note", "call", "meeting", "email", "sms", "task"]).defaultTo("note");
            table.boolean("is_pinned").defaultTo(false);

            table.datetime("created_at").defaultTo(knex.fn.now());
            table.datetime("updated_at").defaultTo(knex.fn.now());
            table.integer("created_by").nullable(); // User ID from main database

            table.index(["contact_id", "created_at"]);
            table.index(["type", "created_at"]);
        });

        console.log("✅ Created contact_notes table");
    }
}

async function createContactActivitiesTable(knex) {
    const hasTable = await knex.schema.hasTable("contact_activities");
    if (!hasTable) {
        await knex.schema.createTable("contact_activities", table => {
            table.increments("id").primary();
            table.uuid("uuid").notNullable().defaultTo(knex.fn.uuid());

            table.integer("contact_id").unsigned().notNullable()
                .references("id").inTable("contacts").onDelete("CASCADE");

            table.enu("activity_type", [
                "email_sent", "email_opened", "email_clicked", "email_bounced",
                "sms_sent", "sms_delivered", "sms_replied", "sms_failed",
                "drop_signup", "page_view", "form_submission",
                "call_made", "call_received", "meeting_scheduled",
                "note_added", "status_changed", "tag_added", "tag_removed"
            ]).notNullable();

            table.string("activity_source", 100).nullable(); // twilio, sendgrid, manual, etc.
            table.text("activity_description").nullable();
            table.jsonb("activity_data").nullable(); // Flexible data storage

            table.datetime("activity_date").defaultTo(knex.fn.now());
            table.integer("created_by").nullable(); // User ID from main database

            table.index(["contact_id", "activity_date"]);
            table.index(["activity_type", "activity_date"]);
            table.index(["activity_source", "activity_date"]);
        });

        console.log("✅ Created contact_activities table");
    }
}

module.exports = {
    createContactTable,
    createContactNotesTable,
    createContactActivitiesTable
};