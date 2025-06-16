/**
 * Contact Book Error Handler Service
 * Comprehensive error handling and prevention system
 */

class ContactBookErrorHandler {
    constructor() {
        this.errorCounts = new Map();
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
    }

    /**
     * Wrap database operations with comprehensive error handling
     */
    async executeWithRetry(operation, context = 'unknown') {
        let lastError;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                console.log(`📊 Executing ${context} (attempt ${attempt}/${this.maxRetries})`);
                const result = await operation();

                // Reset error count on success
                this.errorCounts.delete(context);

                return result;
            } catch (error) {
                lastError = error;

                // Log detailed error information
                this.logError(error, context, attempt);

                // Track error frequency
                this.trackError(context);

                // Check if we should retry
                if (attempt < this.maxRetries && this.isRetryableError(error)) {
                    console.log(`⏳ Retrying ${context} in ${this.retryDelay}ms...`);
                    await this.delay(this.retryDelay);
                    continue;
                }

                // If all retries failed, throw enhanced error
                throw this.enhanceError(error, context, attempt);
            }
        }

        throw lastError;
    }

    /**
     * Enhanced error logging with context
     */
    logError(error, context, attempt) {
        console.error(`❌ Error in ${context} (attempt ${attempt}):`, {
            message: error.message,
            code: error.code,
            severity: error.severity,
            position: error.position,
            hint: error.hint,
            detail: error.detail,
            stack: error.stack ? error.stack.split('\n').slice(0, 5).join('\n') : 'No stack trace' // Truncated stack
        });
    }

    /**
     * Track error frequency for monitoring
     */
    trackError(context) {
        const count = this.errorCounts.get(context) || 0;
        this.errorCounts.set(context, count + 1);

        // Alert if error frequency is high
        if (count > 5) {
            console.warn(`⚠️ High error frequency for ${context}: ${count} errors`);
        }
    }

    /**
     * Determine if error is retryable
     */
    isRetryableError(error) {
        // PostgreSQL error codes that are retryable
        const retryableCodes = [
            '40001', // serialization_failure
            '40P01', // deadlock_detected
            '53300', // too_many_connections
            '08000', // connection_exception
            '08003', // connection_does_not_exist
            '08006', // connection_failure
            '08001', // sqlclient_unable_to_establish_sqlconnection
            '08004', // sqlserver_rejected_establishment_of_sqlconnection
        ];

        // Syntax errors and schema errors are not retryable
        const nonRetryableCodes = [
            '42601', // syntax_error
            '42803', // grouping_error
            '42P01', // undefined_table
            '42703', // undefined_column
        ];

        if (nonRetryableCodes.includes(error.code)) {
            return false;
        }

        return retryableCodes.includes(error.code) ||
            (error.message && error.message.includes('connection')) ||
            (error.message && error.message.includes('timeout'));
    }

    /**
     * Enhance error with additional context
     */
    enhanceError(error, context, attempts) {
        const enhancedError = new Error(
            `Contact Book Error in ${context} after ${attempts} attempts: ${error.message}`
        );

        enhancedError.originalError = error;
        enhancedError.context = context;
        enhancedError.attempts = attempts;
        enhancedError.code = error.code;
        enhancedError.isContactBookError = true;

        return enhancedError;
    }

    /**
     * Validate query parameters to prevent SQL errors
     */
    validateQueryParams(params) {
        const errors = [];

        // Validate limit
        if (params.limit !== undefined) {
            if (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 1000) {
                errors.push('Limit must be an integer between 1 and 1000');
            }
        }

        // Validate offset
        if (params.offset !== undefined) {
            if (!Number.isInteger(params.offset) || params.offset < 0) {
                errors.push('Offset must be a non-negative integer');
            }
        }

        // Validate sortBy
        const validSortOptions = ['recent_activity', 'name', 'email', 'join_date', 'engagement'];
        if (params.sortBy && !validSortOptions.includes(params.sortBy)) {
            errors.push(`SortBy must be one of: ${validSortOptions.join(', ')}`);
        }

        // Validate search string
        if (params.search && typeof params.search !== 'string') {
            errors.push('Search must be a string');
        }

        // Validate groupId
        if (params.groupId !== undefined && params.groupId !== null) {
            if (!Number.isInteger(params.groupId) || params.groupId < 1) {
                errors.push('GroupId must be a positive integer');
            }
        }

        if (errors.length > 0) {
            throw new Error(`Invalid query parameters: ${errors.join(', ')}`);
        }
    }

    /**
     * Sanitize user input to prevent injection
     */
    sanitizeInput(input) {
        if (typeof input !== 'string') {
            return input;
        }

        // Remove potentially dangerous characters
        return input
            .replace(/[<>'"]/g, '') // Remove HTML/script chars
            .replace(/[;\-]/g, '') // Remove SQL comment chars
            .trim()
            .substring(0, 1000); // Limit length
    }

    /**
     * Validate contact identifier
     */
    validateContactIdentifier(identifier) {
        if (!identifier || typeof identifier !== 'string') {
            throw new Error('Contact identifier must be a non-empty string');
        }

        const sanitized = this.sanitizeInput(identifier);

        // Check if it looks like email or phone
        const isEmail = sanitized.includes('@');
        const isPhone = /^[\d\s\-\+\(\)\.]+$/.test(sanitized);

        if (!isEmail && !isPhone) {
            throw new Error('Contact identifier must be a valid email or phone number');
        }

        return sanitized;
    }

    /**
     * Create delay for retries
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get error statistics
     */
    getErrorStats() {
        return {
            errorCounts: Object.fromEntries(this.errorCounts),
            totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0)
        };
    }

    /**
     * Reset error tracking
     */
    resetErrorTracking() {
        this.errorCounts.clear();
        console.log('📊 Error tracking reset');
    }
}

module.exports = new ContactBookErrorHandler();