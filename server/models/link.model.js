async function createLinkTable(knex) {
    const hasTable = await knex.schema.hasTable("links");

    if (!hasTable) {
        await knex.schema.createTable("links", table => {
            table.increments("id").primary();
            table.string("address").notNullable();
            table.string("description");
            table
                .boolean("banned")
                .notNullable()
                .defaultTo(false);
            table
                .integer("banned_by_id")
                .unsigned()
                .references("id")
                .inTable("users");
            table
                .integer("domain_id")
                .unsigned()
                .references("id")
                .inTable("domains");
            table.string("password");
            table.dateTime("expire_in");
            table.string("target", 2040).notNullable();
            table
                .integer("user_id")
                .unsigned();
            table
                .foreign("user_id")
                .references("id")
                .inTable("users")
                .onDelete("CASCADE")
                .withKeyName("links_user_id_foreign");
            table
                .integer("visit_count")
                .notNullable()
                .defaultTo(0);
            table
                .uuid("uuid")
                .notNullable()
                .defaultTo(knex.fn.uuid());
            table.timestamps(false, true);
        });
    }

    const hasUUID = await knex.schema.hasColumn("links", "uuid");
    if (!hasUUID) {
        await knex.schema.alterTable("links", table => {
            table
                .uuid("uuid")
                .notNullable()
                .defaultTo(knex.fn.uuid());
        });
    }

    // Add metadata columns for Open Graph tags
    const hasMetaTitle = await knex.schema.hasColumn("links", "meta_title");
    if (!hasMetaTitle) {
        await knex.schema.alterTable("links", table => {
            table.string("meta_title", 255);
            table.text("meta_description");
            table.string("meta_image", 2040);
        });
    }
}

module.exports = {
    createLinkTable
}