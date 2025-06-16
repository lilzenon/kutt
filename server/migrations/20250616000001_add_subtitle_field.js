/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    console.log('🔄 Adding subtitle field to drops table...');
    
    // Check if subtitle column already exists
    const hasSubtitle = await knex.schema.hasColumn('drops', 'subtitle');
    
    if (!hasSubtitle) {
        await knex.schema.alterTable('drops', function(table) {
            table.string('subtitle', 500).nullable();
        });
        
        console.log('✅ subtitle field added to drops table');
    } else {
        console.log('ℹ️ subtitle field already exists in drops table');
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    console.log('🔄 Removing subtitle field from drops table...');
    
    await knex.schema.alterTable('drops', function(table) {
        table.dropColumn('subtitle');
    });
    
    console.log('✅ subtitle field removed from drops table');
};
