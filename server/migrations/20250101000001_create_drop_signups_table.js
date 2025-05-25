/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('drop_signups', function(table) {
        table.increments('id').primary();
        table.integer('drop_id').unsigned().notNullable();
        table.string('email', 255).notNullable();
        table.string('phone', 20);
        table.string('name', 100);
        table.string('ip_address', 45);
        table.string('user_agent', 500);
        table.string('referrer', 2040);
        table.boolean('email_verified').defaultTo(false);
        table.boolean('phone_verified').defaultTo(false);
        table.boolean('notified').defaultTo(false);
        table.datetime('notified_at');
        table.timestamps(true, true);
        
        // Foreign key constraint
        table.foreign('drop_id').references('id').inTable('drops').onDelete('CASCADE');
        
        // Unique constraint to prevent duplicate signups
        table.unique(['drop_id', 'email']);
        
        // Indexes for performance
        table.index(['drop_id']);
        table.index(['email']);
        table.index(['created_at']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('drop_signups');
};
