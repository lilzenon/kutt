async function createHomeSettingsTable(knex) {
    const hasTable = await knex.schema.hasTable("home_settings");
    if (!hasTable) {
        await knex.schema.createTable("home_settings", table => {
            table.increments("id").primary();
            table.string("event_title", 50).notNullable().defaultTo("EVENT TITLE");
            table.string("artist_name", 30).notNullable().defaultTo("Artist Name");
            table.dateTime("event_date").notNullable().defaultTo(knex.fn.now());
            table.string("event_address", 100).notNullable().defaultTo("101 Address Drive, Asbury Park, NJ");
            table.string("event_image").nullable(); // File path for uploaded image
            table.string("tickets_url", 500).nullable();
            table.string("instagram_url", 200).nullable();
            table.string("tiktok_url", 200).nullable();
            table.string("twitter_url", 200).nullable();
            table.string("email_url", 200).nullable();
            table
                .integer("updated_by_id")
                .unsigned()
                .references("id")
                .inTable("users")
                .onDelete("SET NULL");
            table
                .uuid("uuid")
                .notNullable()
                .defaultTo(knex.fn.uuid());
            table.timestamps(false, true);
        });

        // Insert default settings
        await knex("home_settings").insert({
            event_title: "EVENT TITLE",
            artist_name: "Artist Name",
            event_date: new Date("2025-03-29T21:00:00"),
            event_address: "101 Address Drive, Asbury Park, NJ",
            tickets_url: null,
            instagram_url: null,
            tiktok_url: null,
            twitter_url: null,
            email_url: null
        });
    }
}

module.exports = {
    createHomeSettingsTable
};