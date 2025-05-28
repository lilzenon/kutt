/**
 * 🔔 NOTIFICATION API ROUTES
 * 
 * Comprehensive notification management with:
 * - Send notifications (single/bulk)
 * - User preference management
 * - Notification history and search
 * - Real-time delivery tracking
 * - Channel registration (devices/endpoints)
 * - Webhook handling for delivery status
 * - Analytics and reporting
 */

const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const auth = require('../handlers/auth');
const notificationService = require('../services/notification/notification.service');
const db = require('../knex');

/**
 * Send a notification
 * POST /api/notifications/send
 */
router.post('/send', 
    asyncHandler(auth.jwt),
    asyncHandler(async (req, res) => {
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
                scheduledAt = null
            } = req.body;

            // Validate required fields
            if (!userId || !type || !message) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: userId, type, message'
                });
            }

            // Send notification
            const result = await notificationService.sendNotification({
                userId,
                type,
                category,
                priority,
                title,
                message,
                data,
                templateId,
                scheduledAt
            });

            res.json(result);

        } catch (error) {
            console.error('🚨 Send notification error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send notification',
                error: error.message
            });
        }
    })
);

/**
 * Send bulk notifications
 * POST /api/notifications/send-bulk
 */
router.post('/send-bulk',
    asyncHandler(auth.jwt),
    asyncHandler(async (req, res) => {
        try {
            const { notifications } = req.body;

            if (!Array.isArray(notifications) || notifications.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'notifications must be a non-empty array'
                });
            }

            const results = [];
            for (const notification of notifications) {
                try {
                    const result = await notificationService.sendNotification(notification);
                    results.push(result);
                } catch (error) {
                    results.push({
                        success: false,
                        error: error.message,
                        notification
                    });
                }
            }

            const successCount = results.filter(r => r.success).length;
            const failureCount = results.length - successCount;

            res.json({
                success: true,
                message: `Processed ${results.length} notifications`,
                summary: {
                    total: results.length,
                    successful: successCount,
                    failed: failureCount
                },
                results
            });

        } catch (error) {
            console.error('🚨 Send bulk notifications error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send bulk notifications',
                error: error.message
            });
        }
    })
);

/**
 * Get user's notifications
 * GET /api/notifications
 */
router.get('/',
    asyncHandler(auth.jwt),
    asyncHandler(async (req, res) => {
        try {
            const userId = req.user.id;
            const {
                type = null,
                category = null,
                unreadOnly = false,
                limit = 50,
                offset = 0
            } = req.query;

            let query = db('notifications')
                .where('user_id', userId)
                .orderBy('created_at', 'desc')
                .limit(parseInt(limit))
                .offset(parseInt(offset));

            if (type) {
                query = query.where('type', type);
            }

            if (category) {
                query = query.where('category', category);
            }

            if (unreadOnly === 'true') {
                query = query.whereNull('read_at');
            }

            const notifications = await query;

            // Get unread count
            const unreadCount = await db('notifications')
                .where({
                    user_id: userId,
                    read_at: null
                })
                .count('id as count')
                .first();

            res.json({
                success: true,
                notifications,
                unreadCount: parseInt(unreadCount.count) || 0,
                hasMore: notifications.length === parseInt(limit)
            });

        } catch (error) {
            console.error('🚨 Get notifications error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch notifications',
                error: error.message
            });
        }
    })
);

/**
 * Mark notification as read
 * PUT /api/notifications/:id/read
 */
router.put('/:id/read',
    asyncHandler(auth.jwt),
    asyncHandler(async (req, res) => {
        try {
            const notificationId = req.params.id;
            const userId = req.user.id;

            const updated = await db('notifications')
                .where({
                    id: notificationId,
                    user_id: userId
                })
                .update({
                    read_at: new Date()
                });

            if (updated === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Notification not found'
                });
            }

            // Update badge count for in-app notifications
            const inAppChannel = require('../services/notification/channels/in-app.channel');
            await inAppChannel.updateBadgeCount(userId);

            res.json({
                success: true,
                message: 'Notification marked as read'
            });

        } catch (error) {
            console.error('🚨 Mark notification as read error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to mark notification as read',
                error: error.message
            });
        }
    })
);

/**
 * Mark all notifications as read
 * PUT /api/notifications/read-all
 */
router.put('/read-all',
    asyncHandler(auth.jwt),
    asyncHandler(async (req, res) => {
        try {
            const userId = req.user.id;

            const updated = await db('notifications')
                .where({
                    user_id: userId,
                    read_at: null
                })
                .update({
                    read_at: new Date()
                });

            // Update badge count for in-app notifications
            const inAppChannel = require('../services/notification/channels/in-app.channel');
            await inAppChannel.updateBadgeCount(userId);

            res.json({
                success: true,
                message: `Marked ${updated} notifications as read`
            });

        } catch (error) {
            console.error('🚨 Mark all notifications as read error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to mark all notifications as read',
                error: error.message
            });
        }
    })
);

/**
 * Get user notification preferences
 * GET /api/notifications/preferences
 */
router.get('/preferences',
    asyncHandler(auth.jwt),
    asyncHandler(async (req, res) => {
        try {
            const userId = req.user.id;

            const preferences = await db('user_notification_preferences')
                .where('user_id', userId);

            res.json({
                success: true,
                preferences
            });

        } catch (error) {
            console.error('🚨 Get notification preferences error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch notification preferences',
                error: error.message
            });
        }
    })
);

/**
 * Update user notification preferences
 * PUT /api/notifications/preferences
 */
router.put('/preferences',
    asyncHandler(auth.jwt),
    asyncHandler(async (req, res) => {
        try {
            const userId = req.user.id;
            const { preferences } = req.body;

            if (!Array.isArray(preferences)) {
                return res.status(400).json({
                    success: false,
                    message: 'preferences must be an array'
                });
            }

            // Update preferences
            for (const pref of preferences) {
                const {
                    notification_type,
                    category,
                    enabled,
                    settings = {}
                } = pref;

                await db('user_notification_preferences')
                    .insert({
                        user_id: userId,
                        notification_type,
                        category,
                        enabled,
                        settings: JSON.stringify(settings)
                    })
                    .onConflict(['user_id', 'notification_type', 'category'])
                    .merge({
                        enabled,
                        settings: JSON.stringify(settings),
                        updated_at: new Date()
                    });
            }

            res.json({
                success: true,
                message: 'Notification preferences updated'
            });

        } catch (error) {
            console.error('🚨 Update notification preferences error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update notification preferences',
                error: error.message
            });
        }
    })
);

/**
 * Register notification channel (device/endpoint)
 * POST /api/notifications/channels
 */
router.post('/channels',
    asyncHandler(auth.jwt),
    asyncHandler(async (req, res) => {
        try {
            const userId = req.user.id;
            const {
                channel_type,
                endpoint,
                metadata = {}
            } = req.body;

            if (!channel_type || !endpoint) {
                return res.status(400).json({
                    success: false,
                    message: 'channel_type and endpoint are required'
                });
            }

            // Register or update channel
            await db('notification_channels')
                .insert({
                    user_id: userId,
                    channel_type,
                    endpoint,
                    metadata: JSON.stringify(metadata),
                    is_active: true,
                    last_used_at: new Date()
                })
                .onConflict(['user_id', 'channel_type', 'endpoint'])
                .merge({
                    is_active: true,
                    last_used_at: new Date(),
                    metadata: JSON.stringify(metadata),
                    updated_at: new Date()
                });

            res.json({
                success: true,
                message: 'Notification channel registered'
            });

        } catch (error) {
            console.error('🚨 Register notification channel error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to register notification channel',
                error: error.message
            });
        }
    })
);

/**
 * Email tracking pixel
 * GET /api/notifications/:id/track/open
 */
router.get('/:id/track/open', async (req, res) => {
    try {
        const notificationId = req.params.id;

        // Log email open event
        await db('notification_events').insert({
            notification_id: notificationId,
            event_type: 'opened',
            event_data: JSON.stringify({
                user_agent: req.headers['user-agent'],
                ip_address: req.ip
            }),
            event_timestamp: new Date()
        });

        // Return 1x1 transparent pixel
        const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
        res.set('Content-Type', 'image/gif');
        res.send(pixel);

    } catch (error) {
        console.error('🚨 Email tracking error:', error);
        res.status(200).send(); // Don't fail the email display
    }
});

/**
 * Email click tracking
 * GET /api/notifications/:id/track/click
 */
router.get('/:id/track/click', async (req, res) => {
    try {
        const notificationId = req.params.id;
        const targetUrl = req.query.url;

        // Log email click event
        await db('notification_events').insert({
            notification_id: notificationId,
            event_type: 'clicked',
            event_data: JSON.stringify({
                url: targetUrl,
                user_agent: req.headers['user-agent'],
                ip_address: req.ip
            }),
            event_timestamp: new Date()
        });

        // Redirect to target URL
        res.redirect(targetUrl || '/');

    } catch (error) {
        console.error('🚨 Email click tracking error:', error);
        res.redirect(req.query.url || '/'); // Don't fail the redirect
    }
});

module.exports = router;
