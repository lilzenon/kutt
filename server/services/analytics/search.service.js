const knex = require("../../knex");
const cache = require("./cache.service");
const env = require("../../env");

class SearchService {
    constructor() {
        this.isPostgreSQL = env.DB_CLIENT === "pg" || env.DB_CLIENT === "postgres";
        this.searchCacheTTL = 300; // 5 minutes cache for search results
    }

    /**
     * Search across fan signups with advanced filtering
     */
    async searchFanSignups(userId, searchQuery, options = {}) {
        const {
            limit = 50,
            offset = 0,
            sortBy = 'latest',
            dropId = null,
            includeHighlights = true
        } = options;

        // Create cache key for search results
        const cacheKey = `search:fans:${userId}:${Buffer.from(searchQuery).toString('base64')}:${JSON.stringify(options)}`;

        return await cache.getOrCompute(cacheKey, async () => {
            console.log(`🔍 Searching fan signups for user ${userId} with query: "${searchQuery}"`);

            let query = knex("drop_signups as ds")
                .select([
                    "ds.id",
                    "ds.email",
                    "ds.name",
                    "ds.phone",
                    "ds.created_at",
                    "ds.referrer",
                    "d.id as drop_id",
                    "d.title as drop_title",
                    "d.slug as drop_slug"
                ])
                .join("drops as d", "ds.drop_id", "d.id")
                .where("d.user_id", userId);

            // Apply search filters
            if (searchQuery && searchQuery.trim()) {
                const trimmedQuery = searchQuery.trim();
                
                if (this.isPostgreSQL) {
                    // Use PostgreSQL full-text search for better performance
                    query = query.whereRaw(`
                        to_tsvector('english', coalesce(ds.email, '') || ' ' || coalesce(ds.name, '') || ' ' || coalesce(ds.phone, '') || ' ' || coalesce(d.title, '')) 
                        @@ plainto_tsquery('english', ?)
                    `, [trimmedQuery]);
                } else {
                    // Fallback to LIKE queries for MySQL/SQLite
                    query = query.where(function() {
                        this.where("ds.email", "like", `%${trimmedQuery}%`)
                            .orWhere("ds.name", "like", `%${trimmedQuery}%`)
                            .orWhere("ds.phone", "like", `%${trimmedQuery}%`)
                            .orWhere("d.title", "like", `%${trimmedQuery}%`);
                    });
                }
            }

            // Apply drop filter
            if (dropId) {
                query = query.where("d.id", dropId);
            }

            // Apply sorting
            switch (sortBy) {
                case 'latest':
                    query = query.orderBy("ds.created_at", "desc");
                    break;
                case 'oldest':
                    query = query.orderBy("ds.created_at", "asc");
                    break;
                case 'email':
                    query = query.orderBy("ds.email", "asc");
                    break;
                case 'name':
                    query = query.orderBy("ds.name", "asc");
                    break;
                default:
                    query = query.orderBy("ds.created_at", "desc");
            }

            // Get total count for pagination
            const countQuery = query.clone().clearSelect().clearOrder().count("ds.id as total");
            const [{ total }] = await countQuery;

            // Apply pagination
            const results = await query.limit(limit).offset(offset);

            // Add search highlights if requested
            let processedResults = results;
            if (includeHighlights && searchQuery && searchQuery.trim()) {
                processedResults = results.map(result => ({
                    ...result,
                    highlights: this.generateHighlights(result, searchQuery.trim())
                }));
            }

            return {
                results: processedResults,
                total: parseInt(total) || 0,
                limit,
                offset,
                hasMore: (offset + limit) < parseInt(total),
                searchQuery,
                searchTime: new Date().toISOString()
            };
        }, this.searchCacheTTL);
    }

    /**
     * Search across drops
     */
    async searchDrops(userId, searchQuery, options = {}) {
        const { limit = 20, offset = 0, includeInactive = false } = options;

        const cacheKey = `search:drops:${userId}:${Buffer.from(searchQuery).toString('base64')}:${JSON.stringify(options)}`;

        return await cache.getOrCompute(cacheKey, async () => {
            console.log(`🔍 Searching drops for user ${userId} with query: "${searchQuery}"`);

            let query = knex("drops")
                .select([
                    "id",
                    "title",
                    "description",
                    "slug",
                    "is_active",
                    "created_at"
                ])
                .where("user_id", userId);

            // Apply active filter
            if (!includeInactive) {
                query = query.where("is_active", true);
            }

            // Apply search
            if (searchQuery && searchQuery.trim()) {
                const trimmedQuery = searchQuery.trim();
                
                if (this.isPostgreSQL) {
                    query = query.whereRaw(`
                        to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')) 
                        @@ plainto_tsquery('english', ?)
                    `, [trimmedQuery]);
                } else {
                    query = query.where(function() {
                        this.where("title", "like", `%${trimmedQuery}%`)
                            .orWhere("description", "like", `%${trimmedQuery}%`);
                    });
                }
            }

            const countQuery = query.clone().clearSelect().count("id as total");
            const [{ total }] = await countQuery;

            const results = await query
                .orderBy("created_at", "desc")
                .limit(limit)
                .offset(offset);

            return {
                results,
                total: parseInt(total) || 0,
                limit,
                offset,
                hasMore: (offset + limit) < parseInt(total),
                searchQuery
            };
        }, this.searchCacheTTL);
    }

    /**
     * Get search suggestions based on partial input
     */
    async getSearchSuggestions(userId, partialQuery, type = 'fans') {
        if (!partialQuery || partialQuery.length < 2) {
            return { suggestions: [] };
        }

        const cacheKey = `suggestions:${type}:${userId}:${Buffer.from(partialQuery).toString('base64')}`;

        return await cache.getOrCompute(cacheKey, async () => {
            const suggestions = [];

            if (type === 'fans') {
                // Get email suggestions
                const emailSuggestions = await knex("drop_signups as ds")
                    .select("ds.email")
                    .join("drops as d", "ds.drop_id", "d.id")
                    .where("d.user_id", userId)
                    .where("ds.email", "like", `${partialQuery}%`)
                    .whereNotNull("ds.email")
                    .distinct()
                    .limit(5);

                // Get name suggestions
                const nameSuggestions = await knex("drop_signups as ds")
                    .select("ds.name")
                    .join("drops as d", "ds.drop_id", "d.id")
                    .where("d.user_id", userId)
                    .where("ds.name", "like", `${partialQuery}%`)
                    .whereNotNull("ds.name")
                    .distinct()
                    .limit(5);

                suggestions.push(
                    ...emailSuggestions.map(s => ({ type: 'email', value: s.email })),
                    ...nameSuggestions.map(s => ({ type: 'name', value: s.name }))
                );
            } else if (type === 'drops') {
                const dropSuggestions = await knex("drops")
                    .select("title")
                    .where("user_id", userId)
                    .where("title", "like", `${partialQuery}%`)
                    .distinct()
                    .limit(8);

                suggestions.push(...dropSuggestions.map(s => ({ type: 'drop', value: s.title })));
            }

            return {
                suggestions: suggestions.slice(0, 8) // Limit to 8 suggestions
            };
        }, 60); // Cache suggestions for 1 minute
    }

    /**
     * Generate search result highlights
     */
    generateHighlights(result, searchQuery) {
        const highlights = {};
        const query = searchQuery.toLowerCase();

        // Helper function to highlight text
        const highlightText = (text, query) => {
            if (!text) return text;
            const regex = new RegExp(`(${query})`, 'gi');
            return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
        };

        // Highlight relevant fields
        if (result.email && result.email.toLowerCase().includes(query)) {
            highlights.email = highlightText(result.email, query);
        }
        if (result.name && result.name.toLowerCase().includes(query)) {
            highlights.name = highlightText(result.name, query);
        }
        if (result.phone && result.phone.toLowerCase().includes(query)) {
            highlights.phone = highlightText(result.phone, query);
        }
        if (result.drop_title && result.drop_title.toLowerCase().includes(query)) {
            highlights.drop_title = highlightText(result.drop_title, query);
        }

        return highlights;
    }

    /**
     * Clear search cache for a user
     */
    async clearSearchCache(userId) {
        try {
            const patterns = [
                `search:fans:${userId}:*`,
                `search:drops:${userId}:*`,
                `suggestions:*:${userId}:*`
            ];

            for (const pattern of patterns) {
                await cache.batchInvalidate([pattern]);
            }

            console.log(`🔍 Cleared search cache for user ${userId}`);
        } catch (error) {
            console.error(`❌ Error clearing search cache for user ${userId}:`, error);
        }
    }
}

module.exports = new SearchService();
