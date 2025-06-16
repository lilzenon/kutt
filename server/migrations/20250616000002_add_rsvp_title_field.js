/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    await knex.schema.alterTable('drops', function(table) {
        table.string('rsvp_title', 30).defaultTo('Get Notified');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.alterTable('drops', function(table) {
        table.dropColumn('rsvp_title');
    });
};
