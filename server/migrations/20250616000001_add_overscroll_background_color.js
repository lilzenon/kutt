/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    await knex.schema.alterTable('drops', function(table) {
        table.string('overscroll_background_color', 7).defaultTo('#ffffff');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.alterTable('drops', function(table) {
        table.dropColumn('overscroll_background_color');
    });
};
