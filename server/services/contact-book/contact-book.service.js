const knex = require("../../knex");
const cache = require("../analytics/cache.service");
const phoneUtils = require("./phone-utils.service");
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
            console.log(`📇 Loading contacts for user ${userId} with phone-first approach:`, options);

            // Simplified phone-first contact identification
            // Step 1: Get phone-based contacts
            const phoneContactsQuery = knex("drop_signups as ds")
                .select([
                    "ds.phone as id",
                    knex.raw("'phone' as contact_type"),
                    "ds.phone",
                    knex.raw("MAX(ds.email) as email"),
                    knex.raw("COALESCE(MAX(ds.name), ds.phone) as display_name"),
                    knex.raw("MIN(ds.created_at) as join_date"),
                    knex.raw("MAX(ds.created_at) as last_activity_at"),
                    knex.raw("COUNT(ds.id) as total_drop_signups"),
                    knex.raw("0 as total_link_clicks"),
                    knex.raw("CASE WHEN COUNT(ds.id) > 1 THEN 75 ELSE 50 END as engagement_score")
                ])
                .join("drops as d", "ds.drop_id", "d.id")
                .where("d.user_id", userId)
                .whereNotNull("ds.phone")
                .where("ds.phone", "!=", "")
                .groupBy("ds.phone");

            // Step 2: Get email-only contacts (no phone number)
            const emailOnlyContactsQuery = knex("drop_signups as ds")
                .select([
                    "ds.email as id",
                    knex.raw("'email' as contact_type"),
                    knex.raw("NULL as phone"),
                    "ds.email",
                    knex.raw("COALESCE(MAX(ds.name), ds.email) as display_name"),
                    knex.raw("MIN(ds.created_at) as join_date"),
                    knex.raw("MAX(ds.created_at) as last_activity_at"),
                    knex.raw("COUNT(ds.id) as total_drop_signups"),
                    knex.raw("0 as total_link_clicks"),
                    knex.raw("CASE WHEN COUNT(ds.id) > 1 THEN 75 ELSE 50 END as engagement_score")
                ])
                .join("drops as d", "ds.drop_id", "d.id")
                .where("d.user_id", userId)
                .whereNotNull("ds.email")
                .where("ds.email", "!=", "")
                .where(function() {
                    this.whereNull("ds.phone").orWhere("ds.phone", "");
                })
                .groupBy("ds.email");

            // Step 3: Union both queries
            const unionQuery = phoneContactsQuery.union(emailOnlyContactsQuery);
            let query = knex.from(unionQuery.as('contacts'));

            // Apply search filters
            if (search && search.trim()) {
                const trimmedSearch = search.trim();

                // Check if search looks like a phone number
                const normalizedPhone = phoneUtils.normalizePhone(trimmedSearch);
                const isPhoneSearch = normalizedPhone && phoneUtils.isValidPhone(normalizedPhone);

                query = query.where(function() {
                    // Search in display name
                    this.where("contacts.display_name", "like", `%${trimmedSearch}%`);

                    // Search in email
                    if (trimmedSearch.includes('@') || !isPhoneSearch) {
                        this.orWhere("contacts.email", "like", `%${trimmedSearch}%`);
                    }

                    // Search in phone (both original and normalized)
                    if (isPhoneSearch) {
                        this.orWhere("contacts.phone", "like", `%${trimmedSearch}%`)
                            .orWhere("contacts.phone", "like", `%${normalizedPhone}%`);
                    } else {
                        this.orWhere("contacts.phone", "like", `%${trimmedSearch}%`);
                    }
                });
            }

            // Apply group filter
            if (groupId) {
                query = query.whereExists(function() {
                    this.select('*')
                        .from('contact_group_memberships as cgm')
                        .where('cgm.group_id', groupId)
                        .where(function() {
                            this.where(function() {
                                this.where('contacts.contact_type', 'phone')
                                    .andWhere('cgm.contact_phone', knex.ref('contacts.contact_id'));
                            }).orWhere(function() {
                                this.where('contacts.contact_type', 'email')
                                    .andWhere('cgm.contact_email', knex.ref('contacts.contact_id'));
                            });
                        });
                });
            }

            // Apply date range filter
            if (dateRange && dateRange.start && dateRange.end) {
                query = query.whereBetween("join_date", [dateRange.start, dateRange.end]);
            }

            // Apply sorting
            switch (sortBy) {
                case 'recent_activity':
                    query = query.orderBy("contacts.last_activity_at", "desc").orderBy("contacts.join_date", "desc");
                    break;
                case 'name':
                    query = query.orderBy("contacts.display_name", "asc");
                    break;
                case 'email':
                    query = query.orderBy("contacts.email", "asc");
                    break;
                case 'join_date':
                    query = query.orderBy("contacts.join_date", "desc");
                    break;
                case 'engagement':
                    query = query.orderBy("contacts.engagement_score", "desc").orderBy("contacts.total_drop_signups", "desc");
                    break;
                default:
                    query = query.orderBy("contacts.last_activity_at", "desc");
            }

            // Get total count for pagination
            const countQuery = query.clone().clearSelect().clearOrder().count("contacts.id as total");
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
        if (!contacts || contacts.length === 0) return;

        // Separate contacts by type for group membership lookup
        const phoneContacts = contacts.filter(c => c.contact_type === 'phone').map(c => c.id);
        const emailContacts = contacts.filter(c => c.contact_type === 'email').map(c => c.id);

        // Get group memberships for phone contacts
        const phoneGroupMemberships = phoneContacts.length > 0 ? await knex("contact_group_memberships as cgm")
            .select("cgm.contact_phone as contact_id", "cg.name as group_name", "cg.color as group_color")
            .join("contact_groups as cg", "cgm.group_id", "cg.id")
            .where("cg.user_id", userId)
            .whereIn("cgm.contact_phone", phoneContacts) : [];

        // Get group memberships for email contacts
        const emailGroupMemberships = emailContacts.length > 0 ? await knex("contact_group_memberships as cgm")
            .select("cgm.contact_email as contact_id", "cg.name as group_name", "cg.color as group_color")
            .join("contact_groups as cg", "cgm.group_id", "cg.id")
            .where("cg.user_id", userId)
            .whereIn("cgm.contact_email", emailContacts) : [];

        // Combine group memberships
        const allGroupMemberships = [...phoneGroupMemberships, ...emailGroupMemberships];

        // Create lookup map
        const groupsMap = new Map();
        allGroupMemberships.forEach(gm => {
            if (!groupsMap.has(gm.contact_id)) {
                groupsMap.set(gm.contact_id, []);
            }
            groupsMap.get(gm.contact_id).push({
                name: gm.group_name,
                color: gm.group_color
            });
        });

        // Enhance each contact
        contacts.forEach(contact => {
            // Normalize phone if it's a phone contact
            if (contact.contact_type === 'phone' && contact.phone) {
                const phoneId = phoneUtils.generateContactId(contact.phone, contact.email);
                if (phoneId) {
                    contact.normalized_phone = phoneId.value;
                    contact.formatted_phone = phoneId.display;
                }
            }

            contact.stats = {
                totalSignups: contact.total_drop_signups || 0,
                lastSignup: contact.last_activity_at || null,
                groups: groupsMap.get(contact.id) || []
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
    async getContactProfile(userId, contactIdentifier) {
        const cacheKey = `contact:profile:${userId}:${Buffer.from(contactIdentifier).toString('base64')}`;

        return await cache.getOrCompute(cacheKey, async() => {
            console.log(`📇 Loading contact profile for user ${userId}, contact ${contactIdentifier}`);

            // Determine if identifier is phone or email
            const normalizedPhone = phoneUtils.normalizePhone(contactIdentifier);
            const isPhone = normalizedPhone && phoneUtils.isValidPhone(normalizedPhone);
            const isEmail = !isPhone && phoneUtils.isValidEmail(contactIdentifier);

            if (!isPhone && !isEmail) {
                throw new Error("Invalid contact identifier");
            }

            // Build query based on identifier type
            let contactQuery = knex("drop_signups as ds")
                .select([
                    knex.raw("MAX(ds.email) as email"),
                    knex.raw("MAX(ds.phone) as phone"),
                    knex.raw("MAX(ds.name) as name"),
                    knex.raw("MIN(ds.created_at) as join_date"),
                    knex.raw("MAX(ds.created_at) as last_activity_at"),
                    knex.raw("COUNT(ds.id) as total_drop_signups")
                ])
                .join("drops as d", "ds.drop_id", "d.id")
                .where("d.user_id", userId);

            if (isPhone) {
                contactQuery = contactQuery.where("ds.phone", normalizedPhone);
            } else {
                contactQuery = contactQuery.where("ds.email", contactIdentifier);
            }

            const contact = await contactQuery.first();

            if (!contact) {
                throw new Error("Contact not found in your network");
            }

            // Set contact type and identifier
            contact.contact_type = isPhone ? 'phone' : 'email';
            contact.contact_id = isPhone ? normalizedPhone : contactIdentifier;

            // Get drop signup history
            let dropHistoryQuery = knex("drop_signups as ds")
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
                .where("d.user_id", userId);

            if (isPhone) {
                dropHistoryQuery = dropHistoryQuery.where("ds.phone", normalizedPhone);
            } else {
                dropHistoryQuery = dropHistoryQuery.where("ds.email", contactIdentifier);
            }

            const dropHistory = await dropHistoryQuery.orderBy("ds.created_at", "desc");

            // Get group memberships
            let groupsQuery = knex("contact_group_memberships as cgm")
                .select([
                    "cg.id",
                    "cg.name",
                    "cg.color",
                    "cgm.created_at as joined_group_at"
                ])
                .join("contact_groups as cg", "cgm.group_id", "cg.id")
                .where("cg.user_id", userId);

            if (isPhone) {
                groupsQuery = groupsQuery.where("cgm.contact_phone", normalizedPhone);
            } else {
                groupsQuery = groupsQuery.where("cgm.contact_email", contactIdentifier);
            }

            const groups = await groupsQuery.orderBy("cgm.created_at", "desc");

            // Get notes
            let notesQuery = knex("contact_notes")
                .select("*")
                .where("created_by_user_id", userId);

            if (isPhone) {
                notesQuery = notesQuery.where("contact_phone", normalizedPhone);
            } else {
                notesQuery = notesQuery.where("contact_email", contactIdentifier);
            }

            const notes = await notesQuery.orderBy("created_at", "desc").limit(10);

            // Get recent interactions
            let interactionsQuery = knex("contact_interactions")
                .select("*")
                .where("initiated_by_user_id", userId);

            if (isPhone) {
                interactionsQuery = interactionsQuery.where("contact_phone", normalizedPhone);
            } else {
                interactionsQuery = interactionsQuery.where("contact_email", contactIdentifier);
            }

            const interactions = await interactionsQuery.orderBy("interaction_date", "desc").limit(20);

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
        // Check for existing display_name first
        if (contact.display_name && contact.display_name.trim()) {
            return contact.display_name.trim();
        }

        // Check for name field
        if (contact.name && contact.name.trim()) {
            return contact.name.trim();
        }

        // Use phone number if it's a phone contact
        if (contact.contact_type === 'phone' && contact.phone) {
            return phoneUtils.formatPhone(contact.phone);
        }

        // Use email if available
        if (contact.email) {
            return contact.email.split('@')[0];
        }

        // Use contact ID as fallback
        if (contact.id || contact.contact_id) {
            const id = contact.id || contact.contact_id;
            if (id.includes('@')) {
                return id.split('@')[0];
            }
            return phoneUtils.formatPhone(id) || id;
        }

        return 'Anonymous Contact';
    }

    /**
     * Generate contact identifier using phone-first approach
     */
    generateContactId(phone, email) {
        return phoneUtils.generateContactId(phone, email);
    }

    /**
     * Normalize contact identifier
     */
    normalizeContactId(identifier) {
        // Try to normalize as phone first
        const normalizedPhone = phoneUtils.normalizePhone(identifier);
        if (normalizedPhone && phoneUtils.isValidPhone(normalizedPhone)) {
            return {
                type: 'phone',
                value: normalizedPhone,
                display: phoneUtils.formatPhone(normalizedPhone)
            };
        }

        // Try as email
        if (phoneUtils.isValidEmail(identifier)) {
            return {
                type: 'email',
                value: identifier.toLowerCase().trim(),
                display: identifier.toLowerCase().trim()
            };
        }

        return null;
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