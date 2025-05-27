/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    // Add form_field_color column to drops table
    await knex.schema.table('drops', function(table) {
        table.string('form_field_color', 7).defaultTo('#ffffff');
    });
    
    console.log('Added form_field_color column to drops table');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    // Remove form_field_color column from drops table
    await knex.schema.table('drops', function(table) {
        table.dropColumn('form_field_color');
    });
    
    console.log('Removed form_field_color column from drops table');
};
