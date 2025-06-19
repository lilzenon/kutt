/**
 * Add event fields to drops table for event listing functionality
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    console.log('🎪 Adding event fields to drops table...');
    
    try {
        // Check if the new columns already exist to avoid errors
        const hasArtistName = await knex.schema.hasColumn('drops', 'artist_name');
        const hasEventDate = await knex.schema.hasColumn('drops', 'event_date');
        const hasEventAddress = await knex.schema.hasColumn('drops', 'event_address');
        const hasShowOnHomepage = await knex.schema.hasColumn('drops', 'show_on_homepage');
        
        if (!hasArtistName || !hasEventDate || !hasEventAddress || !hasShowOnHomepage) {
            await knex.schema.alterTable('drops', function(table) {
                if (!hasArtistName) {
                    table.string('artist_name', 100).nullable();
                    console.log('✅ Added artist_name column');
                }
                
                if (!hasEventDate) {
                    table.datetime('event_date').nullable();
                    console.log('✅ Added event_date column');
                }
                
                if (!hasEventAddress) {
                    table.string('event_address', 200).nullable();
                    console.log('✅ Added event_address column');
                }
                
                if (!hasShowOnHomepage) {
                    table.boolean('show_on_homepage').defaultTo(false);
                    console.log('✅ Added show_on_homepage column');
                }
            });
            
            // Add index for show_on_homepage for efficient homepage queries
            if (!hasShowOnHomepage) {
                await knex.schema.alterTable('drops', function(table) {
                    table.index(['show_on_homepage', 'is_active'], 'drops_homepage_active_index');
                });
                console.log('✅ Added index for homepage queries');
            }
            
            console.log('🎉 Event fields added to drops table successfully');
        } else {
            console.log('ℹ️ Event fields already exist in drops table');
        }
        
    } catch (error) {
        console.error('❌ Error adding event fields to drops table:', error);
        throw error;
    }
};

/**
 * Remove event fields from drops table
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    console.log('🔄 Removing event fields from drops table...');
    
    try {
        await knex.schema.alterTable('drops', function(table) {
            // Drop index first
            table.dropIndex(['show_on_homepage', 'is_active'], 'drops_homepage_active_index');
            
            // Drop columns
            table.dropColumn('artist_name');
            table.dropColumn('event_date');
            table.dropColumn('event_address');
            table.dropColumn('show_on_homepage');
        });
        
        console.log('✅ Event fields removed from drops table');
        
    } catch (error) {
        console.error('❌ Error removing event fields from drops table:', error);
        throw error;
    }
};
