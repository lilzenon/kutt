/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    // Update any existing home_settings records that have the invalid default Posh URL
    const invalidUrl = 'https://embed.posh.vip/ticket-iframe/680fb268087c97aeac2468cb/';
    
    const updatedRows = await knex('home_settings')
        .where('tickets_url', invalidUrl)
        .update({
            tickets_url: '' // Set to empty string to avoid 404 errors
        });
    
    if (updatedRows > 0) {
        console.log(`✅ Updated ${updatedRows} home_settings records to remove invalid Posh URL`);
    } else {
        console.log('ℹ️ No home_settings records found with invalid Posh URL');
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    // Rollback: restore the original URL (though it's invalid)
    return knex('home_settings')
        .where('tickets_url', '')
        .update({
            tickets_url: 'https://embed.posh.vip/ticket-iframe/680fb268087c97aeac2468cb/'
        });
};
