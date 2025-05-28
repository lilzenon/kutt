/**
 * 🔔 COMPREHENSIVE NOTIFICATION SYSTEM MIGRATION
 * 
 * Industry-standard notification system with:
 * - Real-time delivery tracking
 * - User preference management
 * - Multi-channel support (email, SMS, push, in-app)
 * - GDPR compliance
 * - Rate limiting and throttling
 * - Delivery status tracking
 * - Template management
 * - Event-driven architecture
 * 
 * Based on research from:
 * - System Design Interview patterns
 * - Firebase/AWS notification services
 * - Enterprise notification platforms
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    console.log("🔔 Creating comprehensive notification system...");

    try {
        // 1. Notification Templates Table
        await knex.schema.createTable('notification_templates', table => {
            table.increments('id').primary();
            table.string('name', 100).notNullable().unique();
            table.string('type', 50).notNullable(); // email, sms, push, in_app
            table.string('category', 50).notNullable(); // marketing, transactional, system
            table.string('subject', 255).nullable(); // For email/push
            table.text('body_template').notNullable(); // Handlebars template
            table.text('html_template').nullable(); // For email
            table.jsonb('default_data').nullable(); // Default template variables
            table.jsonb('metadata').nullable(); // Additional template config
            table.boolean('is_active').defaultTo(true);
            table.string('created_by', 36).nullable();
            table.timestamps(true, true);
            
            // Indexes
            table.index(['type', 'category']);
            table.index('is_active');
        });

        // 2. User Notification Preferences Table
        await knex.schema.createTable('user_notification_preferences', table => {
            table.increments('id').primary();
            table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.string('notification_type', 50).notNullable(); // email, sms, push, in_app
            table.string('category', 50).notNullable(); // marketing, transactional, system
            table.boolean('enabled').defaultTo(true);
            table.jsonb('settings').nullable(); // Channel-specific settings
            table.string('timezone', 50).defaultTo('UTC');
            table.time('quiet_hours_start').nullable(); // Do not disturb period
            table.time('quiet_hours_end').nullable();
            table.integer('frequency_limit').nullable(); // Max notifications per day
            table.timestamps(true, true);
            
            // Unique constraint per user/type/category
            table.unique(['user_id', 'notification_type', 'category']);
            table.index('user_id');
        });

        // 3. Notifications Table (Main notification records)
        await knex.schema.createTable('notifications', table => {
            table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.integer('template_id').nullable().references('id').inTable('notification_templates');
            table.string('type', 50).notNullable(); // email, sms, push, in_app
            table.string('category', 50).notNullable(); // marketing, transactional, system
            table.string('priority', 20).defaultTo('normal'); // low, normal, high, urgent
            table.string('status', 30).defaultTo('pending'); // pending, sent, delivered, failed, cancelled
            table.string('title', 255).nullable();
            table.text('message').notNullable();
            table.text('html_content').nullable(); // For email
            table.jsonb('data').nullable(); // Template variables and metadata
            table.jsonb('delivery_config').nullable(); // Channel-specific delivery config
            table.timestamp('scheduled_at').nullable(); // For scheduled notifications
            table.timestamp('sent_at').nullable();
            table.timestamp('delivered_at').nullable();
            table.timestamp('read_at').nullable(); // For in-app notifications
            table.timestamp('expires_at').nullable(); // For temporary notifications
            table.string('external_id', 255).nullable(); // Third-party service ID (Twilio SID, etc.)
            table.text('error_message').nullable();
            table.integer('retry_count').defaultTo(0);
            table.timestamp('next_retry_at').nullable();
            table.timestamps(true, true);
            
            // Indexes for performance
            table.index(['user_id', 'status']);
            table.index(['type', 'status']);
            table.index(['category', 'status']);
            table.index('scheduled_at');
            table.index('created_at');
            table.index('priority');
        });

        // 4. Notification Events Table (Event tracking)
        await knex.schema.createTable('notification_events', table => {
            table.increments('id').primary();
            table.uuid('notification_id').notNullable().references('id').inTable('notifications').onDelete('CASCADE');
            table.string('event_type', 50).notNullable(); // created, sent, delivered, opened, clicked, failed
            table.jsonb('event_data').nullable(); // Event-specific data
            table.string('user_agent', 500).nullable();
            table.string('ip_address', 45).nullable();
            table.string('device_type', 50).nullable(); // mobile, desktop, tablet
            table.string('platform', 50).nullable(); // ios, android, web
            table.timestamp('event_timestamp').defaultTo(knex.fn.now());
            
            // Indexes
            table.index(['notification_id', 'event_type']);
            table.index('event_timestamp');
        });

        // 5. Notification Channels Table (Device/endpoint registration)
        await knex.schema.createTable('notification_channels', table => {
            table.increments('id').primary();
            table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.string('channel_type', 50).notNullable(); // push_ios, push_android, push_web, email, sms
            table.string('endpoint', 500).notNullable(); // Device token, email, phone, etc.
            table.jsonb('metadata').nullable(); // Channel-specific metadata
            table.boolean('is_active').defaultTo(true);
            table.boolean('is_verified').defaultTo(false);
            table.timestamp('verified_at').nullable();
            table.timestamp('last_used_at').nullable();
            table.timestamps(true, true);
            
            // Unique constraint per user/channel/endpoint
            table.unique(['user_id', 'channel_type', 'endpoint']);
            table.index(['user_id', 'is_active']);
        });

        // 6. Notification Rate Limits Table
        await knex.schema.createTable('notification_rate_limits', table => {
            table.increments('id').primary();
            table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.string('notification_type', 50).notNullable();
            table.string('category', 50).notNullable();
            table.integer('count').defaultTo(0);
            table.timestamp('window_start').notNullable();
            table.timestamp('window_end').notNullable();
            table.timestamps(true, true);
            
            // Unique constraint per user/type/category/window
            table.unique(['user_id', 'notification_type', 'category', 'window_start']);
            table.index(['user_id', 'window_end']);
        });

        // 7. Notification Subscriptions Table (Topic-based notifications)
        await knex.schema.createTable('notification_subscriptions', table => {
            table.increments('id').primary();
            table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.string('topic', 100).notNullable(); // drop_updates, marketing, system_alerts
            table.boolean('subscribed').defaultTo(true);
            table.jsonb('preferences').nullable(); // Topic-specific preferences
            table.timestamps(true, true);
            
            // Unique constraint per user/topic
            table.unique(['user_id', 'topic']);
            table.index('topic');
        });

        console.log("✅ Notification system tables created successfully!");
        console.log("📊 Created tables:");
        console.log("   - notification_templates (template management)");
        console.log("   - user_notification_preferences (user preferences)");
        console.log("   - notifications (main notification records)");
        console.log("   - notification_events (delivery tracking)");
        console.log("   - notification_channels (device registration)");
        console.log("   - notification_rate_limits (rate limiting)");
        console.log("   - notification_subscriptions (topic subscriptions)");

    } catch (error) {
        console.error("🚨 Notification system migration failed:", error);
        throw error;
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    console.log("🔄 Rolling back notification system...");

    try {
        // Drop tables in reverse dependency order
        const tables = [
            'notification_subscriptions',
            'notification_rate_limits',
            'notification_channels',
            'notification_events',
            'notifications',
            'user_notification_preferences',
            'notification_templates'
        ];

        for (const table of tables) {
            await knex.schema.dropTableIfExists(table);
            console.log(`🗑️ Dropped table: ${table}`);
        }

        console.log("✅ Notification system rollback completed");

    } catch (error) {
        console.error("🚨 Notification system rollback failed:", error);
        throw error;
    }
};
