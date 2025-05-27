/**
 * 🚀 CRM DATABASE MIGRATION - COMPREHENSIVE SYSTEM
 *
 * This migration creates a complete CRM database with:
 * - Contact management with GDPR compliance
 * - SMS marketing with Twilio integration
 * - Event tracking and analytics
 * - Customer journey mapping
 * - Segmentation and cohort analysis
 * - Attribution modeling
 *
 * ARCHITECTURE PRINCIPLES:
 * - Microservices ready (separate database)
 * - Event-driven design
 * - GDPR/CCPA compliant
 * - Scalable to millions of contacts
 * - Future-proof and extensible
 */

const contactModels = require("../../models/crm/contact.model");
const smsModels = require("../../models/crm/sms-campaign.model");
const analyticsModels = require("../../models/crm/analytics.model");

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    console.log("🚀 Starting CRM database migration...");

    try {
        // Phase 1: Core Contact Management
        console.log("📋 Phase 1: Creating contact management tables...");
        await contactModels.createContactTable(knex);
        await contactModels.createContactNotesTable(knex);
        await contactModels.createContactActivitiesTable(knex);

        // Phase 2: SMS Marketing System
        console.log("📱 Phase 2: Creating SMS marketing tables...");
        await smsModels.createSMSCampaignTable(knex);
        await smsModels.createSMSMessageTable(knex);
        await smsModels.createSMSOptOutTable(knex);
        await smsModels.createSMSTemplateTable(knex);

        // Phase 3: Analytics and Event Tracking
        console.log("📊 Phase 3: Creating analytics tables...");
        await analyticsModels.createEventTable(knex);
        await analyticsModels.createCustomerJourneyTable(knex);
        await analyticsModels.createCohortTable(knex);
        await analyticsModels.createCohortMembershipTable(knex);
        await analyticsModels.createAttributionTable(knex);
        await analyticsModels.createSegmentTable(knex);
        await analyticsModels.createSegmentMembershipTable(knex);

        // Phase 4: Create additional indexes for performance
        console.log("⚡ Phase 4: Creating performance indexes...");
        await createPerformanceIndexes(knex);

        // Phase 5: Create views for common queries
        console.log("👁️ Phase 5: Creating database views...");
        await createDatabaseViews(knex);

        console.log("✅ CRM database migration completed successfully!");
        console.log("📊 Created tables:");
        console.log("   - contacts (with GDPR compliance)");
        console.log("   - contact_notes");
        console.log("   - contact_activities");
        console.log("   - sms_campaigns");
        console.log("   - sms_messages");
        console.log("   - sms_opt_outs");
        console.log("   - sms_templates");
        console.log("   - events");
        console.log("   - customer_journeys");
        console.log("   - cohorts");
        console.log("   - cohort_memberships");
        console.log("   - attributions");
        console.log("   - segments");
        console.log("   - segment_memberships");

    } catch (error) {
        console.error("🚨 CRM database migration failed:", error);
        throw error;
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    console.log("🔄 Rolling back CRM database migration...");

    try {
        // Drop views first
        await knex.raw('DROP VIEW IF EXISTS contact_summary');
        await knex.raw('DROP VIEW IF EXISTS campaign_performance');
        await knex.raw('DROP VIEW IF EXISTS contact_engagement');

        // Drop tables in reverse dependency order
        const tables = [
            'segment_memberships',
            'segments',
            'attributions',
            'cohort_memberships',
            'cohorts',
            'customer_journeys',
            'events',
            'sms_templates',
            'sms_opt_outs',
            'sms_messages',
            'sms_campaigns',
            'contact_activities',
            'contact_notes',
            'contacts'
        ];

        for (const table of tables) {
            await knex.schema.dropTableIfExists(table);
            console.log(`🗑️ Dropped table: ${table}`);
        }

        console.log("✅ CRM database rollback completed");

    } catch (error) {
        console.error("🚨 CRM database rollback failed:", error);
        throw error;
    }
};

/**
 * Create additional performance indexes
 */
async function createPerformanceIndexes(knex) {
    // Composite indexes for common query patterns
    await knex.raw(`
        CREATE INDEX IF NOT EXISTS idx_contacts_email_opt_in_active
        ON contacts (email_opt_in, is_active, last_activity_date)
    `);

    await knex.raw(`
        CREATE INDEX IF NOT EXISTS idx_contacts_sms_opt_in_active
        ON contacts (sms_opt_in, is_active, last_activity_date)
    `);

    await knex.raw(`
        CREATE INDEX IF NOT EXISTS idx_events_contact_time
        ON events (contact_id, event_time DESC)
    `);

    await knex.raw(`
        CREATE INDEX IF NOT EXISTS idx_sms_messages_campaign_status
        ON sms_messages (campaign_id, status, created_at)
    `);

    // Partial indexes for active records
    await knex.raw(`
        CREATE INDEX IF NOT EXISTS idx_contacts_active_email
        ON contacts (email) WHERE is_active = true AND email IS NOT NULL
    `);

    await knex.raw(`
        CREATE INDEX IF NOT EXISTS idx_contacts_active_phone
        ON contacts (phone) WHERE is_active = true AND phone IS NOT NULL
    `);

    console.log("✅ Performance indexes created");
}

/**
 * Create database views for common queries
 */
async function createDatabaseViews(knex) {
    // Contact summary view
    await knex.raw(`
        CREATE OR REPLACE VIEW contact_summary AS
        SELECT
            c.id,
            c.uuid,
            c.email,
            c.phone,
            c.full_name,
            c.lifecycle_stage,
            c.lead_status,
            c.email_opt_in,
            c.sms_opt_in,
            c.last_activity_date,
            c.created_at,
            COUNT(DISTINCT ca.id) as activity_count,
            COUNT(DISTINCT sm.id) as sms_count,
            MAX(ca.activity_date) as last_activity,
            CASE
                WHEN c.last_activity_date > NOW() - INTERVAL '30 days' THEN 'active'
                WHEN c.last_activity_date > NOW() - INTERVAL '90 days' THEN 'inactive'
                ELSE 'dormant'
            END as engagement_status
        FROM contacts c
        LEFT JOIN contact_activities ca ON c.id = ca.contact_id
        LEFT JOIN sms_messages sm ON c.id = sm.contact_id
        WHERE c.is_active = true
        GROUP BY c.id, c.uuid, c.email, c.phone, c.full_name,
                 c.lifecycle_stage, c.lead_status, c.email_opt_in,
                 c.sms_opt_in, c.last_activity_date, c.created_at
    `);

    // Campaign performance view
    await knex.raw(`
        CREATE OR REPLACE VIEW campaign_performance AS
        SELECT
            sc.id,
            sc.uuid,
            sc.name,
            sc.campaign_type,
            sc.status,
            sc.messages_sent,
            sc.messages_delivered,
            sc.messages_failed,
            sc.replies_received,
            sc.opt_outs,
            sc.total_cost,
            CASE
                WHEN sc.messages_sent > 0
                THEN ROUND((sc.messages_delivered::decimal / sc.messages_sent) * 100, 2)
                ELSE 0
            END as delivery_rate,
            CASE
                WHEN sc.messages_delivered > 0
                THEN ROUND((sc.replies_received::decimal / sc.messages_delivered) * 100, 2)
                ELSE 0
            END as reply_rate,
            CASE
                WHEN sc.messages_sent > 0
                THEN ROUND(sc.total_cost / sc.messages_sent, 4)
                ELSE 0
            END as cost_per_message,
            sc.created_at,
            sc.started_at,
            sc.completed_at
        FROM sms_campaigns sc
    `);

    // Contact engagement view
    await knex.raw(`
        CREATE OR REPLACE VIEW contact_engagement AS
        SELECT
            c.id,
            c.uuid,
            c.email,
            c.phone,
            c.full_name,
            COUNT(DISTINCT e.id) as total_events,
            COUNT(DISTINCT CASE WHEN e.event_name = 'email_open' THEN e.id END) as email_opens,
            COUNT(DISTINCT CASE WHEN e.event_name = 'email_click' THEN e.id END) as email_clicks,
            COUNT(DISTINCT CASE WHEN e.event_name = 'sms_reply' THEN e.id END) as sms_replies,
            MAX(e.event_time) as last_event_time,
            CASE
                WHEN COUNT(DISTINCT e.id) >= 10 THEN 'high'
                WHEN COUNT(DISTINCT e.id) >= 3 THEN 'medium'
                WHEN COUNT(DISTINCT e.id) >= 1 THEN 'low'
                ELSE 'none'
            END as engagement_level
        FROM contacts c
        LEFT JOIN events e ON c.id = e.contact_id AND e.event_time > NOW() - INTERVAL '90 days'
        WHERE c.is_active = true
        GROUP BY c.id, c.uuid, c.email, c.phone, c.full_name
    `);

    console.log("✅ Database views created");
}