const redis = require("../../redis");
const env = require("../../env");

class AnalyticsCache {
    constructor() {
        this.enabled = env.REDIS_ENABLED;
        this.defaultTTL = 300; // 5 minutes
        this.longTTL = 3600; // 1 hour
    }

    /**
     * Generate cache key for user analytics
     */
    getUserAnalyticsKey(userId, type = 'dashboard') {
        return `analytics:user:${userId}:${type}`;
    }

    /**
     * Generate cache key for drop analytics
     */
    getDropAnalyticsKey(dropId) {
        return `analytics:drop:${dropId}`;
    }

    /**
     * Generate cache key for aggregated stats
     */
    getStatsKey(userId, period = 'current') {
        return `stats:user:${userId}:${period}`;
    }

    /**
     * Get cached analytics data
     */
    async get(key) {
        if (!this.enabled || !redis.client) return null;

        try {
            const data = await redis.client.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`❌ Cache get error for key ${key}:`, error);
            return null;
        }
    }

    /**
     * Set cached analytics data
     */
    async set(key, data, ttl = this.defaultTTL) {
        if (!this.enabled || !redis.client) return false;

        try {
            await redis.client.setex(key, ttl, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`❌ Cache set error for key ${key}:`, error);
            return false;
        }
    }

    /**
     * Invalidate user analytics cache
     */
    async invalidateUserAnalytics(userId) {
        if (!this.enabled || !redis.client) return;

        try {
            const keys = [
                this.getUserAnalyticsKey(userId, 'dashboard'),
                this.getUserAnalyticsKey(userId, 'analytics'),
                this.getStatsKey(userId, 'current'),
                this.getStatsKey(userId, 'daily'),
                this.getStatsKey(userId, 'weekly'),
                this.getStatsKey(userId, 'monthly')
            ];

            await redis.client.del(...keys);
            console.log(`✅ Invalidated analytics cache for user ${userId}`);
        } catch (error) {
            console.error(`❌ Cache invalidation error for user ${userId}:`, error);
        }
    }

    /**
     * Invalidate drop analytics cache
     */
    async invalidateDropAnalytics(dropId, userId) {
        if (!this.enabled || !redis.client) return;

        try {
            const keys = [
                this.getDropAnalyticsKey(dropId)
            ];

            // Also invalidate user analytics since drop stats affect user totals
            if (userId) {
                keys.push(
                    this.getUserAnalyticsKey(userId, 'dashboard'),
                    this.getUserAnalyticsKey(userId, 'analytics'),
                    this.getStatsKey(userId, 'current')
                );
            }

            await redis.client.del(...keys);
            console.log(`✅ Invalidated drop analytics cache for drop ${dropId}`);
        } catch (error) {
            console.error(`❌ Cache invalidation error for drop ${dropId}:`, error);
        }
    }

    /**
     * Get or compute cached analytics with fallback
     */
    async getOrCompute(key, computeFunction, ttl = this.defaultTTL) {
        try {
            // Try to get from cache first
            let data = await this.get(key);

            if (data) {
                console.log(`📊 Cache hit for key: ${key}`);
                return data;
            }

            // Compute fresh data
            console.log(`📊 Cache miss for key: ${key}, computing fresh data`);
            data = await computeFunction();

            // Try to cache the result (don't fail if caching fails)
            try {
                await this.set(key, data, ttl);
            } catch (cacheError) {
                console.warn(`⚠️ Failed to cache result for key ${key}:`, cacheError.message);
                // Continue without caching
            }

            return data;
        } catch (error) {
            console.error(`❌ Error in getOrCompute for key ${key}:`, error);

            // If cache fails, try to compute directly
            try {
                console.log(`🔄 Attempting direct computation for key: ${key}`);
                return await computeFunction();
            } catch (computeError) {
                console.error(`❌ Error computing analytics for key ${key}:`, computeError);
                throw computeError;
            }
        }
    }

    /**
     * Batch invalidate multiple keys
     */
    async batchInvalidate(keys) {
        if (!this.enabled || !redis.client || !keys.length) return;

        try {
            await redis.client.del(...keys);
            console.log(`✅ Batch invalidated ${keys.length} cache keys`);
        } catch (error) {
            console.error(`❌ Batch cache invalidation error:`, error);
        }
    }

    /**
     * Get cache statistics
     */
    async getCacheStats() {
        if (!this.enabled || !redis.client) {
            return { enabled: false };
        }

        try {
            const info = await redis.client.info('memory');
            const keyspace = await redis.client.info('keyspace');

            return {
                enabled: true,
                memory: info,
                keyspace: keyspace
            };
        } catch (error) {
            console.error(`❌ Error getting cache stats:`, error);
            return { enabled: true, error: error.message };
        }
    }
}

module.exports = new AnalyticsCache();