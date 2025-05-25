/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('links', function(table) {
        table.string('meta_title', 255);
        table.text('meta_description');
        table.string('meta_image', 2040);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.alterTable('links', function(table) {
        table.dropColumn('meta_title');
        table.dropColumn('meta_description');
        table.dropColumn('meta_image');
    });
};