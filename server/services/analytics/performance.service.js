const knex = require("../../knex");

class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.slowQueryThreshold = 1000; // 1 second
    }

    /**
     * Start timing a database operation
     */
    startTimer(operationName) {
        const startTime = process.hrtime.bigint();
        return {
            operationName,
            startTime,
            end: () => this.endTimer(operationName, startTime)
        };
    }

    /**
     * End timing and record metrics
     */
    endTimer(operationName, startTime) {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

        // Record the metric
        if (!this.metrics.has(operationName)) {
            this.metrics.set(operationName, {
                count: 0,
                totalTime: 0,
                minTime: Infinity,
                maxTime: 0,
                slowQueries: 0
            });
        }

        const metric = this.metrics.get(operationName);
        metric.count++;
        metric.totalTime += duration;
        metric.minTime = Math.min(metric.minTime, duration);
        metric.maxTime = Math.max(metric.maxTime, duration);

        if (duration > this.slowQueryThreshold) {
            metric.slowQueries++;
            console.warn(`🐌 Slow query detected: ${operationName} took ${duration.toFixed(2)}ms`);
        }

        console.log(`⏱️ ${operationName}: ${duration.toFixed(2)}ms`);
        return duration;
    }

    /**
     * Get performance metrics
     */
    getMetrics() {
        const result = {};
        
        for (const [operation, metric] of this.metrics.entries()) {
            result[operation] = {
                count: metric.count,
                averageTime: metric.count > 0 ? (metric.totalTime / metric.count).toFixed(2) : 0,
                minTime: metric.minTime === Infinity ? 0 : metric.minTime.toFixed(2),
                maxTime: metric.maxTime.toFixed(2),
                totalTime: metric.totalTime.toFixed(2),
                slowQueries: metric.slowQueries,
                slowQueryPercentage: metric.count > 0 ? ((metric.slowQueries / metric.count) * 100).toFixed(2) : 0
            };
        }

        return result;
    }

    /**
     * Reset metrics
     */
    resetMetrics() {
        this.metrics.clear();
        console.log("📊 Performance metrics reset");
    }

    /**
     * Monitor database connection pool
     */
    async getDatabasePoolStats() {
        try {
            const pool = knex.client.pool;
            
            return {
                used: pool.numUsed(),
                free: pool.numFree(),
                pending: pool.numPendingAcquires(),
                pendingCreates: pool.numPendingCreates(),
                min: pool.min,
                max: pool.max,
                acquireTimeoutMillis: pool.acquireTimeoutMillis,
                createTimeoutMillis: pool.createTimeoutMillis,
                idleTimeoutMillis: pool.idleTimeoutMillis
            };
        } catch (error) {
            console.error("❌ Error getting database pool stats:", error);
            return null;
        }
    }

    /**
     * Get system performance metrics
     */
    getSystemMetrics() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        return {
            memory: {
                rss: Math.round(memUsage.rss / 1024 / 1024), // MB
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
                external: Math.round(memUsage.external / 1024 / 1024), // MB
                arrayBuffers: Math.round(memUsage.arrayBuffers / 1024 / 1024) // MB
            },
            cpu: {
                user: cpuUsage.user,
                system: cpuUsage.system
            },
            uptime: Math.round(process.uptime()),
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch
        };
    }

    /**
     * Analyze query performance and suggest optimizations
     */
    getOptimizationSuggestions() {
        const suggestions = [];
        const metrics = this.getMetrics();

        for (const [operation, metric] of Object.entries(metrics)) {
            // Suggest optimization for slow operations
            if (parseFloat(metric.averageTime) > this.slowQueryThreshold) {
                suggestions.push({
                    type: 'slow_query',
                    operation,
                    issue: `Average query time (${metric.averageTime}ms) exceeds threshold`,
                    suggestion: 'Consider adding database indexes or optimizing the query'
                });
            }

            // Suggest optimization for frequently called operations
            if (parseInt(metric.count) > 100 && parseFloat(metric.averageTime) > 100) {
                suggestions.push({
                    type: 'frequent_slow_query',
                    operation,
                    issue: `Frequently called operation (${metric.count} times) with moderate latency`,
                    suggestion: 'Consider caching results or optimizing the query'
                });
            }

            // Suggest caching for high-frequency operations
            if (parseInt(metric.count) > 50) {
                suggestions.push({
                    type: 'caching_opportunity',
                    operation,
                    issue: `High frequency operation (${metric.count} calls)`,
                    suggestion: 'Consider implementing caching for this operation'
                });
            }
        }

        return suggestions;
    }

    /**
     * Generate performance report
     */
    async generateReport() {
        const metrics = this.getMetrics();
        const systemMetrics = this.getSystemMetrics();
        const dbPoolStats = await this.getDatabasePoolStats();
        const suggestions = this.getOptimizationSuggestions();

        return {
            timestamp: new Date().toISOString(),
            queryMetrics: metrics,
            systemMetrics,
            databasePool: dbPoolStats,
            optimizationSuggestions: suggestions,
            summary: {
                totalOperations: Object.values(metrics).reduce((sum, m) => sum + parseInt(m.count), 0),
                averageResponseTime: this.calculateOverallAverage(metrics),
                slowQueryCount: Object.values(metrics).reduce((sum, m) => sum + parseInt(m.slowQueries), 0),
                memoryUsageMB: systemMetrics.memory.heapUsed,
                uptimeHours: Math.round(systemMetrics.uptime / 3600)
            }
        };
    }

    /**
     * Calculate overall average response time
     */
    calculateOverallAverage(metrics) {
        const operations = Object.values(metrics);
        if (operations.length === 0) return 0;

        const totalTime = operations.reduce((sum, m) => sum + parseFloat(m.totalTime), 0);
        const totalCount = operations.reduce((sum, m) => sum + parseInt(m.count), 0);

        return totalCount > 0 ? (totalTime / totalCount).toFixed(2) : 0;
    }

    /**
     * Monitor specific analytics operations
     */
    monitorAnalyticsOperation(operationName, operation) {
        return async (...args) => {
            const timer = this.startTimer(`analytics_${operationName}`);
            try {
                const result = await operation(...args);
                timer.end();
                return result;
            } catch (error) {
                timer.end();
                throw error;
            }
        };
    }
}

module.exports = new PerformanceMonitor();
