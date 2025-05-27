/**
 * 📱 SMS CAMPAIGN MODELS - TWILIO INTEGRATION READY
 * 
 * RESEARCH-BASED DESIGN:
 * - A2P 10DLC compliance (US regulations)
 * - TCPA compliance for SMS marketing
 * - Campaign performance tracking
 * - Automated drip campaigns
 * - Segmentation and targeting
 * - Delivery status tracking
 * - Opt-out management
 */

async function createSMSCampaignTable(knex) {
  const hasTable = await knex.schema.hasTable("sms_campaigns");
  if (!hasTable) {
    await knex.schema.createTable("sms_campaigns", table => {
      // Primary identification
      table.increments("id").primary();
      table.uuid("uuid").notNullable().defaultTo(knex.fn.uuid()).unique();
      
      // Campaign details
      table.string("name", 200).notNullable();
      table.text("description").nullable();
      table.enu("campaign_type", [
        "one_time", "drip_sequence", "automated_trigger", 
        "promotional", "transactional", "reminder"
      ]).notNullable();
      
      // Campaign status and scheduling
      table.enu("status", [
        "draft", "scheduled", "running", "paused", 
        "completed", "cancelled", "failed"
      ]).defaultTo("draft");
      
      table.datetime("scheduled_at").nullable();
      table.datetime("started_at").nullable();
      table.datetime("completed_at").nullable();
      
      // Message content
      table.text("message_content").notNullable();
      table.integer("message_length").nullable(); // Character count
      table.boolean("contains_links").defaultTo(false);
      table.boolean("contains_media").defaultTo(false);
      
      // Twilio configuration
      table.string("twilio_messaging_service_sid", 100).nullable();
      table.string("twilio_phone_number", 20).nullable();
      table.string("twilio_campaign_id", 100).nullable(); // A2P 10DLC
      
      // Targeting and segmentation
      table.jsonb("target_segments").nullable(); // Contact segments to target
      table.jsonb("target_tags").nullable(); // Contact tags to target
      table.integer("estimated_recipients").defaultTo(0);
      table.integer("actual_recipients").defaultTo(0);
      
      // Performance tracking
      table.integer("messages_sent").defaultTo(0);
      table.integer("messages_delivered").defaultTo(0);
      table.integer("messages_failed").defaultTo(0);
      table.integer("messages_bounced").defaultTo(0);
      table.integer("replies_received").defaultTo(0);
      table.integer("opt_outs").defaultTo(0);
      table.integer("clicks").defaultTo(0); // If message contains links
      
      // Cost tracking
      table.decimal("cost_per_message", 8, 4).nullable();
      table.decimal("total_cost", 10, 2).defaultTo(0);
      table.string("currency", 3).defaultTo("USD");
      
      // Compliance and legal
      table.boolean("tcpa_compliant").defaultTo(false);
      table.boolean("requires_opt_in").defaultTo(true);
      table.text("compliance_notes").nullable();
      
      // Drip campaign settings
      table.integer("sequence_position").nullable(); // For drip campaigns
      table.integer("delay_hours").nullable(); // Hours to wait before sending
      table.integer("parent_campaign_id").nullable(); // For sequence campaigns
      
      // System fields
      table.datetime("created_at").defaultTo(knex.fn.now());
      table.datetime("updated_at").defaultTo(knex.fn.now());
      table.integer("created_by").nullable(); // User ID from main database
      table.integer("updated_by").nullable();
      
      // Indexes
      table.index(["status", "scheduled_at"]);
      table.index(["campaign_type", "status"]);
      table.index(["created_by", "created_at"]);
      table.index(["parent_campaign_id"]);
      
      // Foreign key for sequence campaigns
      table.foreign("parent_campaign_id").references("id").inTable("sms_campaigns");
    });
    
    console.log("✅ Created sms_campaigns table");
  }
}

async function createSMSMessageTable(knex) {
  const hasTable = await knex.schema.hasTable("sms_messages");
  if (!hasTable) {
    await knex.schema.createTable("sms_messages", table => {
      // Primary identification
      table.increments("id").primary();
      table.uuid("uuid").notNullable().defaultTo(knex.fn.uuid()).unique();
      
      // Relationships
      table.integer("campaign_id").unsigned().nullable()
        .references("id").inTable("sms_campaigns").onDelete("SET NULL");
      table.integer("contact_id").unsigned().notNullable()
        .references("id").inTable("contacts").onDelete("CASCADE");
      
      // Message details
      table.text("message_content").notNullable();
      table.string("to_phone", 20).notNullable(); // E.164 format
      table.string("from_phone", 20).notNullable();
      
      // Twilio tracking
      table.string("twilio_message_sid", 100).nullable().unique();
      table.string("twilio_account_sid", 100).nullable();
      table.string("twilio_messaging_service_sid", 100).nullable();
      
      // Delivery status
      table.enu("status", [
        "queued", "sending", "sent", "delivered", 
        "undelivered", "failed", "received"
      ]).defaultTo("queued");
      
      table.enu("direction", ["inbound", "outbound"]).defaultTo("outbound");
      table.integer("error_code").nullable();
      table.text("error_message").nullable();
      
      // Timing
      table.datetime("scheduled_at").nullable();
      table.datetime("sent_at").nullable();
      table.datetime("delivered_at").nullable();
      table.datetime("failed_at").nullable();
      
      // Cost and billing
      table.decimal("cost", 8, 4).nullable();
      table.string("currency", 3).defaultTo("USD");
      
      // Engagement tracking
      table.boolean("contains_links").defaultTo(false);
      table.integer("link_clicks").defaultTo(0);
      table.boolean("reply_received").defaultTo(false);
      table.datetime("last_reply_at").nullable();
      
      // System fields
      table.datetime("created_at").defaultTo(knex.fn.now());
      table.datetime("updated_at").defaultTo(knex.fn.now());
      
      // Indexes for performance
      table.index(["campaign_id", "status"]);
      table.index(["contact_id", "created_at"]);
      table.index(["to_phone", "created_at"]);
      table.index(["status", "scheduled_at"]);
      table.index(["twilio_message_sid"]);
      table.index(["direction", "created_at"]);
    });
    
    console.log("✅ Created sms_messages table");
  }
}

async function createSMSOptOutTable(knex) {
  const hasTable = await knex.schema.hasTable("sms_opt_outs");
  if (!hasTable) {
    await knex.schema.createTable("sms_opt_outs", table => {
      table.increments("id").primary();
      table.uuid("uuid").notNullable().defaultTo(knex.fn.uuid());
      
      // Contact information
      table.integer("contact_id").unsigned().nullable()
        .references("id").inTable("contacts").onDelete("SET NULL");
      table.string("phone", 20).notNullable().index(); // E.164 format
      
      // Opt-out details
      table.enu("opt_out_type", ["STOP", "UNSUBSCRIBE", "MANUAL", "COMPLAINT"]).notNullable();
      table.text("opt_out_message").nullable(); // Original message that triggered opt-out
      table.string("opt_out_keyword", 50).nullable(); // STOP, QUIT, etc.
      
      // Source tracking
      table.integer("campaign_id").unsigned().nullable()
        .references("id").inTable("sms_campaigns").onDelete("SET NULL");
      table.integer("message_id").unsigned().nullable()
        .references("id").inTable("sms_messages").onDelete("SET NULL");
      
      // Compliance
      table.boolean("is_global_opt_out").defaultTo(true); // Applies to all campaigns
      table.datetime("opt_out_date").defaultTo(knex.fn.now());
      table.datetime("opt_in_date").nullable(); // If they opt back in
      table.boolean("is_active").defaultTo(true);
      
      // System fields
      table.datetime("created_at").defaultTo(knex.fn.now());
      table.datetime("updated_at").defaultTo(knex.fn.now());
      
      // Indexes
      table.index(["phone", "is_active"]);
      table.index(["contact_id", "is_active"]);
      table.index(["opt_out_date"]);
      table.index(["campaign_id"]);
      
      // Unique constraint to prevent duplicate opt-outs
      table.unique(["phone", "is_active"], { 
        predicate: knex.where("is_active", true) 
      });
    });
    
    console.log("✅ Created sms_opt_outs table");
  }
}

async function createSMSTemplateTable(knex) {
  const hasTable = await knex.schema.hasTable("sms_templates");
  if (!hasTable) {
    await knex.schema.createTable("sms_templates", table => {
      table.increments("id").primary();
      table.uuid("uuid").notNullable().defaultTo(knex.fn.uuid());
      
      // Template details
      table.string("name", 200).notNullable();
      table.text("description").nullable();
      table.text("content").notNullable();
      table.enu("category", [
        "welcome", "promotional", "reminder", "follow_up", 
        "abandoned_cart", "event", "survey", "general"
      ]).defaultTo("general");
      
      // Template variables
      table.jsonb("variables").nullable(); // Available merge tags
      table.boolean("contains_personalization").defaultTo(false);
      
      // Usage tracking
      table.integer("usage_count").defaultTo(0);
      table.datetime("last_used_at").nullable();
      
      // Status
      table.boolean("is_active").defaultTo(true);
      table.boolean("is_approved").defaultTo(false); // For compliance review
      
      // System fields
      table.datetime("created_at").defaultTo(knex.fn.now());
      table.datetime("updated_at").defaultTo(knex.fn.now());
      table.integer("created_by").nullable();
      
      // Indexes
      table.index(["category", "is_active"]);
      table.index(["is_active", "usage_count"]);
      table.index(["created_by"]);
    });
    
    console.log("✅ Created sms_templates table");
  }
}

module.exports = {
  createSMSCampaignTable,
  createSMSMessageTable,
  createSMSOptOutTable,
  createSMSTemplateTable
};
