/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    // Check if the missing platform link columns exist
    const hasAppleMusicUrl = await knex.schema.hasColumn('drops', 'apple_music_url');
    const hasSoundcloudUrl = await knex.schema.hasColumn('drops', 'soundcloud_url');
    
    if (!hasAppleMusicUrl || !hasSoundcloudUrl) {
        await knex.schema.alterTable('drops', function(table) {
            if (!hasAppleMusicUrl) {
                table.string('apple_music_url', 2040);
            }
            if (!hasSoundcloudUrl) {
                table.string('soundcloud_url', 2040);
            }
        });
        
        console.log('Added missing platform link columns to drops table');
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    // Remove the platform link columns
    await knex.schema.alterTable('drops', function(table) {
        table.dropColumn('apple_music_url');
        table.dropColumn('soundcloud_url');
    });
    
    console.log('Removed platform link columns from drops table');
};
