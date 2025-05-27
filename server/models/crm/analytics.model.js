/**
 * 📊 ANALYTICS & EVENT TRACKING MODELS
 *
 * RESEARCH-BASED DESIGN:
 * - Event-driven architecture for real-time analytics
 * - Customer journey tracking
 * - Attribution modeling
 * - Cohort analysis support
 * - Revenue tracking and LTV calculation
 * - A/B testing framework
 * - GDPR-compliant event storage
 */

async function createEventTable(knex) {
    const hasTable = await knex.schema.hasTable("events");
    if (!hasTable) {
        await knex.schema.createTable("events", table => {
            // Primary identification
            table.increments("id").primary();
            table.uuid("uuid").notNullable().defaultTo(knex.fn.uuid()).unique();

            // Event identification
            table.string("event_name", 100).notNullable().index();
            table.string("event_category", 50).nullable().index();
            table.string("event_source", 50).notNullable().index(); // drop, sms, email, api, etc.

            // Entity relationships
            table.integer("contact_id").unsigned().nullable()
                .references("id").inTable("contacts").onDelete("SET NULL");
            table.string("session_id", 100).nullable().index();
            table.string("anonymous_id", 100).nullable().index(); // For pre-identification tracking

            // Event data
            table.jsonb("event_properties").nullable(); // Flexible event data
            table.jsonb("user_properties").nullable(); // User context at time of event
            table.decimal("revenue", 10, 2).nullable(); // For revenue events
            table.string("currency", 3).defaultTo("USD");

            // Attribution and source tracking
            table.integer("source_drop_id").nullable(); // Reference to drops table
            table.integer("source_campaign_id").nullable(); // SMS/Email campaign
            table.string("utm_source", 100).nullable();
            table.string("utm_medium", 100).nullable();
            table.string("utm_campaign", 100).nullable();
            table.string("utm_term", 100).nullable();
            table.string("utm_content", 100).nullable();

            // Technical context
            table.string("ip_address", 45).nullable();
            table.text("user_agent").nullable();
            table.string("referrer", 2040).nullable();
            table.string("page_url", 2040).nullable();
            table.string("page_title", 500).nullable();

            // Geographic data
            table.string("country", 2).nullable();
            table.string("region", 100).nullable();
            table.string("city", 100).nullable();
            table.string("timezone", 50).nullable();

            // Device and browser info
            table.string("device_type", 20).nullable(); // mobile, desktop, tablet
            table.string("browser", 50).nullable();
            table.string("os", 50).nullable();
            table.string("screen_resolution", 20).nullable();

            // Timing
            table.datetime("event_time").defaultTo(knex.fn.now()).index();
            table.bigInteger("event_timestamp").nullable(); // Unix timestamp for precise timing

            // Data quality and processing
            table.boolean("is_processed").defaultTo(false).index();
            table.datetime("processed_at").nullable();
            table.boolean("is_valid").defaultTo(true);
            table.text("validation_errors").nullable();

            // Privacy and compliance
            table.boolean("is_anonymized").defaultTo(false);
            table.datetime("anonymized_at").nullable();

            // System fields
            table.datetime("created_at").defaultTo(knex.fn.now());

            // Performance indexes
            table.index(["contact_id", "event_time"]);
            table.index(["event_name", "event_time"]);
            table.index(["event_source", "event_time"]);
            table.index(["source_drop_id", "event_time"]);
            table.index(["session_id", "event_time"]);
            table.index(["is_processed", "created_at"]);
        });

        console.log("✅ Created events table for comprehensive analytics");
    }
}

async function createCustomerJourneyTable(knex) {
    const hasTable = await knex.schema.hasTable("customer_journeys");
    if (!hasTable) {
        await knex.schema.createTable("customer_journeys", table => {
            table.increments("id").primary();
            table.uuid("uuid").notNullable().defaultTo(knex.fn.uuid());

            // Journey identification
            table.integer("contact_id").unsigned().notNullable()
                .references("id").inTable("contacts").onDelete("CASCADE");
            table.string("journey_name", 200).notNullable();
            table.string("journey_stage", 100).notNullable();

            // Journey progression
            table.integer("stage_order").notNullable();
            table.datetime("stage_entered_at").defaultTo(knex.fn.now());
            table.datetime("stage_exited_at").nullable();
            table.integer("time_in_stage_hours").nullable(); // Calculated field

            // Journey context
            table.integer("source_drop_id").nullable();
            table.integer("source_campaign_id").nullable();
            table.string("entry_point", 100).nullable(); // How they entered this journey

            // Conversion tracking
            table.boolean("is_conversion").defaultTo(false);
            table.decimal("conversion_value", 10, 2).nullable();
            table.string("conversion_type", 50).nullable();

            // System fields
            table.datetime("created_at").defaultTo(knex.fn.now());
            table.datetime("updated_at").defaultTo(knex.fn.now());

            // Indexes
            table.index(["contact_id", "stage_entered_at"]);
            table.index(["journey_name", "journey_stage"]);
            table.index(["source_drop_id"]);
            table.index(["is_conversion", "conversion_value"]);
        });

        console.log("✅ Created customer_journeys table");
    }
}

async function createCohortTable(knex) {
    const hasTable = await knex.schema.hasTable("cohorts");
    if (!hasTable) {
        await knex.schema.createTable("cohorts", table => {
            table.increments("id").primary();
            table.uuid("uuid").notNullable().defaultTo(knex.fn.uuid());

            // Cohort definition
            table.string("name", 200).notNullable();
            table.text("description").nullable();
            table.enu("cohort_type", [
                "acquisition", "behavioral", "demographic",
                "engagement", "revenue", "custom"
            ]).notNullable();

            // Cohort criteria
            table.jsonb("criteria").notNullable(); // Flexible criteria definition
            table.date("cohort_date").notNullable().index(); // Date this cohort was created
            table.integer("cohort_size").defaultTo(0);

            // Analysis periods
            table.enu("analysis_period", ["daily", "weekly", "monthly"]).defaultTo("weekly");
            table.integer("analysis_periods").defaultTo(12); // How many periods to track

            // Status
            table.boolean("is_active").defaultTo(true);
            table.datetime("last_calculated_at").nullable();

            // System fields
            table.datetime("created_at").defaultTo(knex.fn.now());
            table.datetime("updated_at").defaultTo(knex.fn.now());
            table.integer("created_by").nullable();

            // Indexes
            table.index(["cohort_type", "cohort_date"]);
            table.index(["is_active", "last_calculated_at"]);
        });

        console.log("✅ Created cohorts table");
    }
}

async function createCohortMembershipTable(knex) {
    const hasTable = await knex.schema.hasTable("cohort_memberships");
    if (!hasTable) {
        await knex.schema.createTable("cohort_memberships", table => {
            table.increments("id").primary();

            // Relationships
            table.integer("cohort_id").unsigned().notNullable()
                .references("id").inTable("cohorts").onDelete("CASCADE");
            table.integer("contact_id").unsigned().notNullable()
                .references("id").inTable("contacts").onDelete("CASCADE");

            // Membership details
            table.datetime("joined_at").defaultTo(knex.fn.now());
            table.datetime("left_at").nullable();
            table.boolean("is_active").defaultTo(true);

            // Performance tracking
            table.jsonb("period_data").nullable(); // Performance data by period
            table.decimal("lifetime_value", 10, 2).defaultTo(0);
            table.integer("total_events").defaultTo(0);
            table.datetime("last_activity").nullable();

            // System fields
            table.datetime("created_at").defaultTo(knex.fn.now());
            table.datetime("updated_at").defaultTo(knex.fn.now());

            // Indexes and constraints
            table.index(["cohort_id", "is_active"]);
            table.index(["contact_id", "joined_at"]);
            table.unique(["cohort_id", "contact_id"]);
        });

        console.log("✅ Created cohort_memberships table");
    }
}

async function createAttributionTable(knex) {
    const hasTable = await knex.schema.hasTable("attributions");
    if (!hasTable) {
        await knex.schema.createTable("attributions", table => {
            table.increments("id").primary();
            table.uuid("uuid").notNullable().defaultTo(knex.fn.uuid());

            // Attribution subject
            table.integer("contact_id").unsigned().notNullable()
                .references("id").inTable("contacts").onDelete("CASCADE");
            table.integer("conversion_event_id").unsigned().nullable()
                .references("id").inTable("events").onDelete("SET NULL");

            // Attribution model
            table.enu("attribution_model", [
                "first_touch", "last_touch", "linear", "time_decay",
                "position_based", "data_driven"
            ]).notNullable();

            // Attribution data
            table.integer("touchpoint_drop_id").nullable();
            table.integer("touchpoint_campaign_id").nullable();
            table.string("touchpoint_source", 100).nullable();
            table.string("touchpoint_medium", 100).nullable();
            table.string("touchpoint_campaign", 100).nullable();

            // Attribution weight and value
            table.decimal("attribution_weight", 5, 4).defaultTo(1.0); // 0.0 to 1.0
            table.decimal("attributed_revenue", 10, 2).defaultTo(0);
            table.datetime("touchpoint_time").notNullable();
            table.datetime("conversion_time").nullable();

            // Time to conversion
            table.integer("time_to_conversion_hours").nullable();
            table.integer("touchpoint_position").nullable(); // 1st, 2nd, 3rd touch, etc.
            table.integer("total_touchpoints").nullable();

            // System fields
            table.datetime("created_at").defaultTo(knex.fn.now());
            table.datetime("updated_at").defaultTo(knex.fn.now());

            // Indexes
            table.index(["contact_id", "conversion_time"]);
            table.index(["attribution_model", "touchpoint_time"]);
            table.index(["touchpoint_drop_id", "attributed_revenue"]);
            table.index(["touchpoint_campaign_id", "attributed_revenue"]);
        });

        console.log("✅ Created attributions table");
    }
}

async function createSegmentTable(knex) {
    const hasTable = await knex.schema.hasTable("segments");
    if (!hasTable) {
        await knex.schema.createTable("segments", table => {
            table.increments("id").primary();
            table.uuid("uuid").notNullable().defaultTo(knex.fn.uuid());

            // Segment definition
            table.string("name", 200).notNullable();
            table.text("description").nullable();
            table.enu("segment_type", ["static", "dynamic"]).defaultTo("dynamic");

            // Segment criteria (for dynamic segments)
            table.jsonb("criteria").nullable(); // Flexible criteria definition
            table.integer("contact_count").defaultTo(0);
            table.datetime("last_calculated_at").nullable();

            // Status and settings
            table.boolean("is_active").defaultTo(true);
            table.boolean("auto_refresh").defaultTo(true);
            table.integer("refresh_interval_hours").defaultTo(24);

            // System fields
            table.datetime("created_at").defaultTo(knex.fn.now());
            table.datetime("updated_at").defaultTo(knex.fn.now());
            table.integer("created_by").nullable();

            // Indexes
            table.index(["segment_type", "is_active"]);
            table.index(["auto_refresh", "last_calculated_at"]);
        });

        console.log("✅ Created segments table");
    }
}

async function createSegmentMembershipTable(knex) {
    const hasTable = await knex.schema.hasTable("segment_memberships");
    if (!hasTable) {
        await knex.schema.createTable("segment_memberships", table => {
            table.increments("id").primary();

            // Relationships
            table.integer("segment_id").unsigned().notNullable()
                .references("id").inTable("segments").onDelete("CASCADE");
            table.integer("contact_id").unsigned().notNullable()
                .references("id").inTable("contacts").onDelete("CASCADE");

            // Membership tracking
            table.datetime("added_at").defaultTo(knex.fn.now());
            table.datetime("removed_at").nullable();
            table.boolean("is_active").defaultTo(true);

            // System fields
            table.datetime("created_at").defaultTo(knex.fn.now());

            // Indexes and constraints
            table.index(["segment_id", "is_active"]);
            table.index(["contact_id", "is_active"]);
            table.unique(["segment_id", "contact_id"], {
                predicate: knex.where("is_active", true)
            });
        });

        console.log("✅ Created segment_memberships table");
    }
}

module.exports = {
    createEventTable,
    createCustomerJourneyTable,
    createCohortTable,
    createCohortMembershipTable,
    createAttributionTable,
    createSegmentTable,
    createSegmentMembershipTable
};