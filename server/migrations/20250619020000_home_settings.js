const models = require("../models");

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
async function up(knex) {
    await models.createHomeSettingsTable(knex);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
async function down(knex) {
    await knex.schema.dropTableIfExists("home_settings");
}

module.exports = {
    up,
    down
};
