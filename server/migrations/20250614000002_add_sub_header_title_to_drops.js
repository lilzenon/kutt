/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    await knex.schema.table('drops', function(table) {
        table.string('sub_header_title', 100).defaultTo('About');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.table('drops', function(table) {
        table.dropColumn('sub_header_title');
    });
};
