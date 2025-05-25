async function createDropSignupTable(knex) {
    const hasTable = await knex.schema.hasTable("drop_signups");
    if (!hasTable) {
        await knex.schema.createTable("drop_signups", table => {
            table.increments("id").primary();
            table
                .integer("drop_id")
                .unsigned()
                .notNullable()
                .references("id")
                .inTable("drops")
                .onDelete("CASCADE");
            table.string("email", 255).notNullable();
            table.string("phone", 20);
            table.string("name", 100);
            table.string("ip_address", 45);
            table.string("user_agent", 500);
            table.string("referrer", 2040);
            table.boolean("email_verified").defaultTo(false);
            table.boolean("phone_verified").defaultTo(false);
            table.boolean("notified").defaultTo(false);
            table.datetime("notified_at");
            table.timestamps(false, true);

            // Unique constraint to prevent duplicate signups
            table.unique(["drop_id", "email"]);

            // Indexes for performance
            table.index(["drop_id"]);
            table.index(["email"]);
            table.index(["created_at"]);
        });
    }
}

module.exports = {
    createDropSignupTable
};