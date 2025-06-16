const knex = require("../../knex");
const cache = require("../analytics/cache.service");
const phoneUtils = require("./phone-utils.service");
const errorHandler = require("./error-handler.service");
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
        // Validate input parameters
        errorHandler.validateQueryParams(options);

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

        // Sanitize search input
        const sanitizedSearch = search ? errorHandler.sanitizeInput(search) : "";

        const cacheKey = `contacts:${userId}:${Buffer.from(JSON.stringify({...options, search: sanitizedSearch})).toString('base64')}`;

        return await errorHandler.executeWithRetry(async() => {
            return await cache.getOrCompute(cacheKey, async() => {
                console.log(`📇 Loading contacts for user ${userId} with phone-first approach:`, options);

                // Bulletproof contact query - simple and reliable approach
                // Step 1: Get phone contacts first (priority)
                const phoneContacts = await knex("drop_signups as ds")
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

                // Step 2: Get email-only contacts (fallback)
                const emailContacts = await knex("drop_signups as ds")
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

                // Step 3: Combine results in memory (avoids SQL UNION issues)
                let allContacts = [...phoneContacts, ...emailContacts];

                // Apply search filters in memory (more reliable than complex SQL)
                if (sanitizedSearch && sanitizedSearch.trim()) {
                    const trimmedSearch = sanitizedSearch.trim().toLowerCase();

                    // Check if search looks like a phone number
                    const normalizedPhone = phoneUtils.normalizePhone(trimmedSearch);
                    const isPhoneSearch = normalizedPhone && phoneUtils.isValidPhone(normalizedPhone);

                    allContacts = allContacts.filter(contact => {
                        // Search in display name
                        if (contact.display_name && contact.display_name.toLowerCase().includes(trimmedSearch)) {
                            return true;
                        }

                        // Search in email
                        if (contact.email && contact.email.toLowerCase().includes(trimmedSearch)) {
                            return true;
                        }

                        // Search in phone
                        if (contact.phone) {
                            const contactPhone = contact.phone.toLowerCase();
                            if (contactPhone.includes(trimmedSearch)) {
                                return true;
                            }

                            // If it's a phone search, also check normalized version
                            if (isPhoneSearch) {
                                const normalizedContactPhone = phoneUtils.normalizePhone(contact.phone);
                                if (normalizedContactPhone && normalizedContactPhone.includes(normalizedPhone)) {
                                    return true;
                                }
                            }
                        }

                        return false;
                    });
                }

                // Apply group filter in memory
                if (groupId) {
                    // Get group memberships for filtering
                    const phoneGroupMembers = await knex("contact_group_memberships as cgm")
                        .select("cgm.contact_phone as contact_id")
                        .where("cgm.group_id", groupId)
                        .whereNotNull("cgm.contact_phone");

                    const emailGroupMembers = await knex("contact_group_memberships as cgm")
                        .select("cgm.contact_email as contact_id")
                        .where("cgm.group_id", groupId)
                        .whereNotNull("cgm.contact_email");

                    const groupMemberIds = new Set([
                        ...phoneGroupMembers.map(m => m.contact_id),
                        ...emailGroupMembers.map(m => m.contact_id)
                    ]);

                    allContacts = allContacts.filter(contact => groupMemberIds.has(contact.id));
                }

                // Apply date range filter in memory
                if (dateRange && dateRange.start && dateRange.end) {
                    const startDate = new Date(dateRange.start);
                    const endDate = new Date(dateRange.end);

                    allContacts = allContacts.filter(contact => {
                        const joinDate = new Date(contact.join_date);
                        return joinDate >= startDate && joinDate <= endDate;
                    });
                }

                // Apply sorting in memory
                allContacts.sort((a, b) => {
                    switch (sortBy) {
                        case 'recent_activity':
                            const aActivity = new Date(a.last_activity_at || a.join_date);
                            const bActivity = new Date(b.last_activity_at || b.join_date);
                            return bActivity - aActivity; // desc
                        case 'name':
                            return (a.display_name || '').localeCompare(b.display_name || '');
                        case 'email':
                            return (a.email || '').localeCompare(b.email || '');
                        case 'join_date':
                            const aJoin = new Date(a.join_date);
                            const bJoin = new Date(b.join_date);
                            return bJoin - aJoin; // desc
                        case 'engagement':
                            if (a.engagement_score !== b.engagement_score) {
                                return b.engagement_score - a.engagement_score; // desc
                            }
                            return b.total_drop_signups - a.total_drop_signups; // desc
                        default:
                            const aDefault = new Date(a.last_activity_at || a.join_date);
                            const bDefault = new Date(b.last_activity_at || b.join_date);
                            return bDefault - aDefault; // desc
                    }
                });

                // Get total count for pagination
                const total = allContacts.length;

                // Apply pagination in memory
                const contacts = allContacts.slice(offset, offset + limit);

                // Enhance contacts with additional stats if requested
                if (includeStats && contacts.length > 0) {
                    await this.enhanceContactsWithStats(contacts, userId);
                }

                return {
                    contacts,
                    total,
                    limit,
                    offset,
                    hasMore: (offset + limit) < total,
                    searchQuery: sanitizedSearch,
                    filters: {
                        groupId,
                        acquisitionChannel,
                        dateRange,
                        sortBy
                    }
                };
            }, this.contactCacheTTL);
        });
    }, 'getContacts');
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
// Validate and sanitize contact identifier
const sanitizedIdentifier = errorHandler.validateContactIdentifier(contactIdentifier);

const cacheKey = `contact:profile:${userId}:${Buffer.from(sanitizedIdentifier).toString('base64')}`;

return await errorHandler.executeWithRetry(async() => {
    return await cache.getOrCompute(cacheKey, async() => {
        console.log(`📇 Loading contact profile for user ${userId}, contact ${sanitizedIdentifier}`);

        // Determine if identifier is phone or email
        const normalizedPhone = phoneUtils.normalizePhone(sanitizedIdentifier);
        const isPhone = normalizedPhone && phoneUtils.isValidPhone(normalizedPhone);
        const isEmail = !isPhone && phoneUtils.isValidEmail(sanitizedIdentifier);

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
            contactQuery = contactQuery.where("ds.email", sanitizedIdentifier);
        }

        const contact = await contactQuery.first();

        if (!contact) {
            throw new Error("Contact not found in your network");
        }

        // Set contact type and identifier
        contact.contact_type = isPhone ? 'phone' : 'email';
        contact.contact_id = isPhone ? normalizedPhone : sanitizedIdentifier;

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
            dropHistoryQuery = dropHistoryQuery.where("ds.email", sanitizedIdentifier);
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
            groupsQuery = groupsQuery.where("cgm.contact_email", sanitizedIdentifier);
        }

        const groups = await groupsQuery.orderBy("cgm.created_at", "desc");

        // Get notes
        let notesQuery = knex("contact_notes")
            .select("*")
            .where("created_by_user_id", userId);

        if (isPhone) {
            notesQuery = notesQuery.where("contact_phone", normalizedPhone);
        } else {
            notesQuery = notesQuery.where("contact_email", sanitizedIdentifier);
        }

        const notes = await notesQuery.orderBy("created_at", "desc").limit(10);

        // Get recent interactions
        let interactionsQuery = knex("contact_interactions")
            .select("*")
            .where("initiated_by_user_id", userId);

        if (isPhone) {
            interactionsQuery = interactionsQuery.where("contact_phone", normalizedPhone);
        } else {
            interactionsQuery = interactionsQuery.where("contact_email", sanitizedIdentifier);
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
});
}, 'getContactProfile');
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