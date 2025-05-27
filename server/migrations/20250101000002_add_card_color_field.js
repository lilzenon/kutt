/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    // Check if the card_color column already exists
    const hasCardColor = await knex.schema.hasColumn('drops', 'card_color');
    
    if (!hasCardColor) {
        await knex.schema.alterTable('drops', function(table) {
            table.string('card_color', 7).defaultTo('#ffffff');
        });
        
        // Set default card color to white for existing drops
        await knex('drops').update({
            card_color: '#ffffff'
        });
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.alterTable('drops', function(table) {
        table.dropColumn('card_color');
    });
};
