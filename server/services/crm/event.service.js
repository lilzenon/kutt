const { crmDb } = require("../../config/crm-database");
const { generateUUID } = require("../../utils/crm-utils");

/**
 * 📊 EVENT SERVICE - ANALYTICS & TRACKING
 * 
 * FEATURES:
 * - Event tracking for all customer interactions
 * - Real-time analytics data collection
 * - Customer journey mapping
 * - Attribution tracking
 * - Performance monitoring
 * - GDPR-compliant event storage
 */

class EventService {
    /**
     * Track a single event
     */
    async trackEvent(eventData) {
        try {
            // Validate required fields
            if (!eventData.event_name) {
                throw new Error("Event name is required");
            }

            // Prepare event data
            const event = {
                uuid: generateUUID(),
                event_name: eventData.event_name,
                event_category: eventData.event_category || 'general',
                event_source: eventData.event_source || 'system',
                contact_id: eventData.contact_id || null,
                session_id: eventData.session_id || null,
                anonymous_id: eventData.anonymous_id || null,
                event_properties: eventData.event_properties ? JSON.stringify(eventData.event_properties) : null,
                user_properties: eventData.user_properties ? JSON.stringify(eventData.user_properties) : null,
                revenue: eventData.revenue || null,
                currency: eventData.currency || 'USD',
                source_drop_id: eventData.source_drop_id || null,
                source_campaign_id: eventData.source_campaign_id || null,
                utm_source: eventData.utm_source || null,
                utm_medium: eventData.utm_medium || null,
                utm_campaign: eventData.utm_campaign || null,
                utm_term: eventData.utm_term || null,
                utm_content: eventData.utm_content || null,
                ip_address: eventData.ip_address || null,
                user_agent: eventData.user_agent || null,
                referrer: eventData.referrer || null,
                page_url: eventData.page_url || null,
                page_title: eventData.page_title || null,
                country: eventData.country || null,
                region: eventData.region || null,
                city: eventData.city || null,
                timezone: eventData.timezone || null,
                device_type: eventData.device_type || null,
                browser: eventData.browser || null,
                os: eventData.os || null,
                screen_resolution: eventData.screen_resolution || null,
                event_time: eventData.event_time || new Date(),
                event_timestamp: eventData.event_timestamp || Date.now(),
                is_processed: false,
                is_valid: true,
                is_anonymized: false,
                created_at: new Date()
            };

            // Insert event
            const [insertedEvent] = await crmDb("events").insert(event).returning("*");
            
            // Update contact last activity if contact_id provided
            if (event.contact_id) {
                await this.updateContactLastActivity(event.contact_id, event.event_time);
            }

            console.log(`📊 Event tracked: ${event.event_name} (${insertedEvent.uuid})`);
            return insertedEvent;
            
        } catch (error) {
            console.error("🚨 Error tracking event:", error);
            throw error;
        }
    }

    /**
     * Track multiple events in batch
     */
    async trackEvents(eventsData) {
        try {
            const events = eventsData.map(eventData => ({
                uuid: generateUUID(),
                event_name: eventData.event_name,
                event_category: eventData.event_category || 'general',
                event_source: eventData.event_source || 'system',
                contact_id: eventData.contact_id || null,
                session_id: eventData.session_id || null,
                anonymous_id: eventData.anonymous_id || null,
                event_properties: eventData.event_properties ? JSON.stringify(eventData.event_properties) : null,
                user_properties: eventData.user_properties ? JSON.stringify(eventData.user_properties) : null,
                revenue: eventData.revenue || null,
                currency: eventData.currency || 'USD',
                source_drop_id: eventData.source_drop_id || null,
                source_campaign_id: eventData.source_campaign_id || null,
                utm_source: eventData.utm_source || null,
                utm_medium: eventData.utm_medium || null,
                utm_campaign: eventData.utm_campaign || null,
                utm_term: eventData.utm_term || null,
                utm_content: eventData.utm_content || null,
                ip_address: eventData.ip_address || null,
                user_agent: eventData.user_agent || null,
                referrer: eventData.referrer || null,
                page_url: eventData.page_url || null,
                page_title: eventData.page_title || null,
                country: eventData.country || null,
                region: eventData.region || null,
                city: eventData.city || null,
                timezone: eventData.timezone || null,
                device_type: eventData.device_type || null,
                browser: eventData.browser || null,
                os: eventData.os || null,
                screen_resolution: eventData.screen_resolution || null,
                event_time: eventData.event_time || new Date(),
                event_timestamp: eventData.event_timestamp || Date.now(),
                is_processed: false,
                is_valid: true,
                is_anonymized: false,
                created_at: new Date()
            }));

            // Batch insert events
            const insertedEvents = await crmDb.batchInsert("events", events, 1000);
            
            console.log(`📊 Batch tracked ${events.length} events`);
            return insertedEvents;
            
        } catch (error) {
            console.error("🚨 Error batch tracking events:", error);
            throw error;
        }
    }

    /**
     * Update contact last activity date
     */
    async updateContactLastActivity(contactId, activityDate = new Date()) {
        try {
            await crmDb("contacts")
                .where("id", contactId)
                .update({
                    last_activity_date: activityDate,
                    updated_at: new Date()
                });
        } catch (error) {
            console.error("🚨 Error updating contact last activity:", error);
            // Don't throw error as this is a secondary operation
        }
    }

    /**
     * Get events for a contact
     */
    async getContactEvents(contactId, limit = 100, offset = 0) {
        try {
            return await crmDb("events")
                .where("contact_id", contactId)
                .orderBy("event_time", "desc")
                .limit(limit)
                .offset(offset);
        } catch (error) {
            console.error("🚨 Error getting contact events:", error);
            throw error;
        }
    }

    /**
     * Get events by type
     */
    async getEventsByType(eventName, startDate = null, endDate = null, limit = 1000) {
        try {
            let query = crmDb("events")
                .where("event_name", eventName)
                .orderBy("event_time", "desc");

            if (startDate) {
                query = query.where("event_time", ">=", startDate);
            }

            if (endDate) {
                query = query.where("event_time", "<=", endDate);
            }

            return await query.limit(limit);
        } catch (error) {
            console.error("🚨 Error getting events by type:", error);
            throw error;
        }
    }

    /**
     * Get event analytics summary
     */
    async getEventAnalytics(startDate, endDate) {
        try {
            const analytics = await crmDb("events")
                .select(
                    "event_name",
                    "event_category",
                    "event_source"
                )
                .count("* as event_count")
                .sum("revenue as total_revenue")
                .where("event_time", ">=", startDate)
                .where("event_time", "<=", endDate)
                .groupBy("event_name", "event_category", "event_source")
                .orderBy("event_count", "desc");

            return analytics;
        } catch (error) {
            console.error("🚨 Error getting event analytics:", error);
            throw error;
        }
    }

    /**
     * Process unprocessed events
     */
    async processEvents(batchSize = 1000) {
        try {
            const unprocessedEvents = await crmDb("events")
                .where("is_processed", false)
                .where("is_valid", true)
                .orderBy("created_at", "asc")
                .limit(batchSize);

            if (unprocessedEvents.length === 0) {
                return { processed: 0, message: "No events to process" };
            }

            // Process events (implement your business logic here)
            for (const event of unprocessedEvents) {
                await this.processEvent(event);
            }

            // Mark events as processed
            const eventIds = unprocessedEvents.map(e => e.id);
            await crmDb("events")
                .whereIn("id", eventIds)
                .update({
                    is_processed: true,
                    processed_at: new Date()
                });

            console.log(`✅ Processed ${unprocessedEvents.length} events`);
            return { 
                processed: unprocessedEvents.length, 
                message: `Successfully processed ${unprocessedEvents.length} events` 
            };
            
        } catch (error) {
            console.error("🚨 Error processing events:", error);
            throw error;
        }
    }

    /**
     * Process individual event (implement business logic)
     */
    async processEvent(event) {
        try {
            // Implement your event processing logic here
            // Examples:
            // - Update contact engagement scores
            // - Trigger automated campaigns
            // - Update customer journey stages
            // - Calculate attribution
            
            console.log(`🔄 Processing event: ${event.event_name} (${event.uuid})`);
            
        } catch (error) {
            console.error(`🚨 Error processing event ${event.uuid}:`, error);
            // Mark event as invalid if processing fails
            await crmDb("events")
                .where("id", event.id)
                .update({
                    is_valid: false,
                    validation_errors: error.message
                });
        }
    }

    /**
     * Anonymize events for GDPR compliance
     */
    async anonymizeContactEvents(contactId) {
        try {
            await crmDb("events")
                .where("contact_id", contactId)
                .update({
                    contact_id: null,
                    user_properties: null,
                    ip_address: null,
                    user_agent: null,
                    is_anonymized: true,
                    anonymized_at: new Date()
                });

            console.log(`🔒 Anonymized events for contact ${contactId}`);
            
        } catch (error) {
            console.error("🚨 Error anonymizing contact events:", error);
            throw error;
        }
    }
}

module.exports = new EventService();
