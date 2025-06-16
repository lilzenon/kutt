const query = require("../../queries");
const cache = require("./cache.service");
const knex = require("../../knex");
const performanceMonitor = require("./performance.service");

class AnalyticsService {
    /**
     * Get comprehensive dashboard analytics for a user
     */
    async getDashboardAnalytics(userId, options = {}) {
        const cacheKey = cache.getUserAnalyticsKey(userId, 'dashboard');

        return await cache.getOrCompute(cacheKey, async() => {
            console.log(`📊 Computing dashboard analytics for user ${userId}`);

            // Use optimized single query for all stats
            const [statsResult] = await knex.raw(`
                SELECT 
                    (SELECT COUNT(*) FROM drops WHERE user_id = ?) as total_drops,
                    (SELECT COUNT(*) FROM drops WHERE user_id = ? AND is_active = true) as active_drops,
                    (SELECT COUNT(*) FROM links WHERE user_id = ?) as total_links,
                    (SELECT COALESCE(SUM(visit_count), 0) FROM links WHERE user_id = ?) as total_clicks,
                    (SELECT COUNT(DISTINCT ds.email) 
                     FROM drop_signups ds 
                     JOIN drops d ON ds.drop_id = d.id 
                     WHERE d.user_id = ?) as total_unique_fans,
                    (SELECT COUNT(*) 
                     FROM drop_signups ds 
                     JOIN drops d ON ds.drop_id = d.id 
                     WHERE d.user_id = ?) as total_signups
            `, [userId, userId, userId, userId, userId, userId]);

            const stats = statsResult.rows ? statsResult.rows[0] : statsResult[0];

            // Get recent drops and links in parallel
            const [recentDrops, recentLinks] = await Promise.all([
                query.drop.findByUserWithStats(userId, { limit: 5 }),
                query.link.get({ "links.user_id": userId }, { skip: 0, limit: 5 })
            ]);

            return {
                stats: {
                    totalDrops: parseInt(stats.total_drops) || 0,
                    activeDrops: parseInt(stats.active_drops) || 0,
                    totalLinks: parseInt(stats.total_links) || 0,
                    totalClicks: parseInt(stats.total_clicks) || 0,
                    totalFans: parseInt(stats.total_unique_fans) || 0,
                    totalSignups: parseInt(stats.total_signups) || 0
                },
                recentDrops: recentDrops || [],
                recentLinks: recentLinks || [],
                lastUpdated: new Date().toISOString()
            };
        }, cache.defaultTTL);
    }

    /**
     * Get comprehensive analytics page data
     */
    async getAnalyticsPageData(userId, options = {}) {
        const cacheKey = cache.getUserAnalyticsKey(userId, 'analytics');

        return await cache.getOrCompute(cacheKey, async() => {
            console.log(`📊 Computing analytics page data for user ${userId}`);

            // Get dashboard analytics as base
            const dashboardData = await this.getDashboardAnalytics(userId);

            // Get additional analytics data
            const [fanAnalytics, performanceMetrics] = await Promise.all([
                query.drop.getFanAnalytics(userId, { limit: 50 }),
                this.getPerformanceMetrics(userId)
            ]);

            return {
                ...dashboardData,
                fanAnalytics: fanAnalytics || { fans: [], totalCount: 0 },
                performanceMetrics: performanceMetrics || {},
                lastUpdated: new Date().toISOString()
            };
        }, cache.defaultTTL);
    }

    /**
     * Get performance metrics for analytics
     */
    async getPerformanceMetrics(userId) {
        try {
            const [metricsResult] = await knex.raw(`
                WITH user_drops AS (
                    SELECT id FROM drops WHERE user_id = ?
                ),
                signup_metrics AS (
                    SELECT 
                        COUNT(*) as total_signups,
                        COUNT(DISTINCT email) as unique_signups,
                        AVG(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) as weekly_growth_rate
                    FROM drop_signups ds
                    JOIN user_drops ud ON ds.drop_id = ud.id
                ),
                link_metrics AS (
                    SELECT 
                        AVG(visit_count) as avg_clicks_per_link,
                        MAX(visit_count) as max_clicks,
                        COUNT(CASE WHEN visit_count > 0 THEN 1 END) as active_links_count
                    FROM links 
                    WHERE user_id = ?
                )
                SELECT 
                    sm.*,
                    lm.*
                FROM signup_metrics sm
                CROSS JOIN link_metrics lm
            `, [userId, userId]);

            const metrics = metricsResult.rows ? metricsResult.rows[0] : metricsResult[0];

            return {
                totalSignups: parseInt(metrics.total_signups) || 0,
                uniqueSignups: parseInt(metrics.unique_signups) || 0,
                weeklyGrowthRate: parseFloat(metrics.weekly_growth_rate) || 0,
                avgClicksPerLink: parseFloat(metrics.avg_clicks_per_link) || 0,
                maxClicks: parseInt(metrics.max_clicks) || 0,
                activeLinksCount: parseInt(metrics.active_links_count) || 0,
                conversionRate: metrics.unique_signups > 0 ?
                    ((metrics.total_signups / metrics.unique_signups) * 100).toFixed(2) : 0
            };
        } catch (error) {
            console.error(`❌ Error getting performance metrics for user ${userId}:`, error);
            return {};
        }
    }

    /**
     * Get drop-specific analytics
     */
    async getDropAnalytics(dropId, userId) {
        const cacheKey = cache.getDropAnalyticsKey(dropId);

        return await cache.getOrCompute(cacheKey, async() => {
            console.log(`📊 Computing drop analytics for drop ${dropId}`);

            const [drop, signups, recentSignups] = await Promise.all([
                query.drop.findWithStats({ id: dropId }),
                query.drop.findSignups({ drop_id: dropId }),
                query.drop.findSignups({ drop_id: dropId }, { limit: 10 })
            ]);

            if (!drop) {
                throw new Error('Drop not found');
            }

            const views = drop.view_count || 0;
            const fans = drop.signup_count || 0;
            const conversionRate = views > 0 ? ((fans / views) * 100).toFixed(1) : 0;

            return {
                drop,
                stats: {
                    views,
                    fans,
                    conversionRate,
                    totalSignups: signups.length
                },
                recentSignups: recentSignups.map(signup => ({
                    email: signup.email,
                    phone: signup.phone,
                    name: signup.name,
                    created_at: signup.created_at
                })),
                lastUpdated: new Date().toISOString()
            };
        }, cache.longTTL);
    }

    /**
     * Invalidate analytics cache when data changes
     */
    async invalidateUserCache(userId) {
        await cache.invalidateUserAnalytics(userId);
    }

    /**
     * Invalidate drop cache when drop data changes
     */
    async invalidateDropCache(dropId, userId) {
        await cache.invalidateDropAnalytics(dropId, userId);
    }

    /**
     * Get real-time analytics summary
     */
    async getRealTimeStats(userId) {
        // This bypasses cache for real-time data
        const [statsResult] = await knex.raw(`
            SELECT 
                (SELECT COUNT(*) FROM drops WHERE user_id = ? AND created_at >= NOW() - INTERVAL '24 hours') as drops_today,
                (SELECT COUNT(*) FROM drop_signups ds JOIN drops d ON ds.drop_id = d.id WHERE d.user_id = ? AND ds.created_at >= NOW() - INTERVAL '24 hours') as signups_today,
                (SELECT COUNT(*) FROM visits v JOIN links l ON v.link_id = l.id WHERE l.user_id = ? AND v.created_at >= NOW() - INTERVAL '24 hours') as clicks_today
        `, [userId, userId, userId]);

        const stats = statsResult.rows ? statsResult.rows[0] : statsResult[0];

        return {
            dropsToday: parseInt(stats.drops_today) || 0,
            signupsToday: parseInt(stats.signups_today) || 0,
            clicksToday: parseInt(stats.clicks_today) || 0,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = new AnalyticsService();