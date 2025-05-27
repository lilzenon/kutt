/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    // Update existing drops that have null values for the new color fields
    
    // Set default title_color for drops that don't have it
    await knex('drops')
        .whereNull('title_color')
        .update({
            title_color: '#000000'
        });
    
    // Set default description_color for drops that don't have it
    await knex('drops')
        .whereNull('description_color')
        .update({
            description_color: '#666666'
        });
    
    // Set default card_color for drops that don't have it
    await knex('drops')
        .whereNull('card_color')
        .update({
            card_color: '#ffffff'
        });
    
    // Ensure button_color has a default if null
    await knex('drops')
        .whereNull('button_color')
        .update({
            button_color: '#007bff'
        });
    
    // Ensure background_color has a default if null
    await knex('drops')
        .whereNull('background_color')
        .update({
            background_color: '#ffffff'
        });
    
    console.log('Updated existing drops with default color values');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    // No rollback needed for data updates
    return Promise.resolve();
};
