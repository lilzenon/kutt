async function createDropTable(knex) {
    const hasTable = await knex.schema.hasTable("drops");
    if (!hasTable) {
        await knex.schema.createTable("drops", table => {
            table.increments("id").primary();
            table.string("title", 255).notNullable();
            table.text("description");
            table.text("sub_header");
            table.string("slug", 100).notNullable().unique();
            table.string("cover_image", 2040);
            table.string("background_color", 7).defaultTo("#ffffff");
            table.string("text_color", 7).defaultTo("#000000");
            table.string("button_color", 7).defaultTo("#007bff");
            table.string("button_text", 50).defaultTo("Get Notified");
            table.text("custom_css");
            table.boolean("is_active").defaultTo(true);
            table.boolean("collect_email").defaultTo(true);
            table.boolean("collect_phone").defaultTo(false);
            table.datetime("launch_date");
            table.string("redirect_url", 2040);
            table.text("thank_you_message");
            table
                .integer("user_id")
                .unsigned()
                .notNullable()
                .references("id")
                .inTable("users")
                .onDelete("CASCADE");
            table.timestamps(false, true);

            // Indexes for performance
            table.index(["user_id"]);
            table.index(["slug"]);
            table.index(["is_active"]);
        });
    }
}

// Generate a unique slug from title
function generateSlug(title, existingSlugs = []) {
    let slug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');

    if (slug.length > 100) {
        slug = slug.substring(0, 100).replace(/-[^-]*$/, '');
    }

    let finalSlug = slug;
    let counter = 1;

    while (existingSlugs.includes(finalSlug)) {
        finalSlug = `${slug}-${counter}`;
        counter++;
    }

    return finalSlug;
}

module.exports = {
    createDropTable,
    generateSlug
};