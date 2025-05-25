const { Model } = require("objection");

class Drop extends Model {
    static get tableName() {
        return "drops";
    }

    static get jsonSchema() {
        return {
            type: "object",
            required: ["title", "slug", "user_id"],
            properties: {
                id: { type: "integer" },
                title: { type: "string", minLength: 1, maxLength: 255 },
                description: { type: ["string", "null"] },
                slug: { type: "string", minLength: 1, maxLength: 100 },
                cover_image: { type: ["string", "null"], maxLength: 2040 },
                background_color: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                text_color: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                button_color: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                button_text: { type: "string", maxLength: 50 },
                custom_css: { type: ["string", "null"] },
                is_active: { type: "boolean" },
                collect_email: { type: "boolean" },
                collect_phone: { type: "boolean" },
                launch_date: { type: ["string", "null"] },
                redirect_url: { type: ["string", "null"], maxLength: 2040 },
                thank_you_message: { type: ["string", "null"] },
                user_id: { type: "integer" },
                created_at: { type: "string" },
                updated_at: { type: "string" }
            }
        };
    }

    static get relationMappings() {
        const User = require("./user.model");
        const DropSignup = require("./drop_signup.model");

        return {
            user: {
                relation: Model.BelongsToOneRelation,
                modelClass: User,
                join: {
                    from: "drops.user_id",
                    to: "users.id"
                }
            },
            signups: {
                relation: Model.HasManyRelation,
                modelClass: DropSignup,
                join: {
                    from: "drops.id",
                    to: "drop_signups.drop_id"
                }
            }
        };
    }

    $beforeInsert() {
        this.created_at = new Date().toISOString();
        this.updated_at = new Date().toISOString();
    }

    $beforeUpdate() {
        this.updated_at = new Date().toISOString();
    }

    // Generate a unique slug from title
    static generateSlug(title, existingSlugs = []) {
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

    // Get signup count
    async getSignupCount() {
        const DropSignup = require("./drop_signup.model");
        const result = await DropSignup.query()
            .where('drop_id', this.id)
            .count('id as count')
            .first();
        return parseInt(result.count) || 0;
    }

    // Get recent signups
    async getRecentSignups(limit = 10) {
        const DropSignup = require("./drop_signup.model");
        return await DropSignup.query()
            .where('drop_id', this.id)
            .orderBy('created_at', 'desc')
            .limit(limit);
    }
}

module.exports = Drop;
