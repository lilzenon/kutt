/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    console.log('🎨 Adding gradient_data field to drops table...');
    
    // Check if the gradient_data column already exists
    const hasGradientData = await knex.schema.hasColumn('drops', 'gradient_data');
    
    if (!hasGradientData) {
        await knex.schema.alterTable('drops', function(table) {
            table.text('gradient_data'); // Store JSON gradient configuration
        });
        
        // Set default gradient data for existing drops with gradient background type
        const defaultGradientData = JSON.stringify({
            type: 'linear',
            angle: 90,
            stops: [
                { color: '#667eea', position: 0 },
                { color: '#764ba2', position: 100 }
            ]
        });
        
        await knex('drops')
            .where('background_type', 'gradient')
            .whereNull('gradient_data')
            .update({
                gradient_data: defaultGradientData
            });
        
        console.log('✅ gradient_data field added to drops table');
    } else {
        console.log('✅ gradient_data field already exists');
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    console.log('🔄 Removing gradient_data field from drops table...');
    
    await knex.schema.alterTable('drops', function(table) {
        table.dropColumn('gradient_data');
    });
    
    console.log('✅ gradient_data field removed from drops table');
};
