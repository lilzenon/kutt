// this configuration is for migrations only
// and since jwt secret is not required, it's set to a placehodler string to bypass env validation
if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = "securekey";
}

// Set minimal CRM env vars to avoid validation errors during migration
process.env.CRM_DB_HOST = process.env.CRM_DB_HOST || 'localhost';
process.env.CRM_DB_NAME = process.env.CRM_DB_NAME || 'crm';
process.env.CRM_DB_USER = process.env.CRM_DB_USER || 'user';
process.env.CRM_DB_PASSWORD = process.env.CRM_DB_PASSWORD || 'password';

const env = require("./server/env");

const isSQLite = env.DB_CLIENT === "sqlite3" || env.DB_CLIENT === "better-sqlite3";

module.exports = {
    client: env.DB_CLIENT,
    connection: {
        ...(isSQLite && { filename: env.DB_FILENAME }),
        host: env.DB_HOST,
        database: env.DB_NAME,
        user: env.DB_USER,
        port: env.DB_PORT,
        password: env.DB_PASSWORD,
        ssl: env.DB_SSL,
    },
    useNullAsDefault: true,
    migrations: {
        tableName: "knex_migrations",
        directory: "server/migrations",
        disableMigrationsListValidation: true,
    }
};