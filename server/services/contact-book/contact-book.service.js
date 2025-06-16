const knex = require("../../knex");
const cache = require("../analytics/cache.service");
const env = require("../../env");

class ContactBookService {
    constructor() {
        this.isPostgreSQL = env.DB_CLIENT === "pg" || env.DB_CLIENT === "postgres";
        this.contactCacheTTL = 300; // 5 minutes cache for contact data
        this.searchCacheTTL = 180; // 3 minutes cache for search results
    }

    /**
     * Get comprehensive contact list with search and filtering
     */
    async getContacts(userId, options = {}) {
        const {
            limit = 50,
                offset = 0,
                search = '',
                sortBy = 'recent_activity',
                groupId = null,
                acquisitionChannel = null,
                dateRange = null,
                includeStats = true
        } = options;

        const cacheKey = `contacts:${userId}:${Buffer.from(JSON.stringify(options)).toString('base64')}`;

        return await cache.getOrCompute(cacheKey, async() => {
            console.log(`📇 Loading contacts for user ${userId} with options:`, options);

            // Base query to get all contacts who have signed up for this user's drops
            // Note: drop_signups doesn't have user_id, so we use email as the contact identifier
            let query = knex("drop_signups as ds")
                .select([
                    knex.raw("ds.email as id"), // Use email as unique identifier
                    "ds.email",
                    knex.raw("COALESCE(ds.name, ds.email) as display_name"),
                    "ds.phone",
                    knex.raw("MIN(ds.created_at) as join_date"),
                    knex.raw("MAX(ds.created_at) as last_activity_at"),
                    knex.raw("COUNT(ds.id) as total_drop_signups"),
                    knex.raw("0 as total_link_clicks"), // Placeholder for now
                    knex.raw("CASE WHEN COUNT(ds.id) > 1 THEN 75 ELSE 50 END as engagement_score") // Basic scoring
                ])
                .join("drops as d", "ds.drop_id", "d.id")
                .where("d.user_id", userId)
                .whereNotNull("ds.email") // Only include contacts with email
                .groupBy("ds.email", "ds.phone");

            // Apply search filters
            if (search && search.trim()) {
                const trimmedSearch = search.trim();

                if (this.isPostgreSQL) {
                    // Use PostgreSQL full-text search
                    query = query.whereRaw(`
                        to_tsvector('english',
                            coalesce(ds.email, '') || ' ' ||
                            coalesce(ds.name, '') || ' ' ||
                            coalesce(ds.phone, '')
                        ) @@ plainto_tsquery('english', ?)
                    `, [trimmedSearch]);
                } else {
                    // Fallback to LIKE queries for MySQL/SQLite
                    query = query.where(function() {
                        this.where("ds.email", "like", `%${trimmedSearch}%`)
                            .orWhere("ds.name", "like", `%${trimmedSearch}%`)
                            .orWhere("ds.phone", "like", `%${trimmedSearch}%`);
                    });
                }
            }

            // Apply group filter
            if (groupId) {
                query = query.join("contact_group_memberships as cgm", "ds.email", "cgm.contact_user_id")
                    .where("cgm.group_id", groupId);
            }

            // Apply date range filter
            if (dateRange && dateRange.start && dateRange.end) {
                query = query.whereBetween("ds.created_at", [dateRange.start, dateRange.end]);
            }

            // Apply sorting
            switch (sortBy) {
                case 'recent_activity':
                    query = query.orderBy("last_activity_at", "desc").orderBy("join_date", "desc");
                    break;
                case 'name':
                    query = query.orderBy("display_name", "asc");
                    break;
                case 'email':
                    query = query.orderBy("ds.email", "asc");
                    break;
                case 'join_date':
                    query = query.orderBy("join_date", "desc");
                    break;
                case 'engagement':
                    query = query.orderBy("engagement_score", "desc").orderBy("total_drop_signups", "desc");
                    break;
                default:
                    query = query.orderBy("last_activity_at", "desc");
            }

            // Get total count for pagination
            const countQuery = query.clone().clearSelect().clearOrder().countDistinct("ds.email as total");
            const [{ total }] = await countQuery;

            // Apply pagination
            const contacts = await query.limit(limit).offset(offset);

            // Enhance contacts with additional stats if requested
            if (includeStats && contacts.length > 0) {
                await this.enhanceContactsWithStats(contacts, userId);
            }

            return {
                contacts,
                total: parseInt(total) || 0,
                limit,
                offset,
                hasMore: (offset + limit) < parseInt(total),
                searchQuery: search,
                filters: {
                    groupId,
                    acquisitionChannel,
                    dateRange,
                    sortBy
                }
            };
        }, this.contactCacheTTL);
    }

    /**
     * Enhance contacts with additional statistics
     */
    async enhanceContactsWithStats(contacts, userId) {
        const contactEmails = contacts.map(c => c.email);

        // Get group memberships
        const groupMemberships = await knex("contact_group_memberships as cgm")
            .select("cgm.contact_user_id", "cg.name as group_name", "cg.color as group_color")
            .join("contact_groups as cg", "cgm.group_id", "cg.id")
            .where("cg.user_id", userId)
            .whereIn("cgm.contact_user_id", contactEmails);

        // Create lookup maps
        const groupsMap = new Map();

        groupMemberships.forEach(gm => {
            if (!groupsMap.has(gm.contact_user_id)) {
                groupsMap.set(gm.contact_user_id, []);
            }
            groupsMap.get(gm.contact_user_id).push({
                name: gm.group_name,
                color: gm.group_color
            });
        });

        // Enhance each contact
        contacts.forEach(contact => {
            contact.stats = {
                totalSignups: contact.total_drop_signups || 0,
                lastSignup: contact.last_activity_at || null,
                groups: groupsMap.get(contact.email) || []
            };

            // Ensure display_name is set
            if (!contact.display_name) {
                contact.display_name = this.getDisplayName(contact);
            }
        });
    }

    /**
     * Get detailed contact profile
     */
    async getContactProfile(userId, contactEmail) {
        const cacheKey = `contact:profile:${userId}:${Buffer.from(contactEmail).toString('base64')}`;

        return await cache.getOrCompute(cacheKey, async() => {
            console.log(`📇 Loading contact profile for user ${userId}, contact ${contactEmail}`);

            // Get basic contact info from drop_signups
            const contact = await knex("drop_signups as ds")
                .select([
                    "ds.email",
                    knex.raw("COALESCE(ds.name, ds.email) as display_name"),
                    "ds.phone",
                    knex.raw("MIN(ds.created_at) as join_date"),
                    knex.raw("MAX(ds.created_at) as last_activity_at"),
                    knex.raw("COUNT(ds.id) as total_drop_signups")
                ])
                .join("drops as d", "ds.drop_id", "d.id")
                .where("d.user_id", userId)
                .where("ds.email", contactEmail)
                .groupBy("ds.email", "ds.phone")
                .first();

            if (!contact) {
                throw new Error("Contact not found in your network");
            }

            // Get drop signup history
            const dropHistory = await knex("drop_signups as ds")
                .select([
                    "d.title as drop_title",
                    "d.slug as drop_slug",
                    "ds.created_at as signup_date",
                    "ds.referrer",
                    "ds.name as signup_name",
                    "ds.email as signup_email",
                    "ds.phone as signup_phone"
                ])
                .join("drops as d", "ds.drop_id", "d.id")
                .where("d.user_id", userId)
                .where("ds.email", contactEmail)
                .orderBy("ds.created_at", "desc");

            // Get group memberships
            const groups = await knex("contact_group_memberships as cgm")
                .select([
                    "cg.id",
                    "cg.name",
                    "cg.color",
                    "cgm.created_at as joined_group_at"
                ])
                .join("contact_groups as cg", "cgm.group_id", "cg.id")
                .where("cg.user_id", userId)
                .where("cgm.contact_user_id", contactEmail)
                .orderBy("cgm.created_at", "desc");

            // Get notes
            const notes = await knex("contact_notes")
                .select("*")
                .where("contact_user_id", contactEmail)
                .where("created_by_user_id", userId)
                .orderBy("created_at", "desc")
                .limit(10);

            // Get recent interactions
            const interactions = await knex("contact_interactions")
                .select("*")
                .where("contact_user_id", contactEmail)
                .where("initiated_by_user_id", userId)
                .orderBy("interaction_date", "desc")
                .limit(20);

            // Set display name
            if (!contact.display_name) {
                contact.display_name = this.getDisplayName(contact);
            }

            return {
                contact,
                dropHistory,
                groups,
                notes,
                interactions,
                stats: {
                    totalDrops: dropHistory.length,
                    firstSignup: dropHistory.length > 0 ? dropHistory[dropHistory.length - 1].signup_date : null,
                    lastSignup: dropHistory.length > 0 ? dropHistory[0].signup_date : null,
                    totalGroups: groups.length,
                    totalNotes: notes.length,
                    totalInteractions: interactions.length
                }
            };
        }, this.contactCacheTTL);
    }

    /**
     * Get display name for a contact
     */
    getDisplayName(contact) {
        // For drop_signups based contacts, we have a 'name' field instead of first_name/last_name
        if (contact.name && contact.name.trim()) {
            return contact.name.trim();
        } else if (contact.display_name && contact.display_name.trim()) {
            return contact.display_name.trim();
        } else if (contact.email) {
            return contact.email.split('@')[0];
        } else {
            return 'Anonymous Contact';
        }
    }

    /**
     * Clear contact cache for a user
     */
    async clearContactCache(userId) {
        try {
            const patterns = [
                `contacts:${userId}:*`,
                `contact:profile:${userId}:*`,
                `contact:groups:${userId}:*`,
                `contact:search:${userId}:*`
            ];

            for (const pattern of patterns) {
                await cache.batchInvalidate([pattern]);
            }

            console.log(`📇 Cleared contact cache for user ${userId}`);
        } catch (error) {
            console.error(`❌ Error clearing contact cache for user ${userId}:`, error);
        }
    }
}

module.exports = new ContactBookService();