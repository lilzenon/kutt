const knex = require("../knex");

async function get() {
    const [settings] = await knex("home_settings")
        .select("*")
        .orderBy("id", "desc")
        .limit(1);
    
    return settings || {
        event_title: "EVENT TITLE",
        artist_name: "Artist Name",
        event_date: new Date("2025-03-29T21:00:00"),
        event_address: "101 Address Drive, Asbury Park, NJ",
        event_image: null,
        tickets_url: "https://embed.posh.vip/ticket-iframe/680fb268087c97aeac2468cb/",
        instagram_url: null,
        tiktok_url: null,
        twitter_url: null,
        email_url: null
    };
}

async function update(params, userId) {
    const updateData = {
        ...params,
        updated_by_id: userId,
        updated_at: knex.fn.now()
    };

    // Check if settings exist
    const existing = await knex("home_settings").first();
    
    if (existing) {
        // Update existing settings
        const [updated] = await knex("home_settings")
            .where("id", existing.id)
            .update(updateData, "*");
        return updated;
    } else {
        // Create new settings
        const [created] = await knex("home_settings")
            .insert(updateData, "*");
        return created;
    }
}

async function getForAdmin() {
    const settings = await get();
    
    // Format date for admin form
    if (settings.event_date) {
        settings.event_date_formatted = new Date(settings.event_date).toISOString().slice(0, 16);
    }
    
    return settings;
}

module.exports = {
    get,
    update,
    getForAdmin
};
