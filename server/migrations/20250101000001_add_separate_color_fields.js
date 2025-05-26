/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    // Check if the new color columns already exist
    const hasTitleColor = await knex.schema.hasColumn('drops', 'title_color');
    const hasDescriptionColor = await knex.schema.hasColumn('drops', 'description_color');
    
    if (!hasTitleColor || !hasDescriptionColor) {
        await knex.schema.alterTable('drops', function(table) {
            if (!hasTitleColor) {
                table.string('title_color', 7).defaultTo('#000000');
            }
            if (!hasDescriptionColor) {
                table.string('description_color', 7).defaultTo('#666666');
            }
        });
        
        // Migrate existing text_color to title_color for existing drops
        if (!hasTitleColor) {
            await knex('drops').update({
                title_color: knex.ref('text_color')
            });
        }
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.alterTable('drops', function(table) {
        table.dropColumn('title_color');
        table.dropColumn('description_color');
    });
};
