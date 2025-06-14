/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    console.log('🎨 Adding enhanced styling fields to drops table...');
    
    // Check which columns already exist
    const hasButtonTextColor = await knex.schema.hasColumn('drops', 'button_text_color');
    const hasBackgroundType = await knex.schema.hasColumn('drops', 'background_type');
    const hasCardBackgroundType = await knex.schema.hasColumn('drops', 'card_background_type');
    
    await knex.schema.alterTable('drops', function(table) {
        // Button text color
        if (!hasButtonTextColor) {
            table.string('button_text_color', 7).defaultTo('#ffffff');
        }
        
        // Background type (solid or gradient)
        if (!hasBackgroundType) {
            table.enum('background_type', ['solid', 'gradient']).defaultTo('gradient');
        }
        
        // Card background type
        if (!hasCardBackgroundType) {
            table.enum('card_background_type', ['solid_white', 'solid_dark', 'translucent_light', 'translucent_dark']).defaultTo('solid_dark');
        }
    });
    
    // Set default values for existing drops
    if (!hasButtonTextColor) {
        await knex('drops')
            .whereNull('button_text_color')
            .update({
                button_text_color: '#ffffff'
            });
    }
    
    if (!hasBackgroundType) {
        await knex('drops')
            .whereNull('background_type')
            .update({
                background_type: 'gradient'
            });
    }
    
    if (!hasCardBackgroundType) {
        await knex('drops')
            .whereNull('card_background_type')
            .update({
                card_background_type: 'solid_dark'
            });
    }
    
    console.log('✅ Enhanced styling fields added to drops table');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    console.log('🔄 Removing enhanced styling fields from drops table...');
    
    await knex.schema.alterTable('drops', function(table) {
        table.dropColumn('button_text_color');
        table.dropColumn('background_type');
        table.dropColumn('card_background_type');
    });
    
    console.log('✅ Enhanced styling fields removed from drops table');
};
