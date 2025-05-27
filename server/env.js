require("dotenv").config();
const { cleanEnv, num, str, bool } = require("envalid");
const { readFileSync } = require("node:fs");

const supportedDBClients = [
    "pg",
    "pg-native",
    "sqlite3",
    "better-sqlite3",
    "mysql",
    "mysql2"
];

// make sure custom alphabet is not empty
if (process.env.LINK_CUSTOM_ALPHABET === "") {
    delete process.env.LINK_CUSTOM_ALPHABET;
}

// make sure jwt secret is not empty
if (process.env.JWT_SECRET === "") {
    delete process.env.JWT_SECRET;
}

// if is started with the --production argument, then set NODE_ENV to production
if (process.argv.includes("--production")) {
    process.env.NODE_ENV = "production";
}

const spec = {
    // 🌍 NODE ENVIRONMENT
    NODE_ENV: str({ choices: ["development", "production", "test"], default: "development" }),

    PORT: num({ default: 3000 }),
    SITE_NAME: str({ example: "Kutt", default: "Kutt" }),
    DEFAULT_DOMAIN: str({ example: "kutt.it", default: "localhost:3000" }),
    LINK_LENGTH: num({ default: 6 }),
    LINK_CUSTOM_ALPHABET: str({ default: "abcdefghkmnpqrstuvwxyzABCDEFGHKLMNPQRSTUVWXYZ23456789" }),
    TRUST_PROXY: bool({ default: true }),
    DB_CLIENT: str({ choices: supportedDBClients, default: "better-sqlite3" }),
    DB_FILENAME: str({ default: "db/data" }),
    DB_HOST: str({ default: "localhost" }),
    DB_PORT: num({ default: 5432 }),
    DB_NAME: str({ default: "kutt" }),
    DB_USER: str({ default: "postgres" }),
    DB_PASSWORD: str({ default: "" }),
    DB_SSL: bool({ default: false }),
    DB_POOL_MIN: num({ default: 0 }),
    DB_POOL_MAX: num({ default: 10 }),

    // 🚀 CRM DATABASE CONFIGURATION (OPTIONAL)
    CRM_DB_CLIENT: str({ choices: supportedDBClients, default: "pg" }),
    CRM_DB_HOST: str({ example: "dpg-d0qvadbipnbc73eppoh0-a.virginia-postgres.render.com", default: "" }),
    CRM_DB_PORT: num({ default: 5432 }),
    CRM_DB_NAME: str({ example: "b2b_crm", default: "" }),
    CRM_DB_USER: str({ example: "b2b_admin", default: "" }),
    CRM_DB_PASSWORD: str({ default: "" }),
    CRM_DB_SSL: bool({ default: true }),
    CRM_DB_POOL_MIN: num({ default: 2 }),
    CRM_DB_POOL_MAX: num({ default: 10 }),

    // 📱 TWILIO SMS CONFIGURATION
    TWILIO_ACCOUNT_SID: str({ example: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", default: "" }),
    TWILIO_AUTH_TOKEN: str({ example: "your_auth_token_here", default: "" }),
    TWILIO_PHONE_NUMBER: str({ example: "+1234567890", default: "" }),
    TWILIO_MESSAGING_SERVICE_SID: str({ example: "MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", default: "" }),
    TWILIO_WEBHOOK_SECRET: str({ default: "" }),

    // 📨 SMS SETTINGS
    SMS_ENABLED: bool({ default: false }),
    SMS_FROM_NAME: str({ default: "BOUNCE2BOUNCE" }),
    SMS_OPT_OUT_KEYWORDS: str({ default: "STOP,UNSUBSCRIBE,QUIT,END,CANCEL" }),

    // 🌐 SITE CONFIGURATION
    SITE_URL: str({ example: "https://your-domain.com", default: "http://localhost:3000" }),
    REDIS_ENABLED: bool({ default: false }),
    REDIS_HOST: str({ default: "127.0.0.1" }),
    REDIS_PORT: num({ default: 6379 }),
    REDIS_PASSWORD: str({ default: "" }),
    REDIS_DB: num({ default: 0 }),
    DISALLOW_ANONYMOUS_LINKS: bool({ default: true }),
    DISALLOW_REGISTRATION: bool({ default: true }),
    SERVER_IP_ADDRESS: str({ default: "" }),
    SERVER_CNAME_ADDRESS: str({ default: "" }),
    CUSTOM_DOMAIN_USE_HTTPS: bool({ default: false }),
    JWT_SECRET: str({ devDefault: "securekey" }),
    MAIL_ENABLED: bool({ default: false }),
    MAIL_HOST: str({ default: "" }),
    MAIL_PORT: num({ default: 587 }),
    MAIL_SECURE: bool({ default: false }),
    MAIL_USER: str({ default: "" }),
    MAIL_FROM: str({ default: "", example: "Kutt <support@kutt.it>" }),
    MAIL_PASSWORD: str({ default: "" }),
    ENABLE_RATE_LIMIT: bool({ default: false }),
    REPORT_EMAIL: str({ default: "" }),
    CONTACT_EMAIL: str({ default: "" }),
    NODE_APP_INSTANCE: num({ default: 0 }),
};

for (const key in spec) {
    const file_key = key + "_FILE";
    if (!(file_key in process.env)) continue;
    try {
        process.env[key] = readFileSync(process.env[file_key], "utf8").trim();
    } catch {
        // on error, env_FILE just doesn't get applied.
    }
}

const env = cleanEnv(process.env, spec);

module.exports = env;