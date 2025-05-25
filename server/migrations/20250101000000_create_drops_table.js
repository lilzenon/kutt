/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('drops', function(table) {
        table.increments('id').primary();
        table.string('title', 255).notNullable();
        table.text('description');
        table.string('slug', 100).notNullable().unique();
        table.string('cover_image', 2040);
        table.string('background_color', 7).defaultTo('#ffffff');
        table.string('text_color', 7).defaultTo('#000000');
        table.string('button_color', 7).defaultTo('#007bff');
        table.string('button_text', 50).defaultTo('Get Notified');
        table.text('custom_css');
        table.boolean('is_active').defaultTo(true);
        table.boolean('collect_email').defaultTo(true);
        table.boolean('collect_phone').defaultTo(false);
        table.datetime('launch_date');
        table.string('redirect_url', 2040);
        table.text('thank_you_message');
        table.integer('user_id').unsigned().notNullable();
        table.timestamps(true, true);
        
        // Foreign key constraint
        table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
        
        // Indexes for performance
        table.index(['user_id']);
        table.index(['slug']);
        table.index(['is_active']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('drops');
};
