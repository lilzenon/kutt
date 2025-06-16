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

        return await cache.getOrCompute(cacheKey, async () => {
            console.log(`📇 Loading contacts for user ${userId} with options:`, options);

            // Base query to get all users who have interacted with this user's drops
            let query = knex("users as u")
                .select([
                    "u.id",
                    "u.email",
                    "u.first_name",
                    "u.last_name",
                    "u.phone",
                    "u.company",
                    "u.bio",
                    "u.website",
                    "u.location_data",
                    "u.acquisition_channel",
                    "u.last_activity_at",
                    "u.total_drop_signups",
                    "u.total_link_clicks",
                    "u.engagement_score",
                    "u.created_at as join_date"
                ])
                .leftJoin("drop_signups as ds", "u.id", "ds.user_id")
                .leftJoin("drops as d", "ds.drop_id", "d.id")
                .where("d.user_id", userId)
                .groupBy("u.id")
                .distinct();

            // Apply search filters
            if (search && search.trim()) {
                const trimmedSearch = search.trim();
                
                if (this.isPostgreSQL) {
                    // Use PostgreSQL full-text search
                    query = query.whereRaw(`
                        to_tsvector('english', 
                            coalesce(u.email, '') || ' ' || 
                            coalesce(u.first_name, '') || ' ' || 
                            coalesce(u.last_name, '') || ' ' || 
                            coalesce(u.phone, '') || ' ' || 
                            coalesce(u.company, '') || ' ' || 
                            coalesce(u.bio, '')
                        ) @@ plainto_tsquery('english', ?)
                    `, [trimmedSearch]);
                } else {
                    // Fallback to LIKE queries for MySQL/SQLite
                    query = query.where(function() {
                        this.where("u.email", "like", `%${trimmedSearch}%`)
                            .orWhere("u.first_name", "like", `%${trimmedSearch}%`)
                            .orWhere("u.last_name", "like", `%${trimmedSearch}%`)
                            .orWhere("u.phone", "like", `%${trimmedSearch}%`)
                            .orWhere("u.company", "like", `%${trimmedSearch}%`)
                            .orWhere("u.bio", "like", `%${trimmedSearch}%`);
                    });
                }
            }

            // Apply group filter
            if (groupId) {
                query = query.join("contact_group_memberships as cgm", "u.id", "cgm.contact_user_id")
                    .where("cgm.group_id", groupId);
            }

            // Apply acquisition channel filter
            if (acquisitionChannel) {
                query = query.where("u.acquisition_channel", acquisitionChannel);
            }

            // Apply date range filter
            if (dateRange && dateRange.start && dateRange.end) {
                query = query.whereBetween("u.created_at", [dateRange.start, dateRange.end]);
            }

            // Apply sorting
            switch (sortBy) {
                case 'recent_activity':
                    query = query.orderBy("u.last_activity_at", "desc").orderBy("u.created_at", "desc");
                    break;
                case 'name':
                    query = query.orderBy("u.first_name", "asc").orderBy("u.last_name", "asc");
                    break;
                case 'email':
                    query = query.orderBy("u.email", "asc");
                    break;
                case 'join_date':
                    query = query.orderBy("u.created_at", "desc");
                    break;
                case 'engagement':
                    query = query.orderBy("u.engagement_score", "desc").orderBy("u.total_drop_signups", "desc");
                    break;
                default:
                    query = query.orderBy("u.last_activity_at", "desc");
            }

            // Get total count for pagination
            const countQuery = query.clone().clearSelect().clearOrder().count("u.id as total");
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
        const contactIds = contacts.map(c => c.id);

        // Get drop signup counts per contact
        const dropSignups = await knex("drop_signups as ds")
            .select("ds.user_id", knex.raw("COUNT(*) as signup_count"))
            .join("drops as d", "ds.drop_id", "d.id")
            .where("d.user_id", userId)
            .whereIn("ds.user_id", contactIds)
            .groupBy("ds.user_id");

        // Get recent activity per contact
        const recentActivity = await knex("drop_signups as ds")
            .select("ds.user_id", knex.raw("MAX(ds.created_at) as last_signup"))
            .join("drops as d", "ds.drop_id", "d.id")
            .where("d.user_id", userId)
            .whereIn("ds.user_id", contactIds)
            .groupBy("ds.user_id");

        // Get group memberships
        const groupMemberships = await knex("contact_group_memberships as cgm")
            .select("cgm.contact_user_id", "cg.name as group_name", "cg.color as group_color")
            .join("contact_groups as cg", "cgm.group_id", "cg.id")
            .where("cg.user_id", userId)
            .whereIn("cgm.contact_user_id", contactIds);

        // Create lookup maps
        const signupMap = new Map(dropSignups.map(s => [s.user_id, s.signup_count]));
        const activityMap = new Map(recentActivity.map(a => [a.user_id, a.last_signup]));
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
                totalSignups: signupMap.get(contact.id) || 0,
                lastSignup: activityMap.get(contact.id) || null,
                groups: groupsMap.get(contact.id) || []
            };

            // Parse JSON fields
            try {
                contact.location_data = contact.location_data ? JSON.parse(contact.location_data) : null;
            } catch (e) {
                contact.location_data = null;
            }

            // Calculate display name
            contact.display_name = this.getDisplayName(contact);
        });
    }

    /**
     * Get detailed contact profile
     */
    async getContactProfile(userId, contactId) {
        const cacheKey = `contact:profile:${userId}:${contactId}`;

        return await cache.getOrCompute(cacheKey, async () => {
            console.log(`📇 Loading contact profile for user ${userId}, contact ${contactId}`);

            // Get basic contact info
            const [contact] = await knex("users")
                .select("*")
                .where("id", contactId);

            if (!contact) {
                throw new Error("Contact not found");
            }

            // Verify this contact has interacted with the user's drops
            const hasInteraction = await knex("drop_signups as ds")
                .join("drops as d", "ds.drop_id", "d.id")
                .where("d.user_id", userId)
                .where("ds.user_id", contactId)
                .first();

            if (!hasInteraction) {
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
                .where("ds.user_id", contactId)
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
                .where("cgm.contact_user_id", contactId)
                .orderBy("cgm.created_at", "desc");

            // Get notes
            const notes = await knex("contact_notes")
                .select("*")
                .where("contact_user_id", contactId)
                .where("created_by_user_id", userId)
                .orderBy("created_at", "desc")
                .limit(10);

            // Get recent interactions
            const interactions = await knex("contact_interactions")
                .select("*")
                .where("contact_user_id", contactId)
                .where("initiated_by_user_id", userId)
                .orderBy("interaction_date", "desc")
                .limit(20);

            // Parse JSON fields
            try {
                contact.location_data = contact.location_data ? JSON.parse(contact.location_data) : null;
                contact.preferences = contact.preferences ? JSON.parse(contact.preferences) : null;
                contact.social_links = contact.social_links ? JSON.parse(contact.social_links) : null;
            } catch (e) {
                contact.location_data = null;
                contact.preferences = null;
                contact.social_links = null;
            }

            contact.display_name = this.getDisplayName(contact);

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
        if (contact.first_name && contact.last_name) {
            return `${contact.first_name} ${contact.last_name}`;
        } else if (contact.first_name) {
            return contact.first_name;
        } else if (contact.last_name) {
            return contact.last_name;
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
