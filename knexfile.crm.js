// 🚀 CRM DATABASE KNEX CONFIGURATION
// Separate configuration for CRM database migrations and operations

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "securekey";
}

const env = require("./server/env");

console.log("🚀 CRM Database Configuration:");
console.log(`   Host: ${env.CRM_DB_HOST || env.DB_HOST}`);
console.log(`   Database: ${env.CRM_DB_NAME || `${env.DB_NAME}_crm`}`);
console.log(`   User: ${env.CRM_DB_USER || env.DB_USER}`);
console.log(`   SSL: ${env.CRM_DB_SSL || env.DB_SSL}`);

module.exports = {
  client: env.CRM_DB_CLIENT || env.DB_CLIENT,
  connection: {
    host: env.CRM_DB_HOST || env.DB_HOST,
    port: env.CRM_DB_PORT || env.DB_PORT,
    database: env.CRM_DB_NAME || `${env.DB_NAME}_crm`,
    user: env.CRM_DB_USER || env.DB_USER,
    password: env.CRM_DB_PASSWORD || env.DB_PASSWORD,
    ssl: env.CRM_DB_SSL || env.DB_SSL,
    pool: {
      min: env.CRM_DB_POOL_MIN || 2,
      max: env.CRM_DB_POOL_MAX || 10
    }
  },
  useNullAsDefault: true,
  migrations: {
    tableName: "knex_migrations_crm",
    directory: "server/migrations/crm",
    disableMigrationsListValidation: true,
  },
  seeds: {
    directory: "server/seeds/crm"
  }
};
