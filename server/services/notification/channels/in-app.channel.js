/**
 * 📱 IN-APP NOTIFICATION CHANNEL
 * 
 * Real-time in-app notifications with:
 * - WebSocket/Server-Sent Events delivery
 * - Real-time user presence tracking
 * - Notification persistence and history
 * - Read/unread status tracking
 * - Badge count management
 * - Cross-device synchronization
 */

const EventEmitter = require('events');

class InAppChannel extends EventEmitter {
    constructor() {
        super();
        this.connectedUsers = new Map(); // userId -> Set of socketIds
        this.userSockets = new Map(); // socketId -> userId
        this.notificationQueue = new Map(); // userId -> Array of notifications
        this.initializeEventHandlers();
    }

    /**
     * Initialize event handlers
     */
    initializeEventHandlers() {
        // Listen for user connections/disconnections
        this.on('user:connected', this.handleUserConnected.bind(this));
        this.on('user:disconnected', this.handleUserDisconnected.bind(this));
        
        console.log('📱 In-app notification channel initialized');
    }

    /**
     * Send in-app notification
     * @param {string} recipient - User ID
     * @param {Object} content - Notification content
     * @param {Object} options - Delivery options
     * @returns {Promise<Object>} - Delivery result
     */
    async send(recipient, content, options = {}) {
        try {
            const userId = recipient;
            
            // Prepare notification payload
            const notification = {
                id: options.notificationId,
                userId: userId,
                type: 'in_app',
                title: content.title,
                message: content.message,
                data: content.data || {},
                timestamp: new Date().toISOString(),
                read: false,
                priority: options.priority || 'normal'
            };

            // Check if user is currently connected
            const userSockets = this.connectedUsers.get(userId);
            
            if (userSockets && userSockets.size > 0) {
                // User is online - send immediately to all their devices
                await this.deliverToConnectedUser(userId, notification);
                
                console.log(`📱 In-app notification delivered to online user: ${userId}`);
                
                return {
                    success: true,
                    externalId: notification.id,
                    provider: 'in_app',
                    recipient: userId,
                    status: 'delivered',
                    timestamp: notification.timestamp
                };
            } else {
                // User is offline - queue for delivery when they come online
                await this.queueNotificationForUser(userId, notification);
                
                console.log(`📱 In-app notification queued for offline user: ${userId}`);
                
                return {
                    success: true,
                    externalId: notification.id,
                    provider: 'in_app',
                    recipient: userId,
                    status: 'queued',
                    timestamp: notification.timestamp
                };
            }

        } catch (error) {
            console.error(`🚨 In-app notification delivery failed to ${recipient}:`, error);

            return {
                success: false,
                error: error.message,
                provider: 'in_app',
                recipient: recipient,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Deliver notification to connected user
     */
    async deliverToConnectedUser(userId, notification) {
        const userSockets = this.connectedUsers.get(userId);
        
        if (!userSockets) return;

        // Send to all connected devices/tabs for this user
        for (const socketId of userSockets) {
            try {
                // This would integrate with your WebSocket/SSE implementation
                await this.sendToSocket(socketId, 'notification', notification);
            } catch (error) {
                console.error(`🚨 Failed to send to socket ${socketId}:`, error);
                // Remove invalid socket
                this.removeSocket(socketId);
            }
        }

        // Update badge count
        await this.updateBadgeCount(userId);
    }

    /**
     * Queue notification for offline user
     */
    async queueNotificationForUser(userId, notification) {
        if (!this.notificationQueue.has(userId)) {
            this.notificationQueue.set(userId, []);
        }

        const queue = this.notificationQueue.get(userId);
        queue.push(notification);

        // Limit queue size to prevent memory issues
        const maxQueueSize = 100;
        if (queue.length > maxQueueSize) {
            queue.splice(0, queue.length - maxQueueSize);
        }

        this.notificationQueue.set(userId, queue);
    }

    /**
     * Handle user connection
     */
    async handleUserConnected(userId, socketId) {
        console.log(`📱 User connected: ${userId} (${socketId})`);

        // Add to connected users
        if (!this.connectedUsers.has(userId)) {
            this.connectedUsers.set(userId, new Set());
        }
        this.connectedUsers.get(userId).add(socketId);
        this.userSockets.set(socketId, userId);

        // Send queued notifications
        await this.deliverQueuedNotifications(userId);

        // Send current badge count
        await this.sendBadgeCount(userId, socketId);
    }

    /**
     * Handle user disconnection
     */
    handleUserDisconnected(socketId) {
        const userId = this.userSockets.get(socketId);
        if (!userId) return;

        console.log(`📱 User disconnected: ${userId} (${socketId})`);

        // Remove from connected users
        const userSockets = this.connectedUsers.get(userId);
        if (userSockets) {
            userSockets.delete(socketId);
            if (userSockets.size === 0) {
                this.connectedUsers.delete(userId);
            }
        }
        this.userSockets.delete(socketId);
    }

    /**
     * Deliver queued notifications to newly connected user
     */
    async deliverQueuedNotifications(userId) {
        const queue = this.notificationQueue.get(userId);
        if (!queue || queue.length === 0) return;

        console.log(`📱 Delivering ${queue.length} queued notifications to ${userId}`);

        for (const notification of queue) {
            await this.deliverToConnectedUser(userId, notification);
        }

        // Clear the queue
        this.notificationQueue.delete(userId);
    }

    /**
     * Send data to specific socket
     */
    async sendToSocket(socketId, event, data) {
        // This is a placeholder - you would integrate with your actual WebSocket/SSE implementation
        // For example, with Socket.IO:
        // io.to(socketId).emit(event, data);
        
        console.log(`📱 Sending to socket ${socketId}:`, { event, data });
    }

    /**
     * Update badge count for user
     */
    async updateBadgeCount(userId) {
        try {
            // This would query the database for unread notification count
            const db = require('../../../knex');
            
            const result = await db('notifications')
                .where({
                    user_id: userId,
                    type: 'in_app',
                    read_at: null
                })
                .count('id as count')
                .first();

            const badgeCount = parseInt(result.count) || 0;

            // Send badge count to all connected devices
            const userSockets = this.connectedUsers.get(userId);
            if (userSockets) {
                for (const socketId of userSockets) {
                    await this.sendToSocket(socketId, 'badge_count', { count: badgeCount });
                }
            }

            return badgeCount;
        } catch (error) {
            console.error('🚨 Error updating badge count:', error);
            return 0;
        }
    }

    /**
     * Send badge count to specific socket
     */
    async sendBadgeCount(userId, socketId) {
        try {
            const badgeCount = await this.updateBadgeCount(userId);
            await this.sendToSocket(socketId, 'badge_count', { count: badgeCount });
        } catch (error) {
            console.error('🚨 Error sending badge count:', error);
        }
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId, userId) {
        try {
            const db = require('../../../knex');
            
            await db('notifications')
                .where({
                    id: notificationId,
                    user_id: userId,
                    type: 'in_app'
                })
                .update({
                    read_at: new Date()
                });

            // Update badge count
            await this.updateBadgeCount(userId);

            console.log(`📱 Notification marked as read: ${notificationId}`);
            return true;
        } catch (error) {
            console.error('🚨 Error marking notification as read:', error);
            return false;
        }
    }

    /**
     * Mark all notifications as read for user
     */
    async markAllAsRead(userId) {
        try {
            const db = require('../../../knex');
            
            await db('notifications')
                .where({
                    user_id: userId,
                    type: 'in_app',
                    read_at: null
                })
                .update({
                    read_at: new Date()
                });

            // Update badge count
            await this.updateBadgeCount(userId);

            console.log(`📱 All notifications marked as read for user: ${userId}`);
            return true;
        } catch (error) {
            console.error('🚨 Error marking all notifications as read:', error);
            return false;
        }
    }

    /**
     * Get notification history for user
     */
    async getNotificationHistory(userId, options = {}) {
        try {
            const db = require('../../../knex');
            const { limit = 50, offset = 0, unreadOnly = false } = options;

            let query = db('notifications')
                .where({
                    user_id: userId,
                    type: 'in_app'
                })
                .orderBy('created_at', 'desc')
                .limit(limit)
                .offset(offset);

            if (unreadOnly) {
                query = query.whereNull('read_at');
            }

            const notifications = await query;

            return {
                notifications,
                hasMore: notifications.length === limit
            };
        } catch (error) {
            console.error('🚨 Error fetching notification history:', error);
            return { notifications: [], hasMore: false };
        }
    }

    /**
     * Remove invalid socket
     */
    removeSocket(socketId) {
        const userId = this.userSockets.get(socketId);
        if (userId) {
            const userSockets = this.connectedUsers.get(userId);
            if (userSockets) {
                userSockets.delete(socketId);
                if (userSockets.size === 0) {
                    this.connectedUsers.delete(userId);
                }
            }
        }
        this.userSockets.delete(socketId);
    }

    /**
     * Get connected users count
     */
    getConnectedUsersCount() {
        return this.connectedUsers.size;
    }

    /**
     * Get total connections count
     */
    getTotalConnectionsCount() {
        let total = 0;
        for (const sockets of this.connectedUsers.values()) {
            total += sockets.size;
        }
        return total;
    }

    /**
     * Check if user is online
     */
    isUserOnline(userId) {
        const userSockets = this.connectedUsers.get(userId);
        return userSockets && userSockets.size > 0;
    }
}

module.exports = new InAppChannel();
