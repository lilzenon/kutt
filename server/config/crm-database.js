const knex = require("knex");
const env = require("../env");

/**
 * 🚀 FUTURE-PROOF CRM DATABASE CONFIGURATION
 *
 * ARCHITECTURE PRINCIPLES:
 * - Microservices-ready: Separate database for CRM data
 * - Event-driven: Supports async communication between services
 * - GDPR/CCPA compliant: Built-in consent and privacy controls
 * - Twilio-ready: Optimized for SMS marketing integration
 * - Scalable: Designed for millions of contacts and interactions
 * - Modular: Easy to extend with new features and integrations
 */

// CRM Database Connection (Separate from main Kutt database)
let crmDb = null;

// Only initialize CRM database if credentials are provided
if (env.CRM_DB_HOST && env.CRM_DB_NAME && env.CRM_DB_USER && env.CRM_DB_PASSWORD) {
    try {
        crmDb = knex({
            client: env.CRM_DB_CLIENT || env.DB_CLIENT,
            connection: {
                host: env.CRM_DB_HOST,
                port: env.CRM_DB_PORT || 5432,
                database: env.CRM_DB_NAME,
                user: env.CRM_DB_USER,
                password: env.CRM_DB_PASSWORD,
                ssl: env.CRM_DB_SSL !== 'false', // Default to true for production
                pool: {
                    min: env.CRM_DB_POOL_MIN || 2,
                    max: env.CRM_DB_POOL_MAX || 10
                }
            },
            useNullAsDefault: true,
            // Performance optimizations for CRM workloads
            acquireConnectionTimeout: 60000,
            asyncStackTraces: env.NODE_ENV === 'development',
            debug: env.NODE_ENV === 'development'
        });

        console.log('🚀 CRM Database configuration loaded');
    } catch (error) {
        console.warn('⚠️ CRM Database configuration failed:', error.message);
        crmDb = null;
    }
} else {
    console.log('ℹ️ CRM Database not configured (missing credentials)');
}

/**
 * CRM Database Health Check
 */
async function healthCheck() {
    try {
        await crmDb.raw('SELECT 1');
        return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
        console.error('🚨 CRM Database health check failed:', error);
        return {
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Initialize CRM Database Connection
 */
async function initialize() {
    try {
        console.log('🚀 Initializing CRM Database connection...');

        // Test connection
        await crmDb.raw('SELECT 1');

        console.log('✅ CRM Database connected successfully');
        console.log(`📊 Database: ${env.CRM_DB_NAME || `${env.DB_NAME}_crm`}`);
    console.log(`🔗 Host: ${env.CRM_DB_HOST || env.DB_HOST}`);

    return true;
  } catch (error) {
    console.error('🚨 Failed to initialize CRM Database:', error);
    throw error;
  }
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  try {
    console.log('🔄 Shutting down CRM Database connection...');
    await crmDb.destroy();
    console.log('✅ CRM Database connection closed');
  } catch (error) {
    console.error('🚨 Error during CRM Database shutdown:', error);
  }
}

/**
 * Transaction wrapper for CRM operations
 */
async function transaction(callback) {
  const trx = await crmDb.transaction();
  try {
    const result = await callback(trx);
    await trx.commit();
    return result;
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}

/**
 * Batch operation helper for high-volume operations
 */
async function batchInsert(tableName, data, chunkSize = 1000) {
  const chunks = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    chunks.push(data.slice(i, i + chunkSize));
  }

  const results = [];
  for (const chunk of chunks) {
    const result = await crmDb.batchInsert(tableName, chunk);
    results.push(...result);
  }

  return results;
}

/**
 * Performance monitoring
 */
function enableQueryLogging() {
  if (env.NODE_ENV === 'development') {
    crmDb.on('query', (query) => {
      console.log('🔍 CRM Query:', query.sql);
      if (query.bindings && query.bindings.length > 0) {
        console.log('📎 Bindings:', query.bindings);
      }
    });
  }
}

// Enable query logging in development
if (env.NODE_ENV === 'development') {
  enableQueryLogging();
}

module.exports = {
  crmDb,
  initialize,
  shutdown,
  healthCheck,
  transaction,
  batchInsert,
  enableQueryLogging
};