/**
 * 🔔 COMPREHENSIVE NOTIFICATION SERVICE
 * 
 * Enterprise-grade notification system with:
 * - Multi-channel delivery (email, SMS, push, in-app)
 * - Real-time delivery tracking
 * - User preference management
 * - Rate limiting and throttling
 * - Template management
 * - Event-driven architecture
 * - GDPR compliance
 * - Retry mechanisms with exponential backoff
 * 
 * Based on industry best practices from:
 * - Firebase Cloud Messaging
 * - AWS SNS/SES
 * - Twilio SendGrid
 * - System Design Interview patterns
 */

const db = require("../../knex");
const { crmDb } = require("../../config/crm-database");
const EventEmitter = require('events');
const handlebars = require('handlebars');

class NotificationService extends EventEmitter {
    constructor() {
        super();
        this.channels = new Map();
        this.rateLimits = new Map();
        this.retryQueue = [];
        this.isProcessing = false;
        
        // Initialize channels
        this.initializeChannels();
        
        // Start background processors
        this.startRetryProcessor();
        this.startRateLimitCleaner();
    }

    /**
     * Initialize notification channels
     */
    initializeChannels() {
        // Email channel
        this.channels.set('email', require('./channels/email.channel'));
        
        // SMS channel
        this.channels.set('sms', require('./channels/sms.channel'));
        
        // Push notification channels
        this.channels.set('push_ios', require('./channels/push-ios.channel'));
        this.channels.set('push_android', require('./channels/push-android.channel'));
        this.channels.set('push_web', require('./channels/push-web.channel'));
        
        // In-app notification channel
        this.channels.set('in_app', require('./channels/in-app.channel'));
        
        console.log('🔔 Notification channels initialized');
    }

    /**
     * Send notification with comprehensive handling
     * @param {Object} notificationData - Notification data
     * @returns {Promise<Object>} - Notification result
     */
    async sendNotification(notificationData) {
        try {
            const {
                userId,
                type,
                category = 'transactional',
                priority = 'normal',
                title,
                message,
                data = {},
                templateId = null,
                scheduledAt = null,
                expiresAt = null
            } = notificationData;

            // Validate required fields
            if (!userId || !type || !message) {
                throw new Error('Missing required notification fields');
            }

            // Check user preferences
            const userPreferences = await this.getUserPreferences(userId, type, category);
            if (!userPreferences.enabled) {
                console.log(`🔕 Notification blocked by user preferences: ${userId}/${type}/${category}`);
                return { success: false, reason: 'blocked_by_preferences' };
            }

            // Check rate limits
            const rateLimitCheck = await this.checkRateLimit(userId, type, category);
            if (!rateLimitCheck.allowed) {
                console.log(`⏱️ Rate limit exceeded: ${userId}/${type}/${category}`);
                return { success: false, reason: 'rate_limit_exceeded' };
            }

            // Create notification record
            const notification = await this.createNotificationRecord({
                userId,
                type,
                category,
                priority,
                title,
                message,
                data,
                templateId,
                scheduledAt,
                expiresAt
            });

            // If scheduled, don't send immediately
            if (scheduledAt && new Date(scheduledAt) > new Date()) {
                console.log(`📅 Notification scheduled: ${notification.id}`);
                return { success: true, notificationId: notification.id, status: 'scheduled' };
            }

            // Send notification
            const result = await this.deliverNotification(notification);
            
            // Update rate limit counter
            await this.updateRateLimit(userId, type, category);
            
            return result;

        } catch (error) {
            console.error('🚨 Notification service error:', error);
            throw error;
        }
    }

    /**
     * Create notification record in database
     */
    async createNotificationRecord(notificationData) {
        const notification = await db('notifications').insert({
            user_id: notificationData.userId,
            template_id: notificationData.templateId,
            type: notificationData.type,
            category: notificationData.category,
            priority: notificationData.priority,
            title: notificationData.title,
            message: notificationData.message,
            data: JSON.stringify(notificationData.data),
            scheduled_at: notificationData.scheduledAt,
            expires_at: notificationData.expiresAt,
            status: 'pending'
        }).returning('*');

        // Log creation event
        await this.logNotificationEvent(notification[0].id, 'created', {
            type: notificationData.type,
            category: notificationData.category
        });

        return notification[0];
    }

    /**
     * Deliver notification through appropriate channel
     */
    async deliverNotification(notification) {
        try {
            const channel = this.channels.get(notification.type);
            if (!channel) {
                throw new Error(`Unsupported notification type: ${notification.type}`);
            }

            // Get user's channel endpoint
            const userChannel = await this.getUserChannel(notification.user_id, notification.type);
            if (!userChannel) {
                throw new Error(`No active channel found for user: ${notification.user_id}/${notification.type}`);
            }

            // Prepare notification content
            const content = await this.prepareNotificationContent(notification);

            // Send through channel
            const deliveryResult = await channel.send(userChannel.endpoint, content, {
                notificationId: notification.id,
                userId: notification.user_id,
                metadata: userChannel.metadata
            });

            // Update notification status
            await this.updateNotificationStatus(notification.id, 'sent', {
                external_id: deliveryResult.externalId,
                sent_at: new Date()
            });

            // Log sent event
            await this.logNotificationEvent(notification.id, 'sent', deliveryResult);

            // Emit real-time event
            this.emit('notification:sent', {
                notificationId: notification.id,
                userId: notification.user_id,
                type: notification.type,
                result: deliveryResult
            });

            return {
                success: true,
                notificationId: notification.id,
                status: 'sent',
                externalId: deliveryResult.externalId
            };

        } catch (error) {
            console.error(`🚨 Delivery failed for notification ${notification.id}:`, error);

            // Update notification status
            await this.updateNotificationStatus(notification.id, 'failed', {
                error_message: error.message,
                retry_count: notification.retry_count + 1,
                next_retry_at: this.calculateNextRetry(notification.retry_count)
            });

            // Add to retry queue if retryable
            if (this.isRetryableError(error) && notification.retry_count < 3) {
                this.addToRetryQueue(notification);
            }

            // Log failed event
            await this.logNotificationEvent(notification.id, 'failed', {
                error: error.message,
                retry_count: notification.retry_count + 1
            });

            return {
                success: false,
                notificationId: notification.id,
                status: 'failed',
                error: error.message
            };
        }
    }

    /**
     * Get user notification preferences
     */
    async getUserPreferences(userId, type, category) {
        const preferences = await db('user_notification_preferences')
            .where({
                user_id: userId,
                notification_type: type,
                category: category
            })
            .first();

        // Default to enabled if no preferences set
        return preferences || { enabled: true, settings: {} };
    }

    /**
     * Get user's channel endpoint
     */
    async getUserChannel(userId, type) {
        return await db('notification_channels')
            .where({
                user_id: userId,
                channel_type: type,
                is_active: true,
                is_verified: true
            })
            .orderBy('last_used_at', 'desc')
            .first();
    }

    /**
     * Prepare notification content (apply templates, etc.)
     */
    async prepareNotificationContent(notification) {
        let content = {
            title: notification.title,
            message: notification.message,
            data: JSON.parse(notification.data || '{}')
        };

        // Apply template if specified
        if (notification.template_id) {
            const template = await db('notification_templates')
                .where('id', notification.template_id)
                .first();

            if (template) {
                const compiledTemplate = handlebars.compile(template.body_template);
                content.message = compiledTemplate(content.data);

                if (template.subject) {
                    const compiledSubject = handlebars.compile(template.subject);
                    content.title = compiledSubject(content.data);
                }

                if (template.html_template) {
                    const compiledHtml = handlebars.compile(template.html_template);
                    content.html = compiledHtml(content.data);
                }
            }
        }

        return content;
    }

    /**
     * Check rate limits for user
     */
    async checkRateLimit(userId, type, category) {
        const preferences = await this.getUserPreferences(userId, type, category);
        const limit = preferences.settings?.frequency_limit || 100; // Default 100/day

        const windowStart = new Date();
        windowStart.setHours(0, 0, 0, 0);
        const windowEnd = new Date(windowStart);
        windowEnd.setDate(windowEnd.getDate() + 1);

        const currentCount = await db('notification_rate_limits')
            .where({
                user_id: userId,
                notification_type: type,
                category: category,
                window_start: windowStart
            })
            .first();

        const count = currentCount ? currentCount.count : 0;
        return {
            allowed: count < limit,
            current: count,
            limit: limit,
            resetAt: windowEnd
        };
    }

    /**
     * Update rate limit counter
     */
    async updateRateLimit(userId, type, category) {
        const windowStart = new Date();
        windowStart.setHours(0, 0, 0, 0);
        const windowEnd = new Date(windowStart);
        windowEnd.setDate(windowEnd.getDate() + 1);

        await db('notification_rate_limits')
            .insert({
                user_id: userId,
                notification_type: type,
                category: category,
                count: 1,
                window_start: windowStart,
                window_end: windowEnd
            })
            .onConflict(['user_id', 'notification_type', 'category', 'window_start'])
            .merge({
                count: db.raw('notification_rate_limits.count + 1'),
                updated_at: new Date()
            });
    }

    /**
     * Update notification status
     */
    async updateNotificationStatus(notificationId, status, updates = {}) {
        await db('notifications')
            .where('id', notificationId)
            .update({
                status,
                ...updates,
                updated_at: new Date()
            });
    }

    /**
     * Log notification event
     */
    async logNotificationEvent(notificationId, eventType, eventData = {}) {
        await db('notification_events').insert({
            notification_id: notificationId,
            event_type: eventType,
            event_data: JSON.stringify(eventData),
            event_timestamp: new Date()
        });
    }

    /**
     * Calculate next retry time with exponential backoff
     */
    calculateNextRetry(retryCount) {
        const baseDelay = 60000; // 1 minute
        const delay = baseDelay * Math.pow(2, retryCount);
        return new Date(Date.now() + delay);
    }

    /**
     * Check if error is retryable
     */
    isRetryableError(error) {
        const retryableErrors = [
            'NETWORK_ERROR',
            'TIMEOUT',
            'RATE_LIMITED',
            'SERVICE_UNAVAILABLE'
        ];
        return retryableErrors.some(type => error.message.includes(type));
    }

    /**
     * Add notification to retry queue
     */
    addToRetryQueue(notification) {
        this.retryQueue.push({
            ...notification,
            retryAt: this.calculateNextRetry(notification.retry_count)
        });
    }

    /**
     * Start retry processor
     */
    startRetryProcessor() {
        setInterval(async () => {
            if (this.isProcessing || this.retryQueue.length === 0) return;

            this.isProcessing = true;
            const now = new Date();
            const readyToRetry = this.retryQueue.filter(n => n.retryAt <= now);

            for (const notification of readyToRetry) {
                try {
                    await this.deliverNotification(notification);
                    this.retryQueue = this.retryQueue.filter(n => n.id !== notification.id);
                } catch (error) {
                    console.error(`🚨 Retry failed for notification ${notification.id}:`, error);
                }
            }

            this.isProcessing = false;
        }, 30000); // Check every 30 seconds
    }

    /**
     * Start rate limit cleaner
     */
    startRateLimitCleaner() {
        setInterval(async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            await db('notification_rate_limits')
                .where('window_end', '<', yesterday)
                .del();
        }, 3600000); // Clean every hour
    }
}

module.exports = new NotificationService();
