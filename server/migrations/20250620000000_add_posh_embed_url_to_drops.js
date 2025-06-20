/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    // Check if the posh_embed_url column already exists
    const hasPoshEmbedUrl = await knex.schema.hasColumn('drops', 'posh_embed_url');
    
    if (!hasPoshEmbedUrl) {
        await knex.schema.alterTable('drops', function(table) {
            table.string('posh_embed_url', 2040).nullable();
        });
        
        console.log('✅ Added posh_embed_url column to drops table');
    } else {
        console.log('ℹ️ posh_embed_url column already exists in drops table');
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.alterTable('drops', function(table) {
        table.dropColumn('posh_embed_url');
    });
};
