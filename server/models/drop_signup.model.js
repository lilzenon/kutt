const { Model } = require("objection");

class DropSignup extends Model {
    static get tableName() {
        return "drop_signups";
    }

    static get jsonSchema() {
        return {
            type: "object",
            required: ["drop_id", "email"],
            properties: {
                id: { type: "integer" },
                drop_id: { type: "integer" },
                email: { type: "string", format: "email", maxLength: 255 },
                phone: { type: ["string", "null"], maxLength: 20 },
                name: { type: ["string", "null"], maxLength: 100 },
                ip_address: { type: ["string", "null"], maxLength: 45 },
                user_agent: { type: ["string", "null"], maxLength: 500 },
                referrer: { type: ["string", "null"], maxLength: 2040 },
                email_verified: { type: "boolean" },
                phone_verified: { type: "boolean" },
                notified: { type: "boolean" },
                notified_at: { type: ["string", "null"] },
                created_at: { type: "string" },
                updated_at: { type: "string" }
            }
        };
    }

    static get relationMappings() {
        const Drop = require("./drop.model");

        return {
            drop: {
                relation: Model.BelongsToOneRelation,
                modelClass: Drop,
                join: {
                    from: "drop_signups.drop_id",
                    to: "drops.id"
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

    // Mark as notified
    async markAsNotified() {
        return await this.$query().patch({
            notified: true,
            notified_at: new Date().toISOString()
        });
    }

    // Verify email
    async verifyEmail() {
        return await this.$query().patch({
            email_verified: true
        });
    }

    // Verify phone
    async verifyPhone() {
        return await this.$query().patch({
            phone_verified: true
        });
    }
}

module.exports = DropSignup;
