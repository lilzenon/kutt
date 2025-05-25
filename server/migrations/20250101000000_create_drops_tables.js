const models = require("../models");

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    await models.createDropTable(knex);
    await models.createDropSignupTable(knex);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTableIfExists('drop_signups')
        .then(() => knex.schema.dropTableIfExists('drops'));
};
