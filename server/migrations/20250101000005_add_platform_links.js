/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    // Check if platform link columns already exist
    const hasWebsiteLink = await knex.schema.hasColumn('drops', 'website_link');
    const hasInstagramLink = await knex.schema.hasColumn('drops', 'instagram_link');
    const hasTwitterLink = await knex.schema.hasColumn('drops', 'twitter_link');
    const hasYoutubeLink = await knex.schema.hasColumn('drops', 'youtube_link');
    const hasSpotifyLink = await knex.schema.hasColumn('drops', 'spotify_link');
    const hasTiktokLink = await knex.schema.hasColumn('drops', 'tiktok_link');
    
    if (!hasWebsiteLink || !hasInstagramLink || !hasTwitterLink || !hasYoutubeLink || !hasSpotifyLink || !hasTiktokLink) {
        await knex.schema.alterTable('drops', function(table) {
            if (!hasWebsiteLink) {
                table.string('website_link', 2040);
            }
            if (!hasInstagramLink) {
                table.string('instagram_link', 2040);
            }
            if (!hasTwitterLink) {
                table.string('twitter_link', 2040);
            }
            if (!hasYoutubeLink) {
                table.string('youtube_link', 2040);
            }
            if (!hasSpotifyLink) {
                table.string('spotify_link', 2040);
            }
            if (!hasTiktokLink) {
                table.string('tiktok_link', 2040);
            }
        });
        
        console.log('Added platform link columns to drops table');
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.alterTable('drops', function(table) {
        table.dropColumn('website_link');
        table.dropColumn('instagram_link');
        table.dropColumn('twitter_link');
        table.dropColumn('youtube_link');
        table.dropColumn('spotify_link');
        table.dropColumn('tiktok_link');
    });
};
