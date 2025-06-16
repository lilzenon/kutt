const { Router } = require("express");
const asyncHandler = require("../../utils/asyncHandler");
const auth = require("../../handlers/auth.handler");
const analyticsService = require("../../services/analytics/analytics.service");
const performanceMonitor = require("../../services/analytics/performance.service");

const router = Router();

/**
 * GET /api/analytics/dashboard
 * Get dashboard analytics data
 */
router.get(
    "/dashboard",
    asyncHandler(auth.jwt),
    asyncHandler(async(req, res) => {
        try {
            const analytics = await analyticsService.getDashboardAnalytics(req.user.id);

            res.json({
                success: true,
                data: analytics
            });
        } catch (error) {
            console.error('❌ Dashboard analytics API error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    })
);

/**
 * GET /api/analytics/realtime
 * Get real-time analytics data
 */
router.get(
    "/realtime",
    asyncHandler(auth.jwt),
    asyncHandler(async(req, res) => {
        try {
            const realTimeStats = await analyticsService.getRealTimeStats(req.user.id);

            res.json({
                success: true,
                data: realTimeStats
            });
        } catch (error) {
            console.error('❌ Real-time analytics API error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    })
);

/**
 * GET /api/analytics/performance
 * Get performance metrics
 */
router.get(
    "/performance",
    asyncHandler(auth.jwt),
    asyncHandler(async(req, res) => {
        try {
            const performanceMetrics = await analyticsService.getPerformanceMetrics(req.user.id);

            res.json({
                success: true,
                data: performanceMetrics
            });
        } catch (error) {
            console.error('❌ Performance analytics API error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    })
);

/**
 * GET /api/analytics/drop/:dropId
 * Get analytics for a specific drop
 */
router.get(
    "/drop/:dropId",
    asyncHandler(auth.jwt),
    asyncHandler(async(req, res) => {
        try {
            const { dropId } = req.params;
            const dropAnalytics = await analyticsService.getDropAnalytics(dropId, req.user.id);

            res.json({
                success: true,
                data: dropAnalytics
            });
        } catch (error) {
            console.error(`❌ Drop analytics API error for drop ${req.params.dropId}:`, error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    })
);

/**
 * POST /api/analytics/invalidate
 * Manually invalidate analytics cache
 */
router.post(
    "/invalidate",
    asyncHandler(auth.jwt),
    asyncHandler(async(req, res) => {
        try {
            await analyticsService.invalidateUserCache(req.user.id);

            res.json({
                success: true,
                message: "Analytics cache invalidated successfully"
            });
        } catch (error) {
            console.error('❌ Cache invalidation API error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    })
);

/**
 * GET /api/analytics/export
 * Export analytics data
 */
router.get(
    "/export",
    asyncHandler(auth.jwt),
    asyncHandler(async(req, res) => {
        try {
            const { format = 'json' } = req.query;
            const analyticsData = await analyticsService.getAnalyticsPageData(req.user.id);

            if (format === 'csv') {
                // Convert to CSV format
                const csv = convertToCSV(analyticsData);
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename="analytics-export.csv"');
                res.send(csv);
            } else {
                // Return JSON format
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', 'attachment; filename="analytics-export.json"');
                res.json({
                    success: true,
                    data: analyticsData,
                    exportedAt: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('❌ Analytics export API error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    })
);

/**
 * Helper function to convert analytics data to CSV
 */
function convertToCSV(data) {
    const { stats, recentDrops, recentLinks, fanAnalytics } = data;

    let csv = 'Analytics Export\n\n';

    // Stats section
    csv += 'Metric,Value\n';
    csv += `Total Drops,${stats.totalDrops}\n`;
    csv += `Active Drops,${stats.activeDrops}\n`;
    csv += `Total Links,${stats.totalLinks}\n`;
    csv += `Total Fans,${stats.totalFans}\n`;
    csv += `Total Clicks,${stats.totalClicks}\n\n`;

    // Recent Drops section
    csv += 'Recent Drops\n';
    csv += 'Title,Status,Fans,Created Date\n';
    recentDrops.forEach(drop => {
        csv += `"${drop.title}",${drop.is_active ? 'Active' : 'Inactive'},${drop.signup_count || 0},"${drop.created_at}"\n`;
    });

    csv += '\n';

    // Recent Links section
    csv += 'Recent Links\n';
    csv += 'Title,URL,Clicks,Created Date\n';
    recentLinks.forEach(link => {
        csv += `"${link.title || 'Untitled'}","${link.target}",${link.visit_count || 0},"${link.created_at}"\n`;
    });

    return csv;
}

/**
 * GET /api/analytics/performance/report
 * Get performance monitoring data (admin only)
 */
router.get(
    "/performance/report",
    asyncHandler(auth.jwt),
    asyncHandler(async(req, res) => {
        try {
            // Only allow admin users to access performance data
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied. Admin privileges required.'
                });
            }

            const performanceReport = await performanceMonitor.generateReport();

            res.json({
                success: true,
                data: performanceReport
            });
        } catch (error) {
            console.error('❌ Performance report API error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    })
);

module.exports = router;