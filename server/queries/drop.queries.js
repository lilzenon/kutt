const knex = require("../knex");
const { generateSlug } = require("../models/drop.model");

// Simple normalizeMatch function for drops
function normalizeMatch(match) {
    return match; // For drops, we don't need complex normalization
}

// Create a new drop
async function create(data) {
    // Generate unique slug if not provided
    if (!data.slug && data.title) {
        const existingSlugs = await knex("drops").select("slug").then(rows => rows.map(r => r.slug));
        data.slug = generateSlug(data.title, existingSlugs);
    }

    // Ensure default colors are set if not provided
    const dropData = {
        background_color: '#ffffff',
        text_color: '#000000',
        button_color: '#007bff',
        button_text: 'Get Notified',
        is_active: true,
        collect_email: true,
        collect_phone: false,
        ...data // Override with provided data
    };

    const [id] = await knex("drops").insert(dropData);
    return await knex("drops").where("id", id).first();
}

// Find drops with optional filters
async function find(match = {}) {
    const query = knex("drops");

    if (match && Object.keys(match).length > 0) {
        query.where(normalizeMatch(match));
    }

    return await query.orderBy("created_at", "desc");
}

// Find a single drop
async function findOne(match) {
    return await knex("drops").where(normalizeMatch(match)).first();
}

// Find drop by slug
async function findBySlug(slug) {
    return await knex("drops").where("slug", slug).first();
}

// Find drops by user
async function findByUser(userId, options = {}) {
    const query = knex("drops")
        .where("user_id", userId)
        .orderBy("created_at", "desc");

    if (options.limit) {
        query.limit(options.limit);
    }

    if (options.offset) {
        query.offset(options.offset);
    }

    return await query;
}

// Update a drop with enhanced error handling and logging
async function update(id, data) {
    try {
        console.log(`🔄 Updating drop ${id} in database with fields:`, Object.keys(data));

        // Perform the update
        const updateResult = await knex("drops").where("id", id).update(data);

        console.log(`✅ Drop ${id} update result:`, updateResult);

        // Fetch and return the updated drop
        const updatedDrop = await knex("drops").where("id", id).first();

        if (!updatedDrop) {
            throw new Error(`Drop ${id} not found after update`);
        }

        console.log(`✅ Drop ${id} updated successfully`);
        return updatedDrop;

    } catch (error) {
        console.error(`❌ Error updating drop ${id}:`, {
            error: error.message,
            code: error.code,
            detail: error.detail,
            fields: Object.keys(data)
        });

        // Re-throw with additional context
        const enhancedError = new Error(`Failed to update drop ${id}: ${error.message}`);
        enhancedError.originalError = error;
        enhancedError.code = error.code;
        enhancedError.detail = error.detail;
        throw enhancedError;
    }
}

// Delete a drop
async function remove(id) {
    return await knex("drops").where("id", id).del();
}

// Get drop with signup count
async function findWithStats(match) {
    const drop = await knex("drops")
        .where(normalizeMatch(match))
        .first();

    if (!drop) return null;

    const signupCount = await getSignupCount(drop.id);

    return {
        ...drop,
        signup_count: signupCount
    };
}

// Get drops with stats for user - OPTIMIZED VERSION
async function findByUserWithStats(userId, options = {}) {
    const query = knex("drops as d")
        .select([
            "d.*",
            knex.raw("COALESCE(signup_counts.count, 0) as signup_count")
        ])
        .leftJoin(
            knex("drop_signups")
            .select("drop_id")
            .count("* as count")
            .groupBy("drop_id")
            .as("signup_counts"),
            "d.id",
            "signup_counts.drop_id"
        )
        .where("d.user_id", userId)
        .orderBy("d.created_at", "desc");

    if (options.limit) {
        query.limit(options.limit);
    }

    if (options.offset) {
        query.offset(options.offset);
    }

    return await query;
}

// Create a signup for a drop
async function createSignup(dropId, signupData) {
    const data = {
        drop_id: dropId,
        ...signupData
    };

    try {
        console.log('🔧 Attempting to insert signup data:', data);

        // PostgreSQL-compatible insert with returning clause
        const result = await knex("drop_signups").insert(data).returning("*");

        console.log('✅ Insert result:', result);

        // PostgreSQL returns an array, get the first item
        const insertedSignup = Array.isArray(result) ? result[0] : result;

        console.log('✅ Inserted signup:', insertedSignup);

        // Invalidate analytics cache when new signup is created
        try {
            const analyticsService = require("../services/analytics/analytics.service");
            const drop = await knex("drops").where("id", dropId).first();
            if (drop) {
                await analyticsService.invalidateDropCache(dropId, drop.user_id);
                await analyticsService.invalidateUserCache(drop.user_id);
                console.log(`📊 Invalidated analytics cache for drop ${dropId} and user ${drop.user_id}`);
            }
        } catch (cacheError) {
            console.error("❌ Error invalidating cache after signup:", cacheError);
            // Don't fail the signup if cache invalidation fails
        }

        return insertedSignup;
    } catch (error) {
        console.error('🚨 Insert error:', error);

        // Handle duplicate email signup (PostgreSQL uses different error codes)
        if (error.code === 'ER_DUP_ENTRY' ||
            error.code === 'SQLITE_CONSTRAINT' ||
            error.code === '23505' || // PostgreSQL unique violation
            error.constraint && error.constraint.includes('unique')) {
            throw new Error('Email already signed up for this drop');
        }
        throw error;
    }
}

// Find signups for a drop
async function findSignups(dropId, options = {}) {
    const query = knex("drop_signups")
        .where("drop_id", dropId)
        .orderBy("created_at", "desc");

    if (options.limit) {
        query.limit(options.limit);
    }

    if (options.offset) {
        query.offset(options.offset);
    }

    return await query;
}

// Get signup count for a drop
async function getSignupCount(dropId) {
    const result = await knex("drop_signups")
        .where("drop_id", dropId)
        .count("id as count")
        .first();
    return parseInt(result.count) || 0;
}

// Check if email is already signed up
async function isEmailSignedUp(dropId, email) {
    // Return false if no email provided (can't be a duplicate)
    if (!email) {
        console.log('🔍 No email provided for duplicate check');
        return false;
    }

    const signup = await knex("drop_signups")
        .where("drop_id", dropId)
        .where("email", email)
        .first();
    return !!signup;
}

// Check if phone number is already signed up
async function isPhoneSignedUp(dropId, phone) {
    // Return false if no phone provided (can't be a duplicate)
    if (!phone) {
        console.log('🔍 No phone provided for duplicate check');
        return false;
    }

    const signup = await knex("drop_signups")
        .where("drop_id", dropId)
        .where("phone", phone)
        .first();
    return !!signup;
}

// Count drops by user
async function countByUser(userId) {
    const result = await knex("drops")
        .where("user_id", userId)
        .count("id as count")
        .first();
    return parseInt(result.count) || 0;
}

// Get total fans by user (across all drops)
async function getTotalFansByUser(userId) {
    const result = await knex("drop_signups as ds")
        .join("drops as d", "ds.drop_id", "d.id")
        .where("d.user_id", userId)
        .countDistinct("ds.email as count")
        .first();
    return parseInt(result.count) || 0;
}

// 🚀 ADVANCED ANALYTICS - LAYLO-STYLE FANS SYSTEM

// Get comprehensive fan analytics for a user's drops
async function getFanAnalytics(userId, options = {}) {
    const { limit = 100, offset = 0, search = '', sortBy = 'latest', dropId = null } = options;

    let query = knex("drop_signups as ds")
        .select([
            "ds.email",
            "ds.name",
            "ds.phone",
            "ds.ip_address",
            "ds.created_at as join_date",
            "ds.referrer",
            "d.title as drop_title",
            "d.slug as drop_slug",
            "d.id as drop_id"
        ])
        .select(knex.raw(`
            COUNT(*) OVER (PARTITION BY ds.email) as total_rsvps,
            ROW_NUMBER() OVER (PARTITION BY ds.email ORDER BY ds.created_at ASC) as rsvp_rank
        `))
        .join("drops as d", "ds.drop_id", "d.id")
        .where("d.user_id", userId);

    // Filter by specific drop if provided
    if (dropId) {
        query = query.where("d.id", dropId);
    }

    // Search functionality
    if (search) {
        query = query.where(function() {
            this.where("ds.email", "like", `%${search}%`)
                .orWhere("ds.name", "like", `%${search}%`)
                .orWhere("d.title", "like", `%${search}%`);
        });
    }

    // Sorting
    switch (sortBy) {
        case 'latest':
            query = query.orderBy("ds.created_at", "desc");
            break;
        case 'oldest':
            query = query.orderBy("ds.created_at", "asc");
            break;
        case 'most_active':
            query = query.orderBy("total_rsvps", "desc").orderBy("ds.created_at", "desc");
            break;
        case 'name':
            query = query.orderBy("ds.name", "asc");
            break;
        case 'email':
            query = query.orderBy("ds.email", "asc");
            break;
        default:
            query = query.orderBy("ds.created_at", "desc");
    }

    // Apply pagination
    const fans = await query.limit(limit).offset(offset);

    // Get total count for pagination
    const totalQuery = knex("drop_signups as ds")
        .join("drops as d", "ds.drop_id", "d.id")
        .where("d.user_id", userId);

    if (dropId) {
        totalQuery.where("d.id", dropId);
    }

    if (search) {
        totalQuery.where(function() {
            this.where("ds.email", "like", `%${search}%`)
                .orWhere("ds.name", "like", `%${search}%`)
                .orWhere("d.title", "like", `%${search}%`);
        });
    }

    const totalResult = await totalQuery.countDistinct("ds.email as count").first();
    const total = parseInt(totalResult.count) || 0;

    // Process fans data to add location and acquisition channel
    const processedFans = await Promise.all(fans.map(async(fan) => {
        // Get location from IP address
        const location = await getLocationFromIP(fan.ip_address);

        // Determine acquisition channel
        const acquisitionChannel = getAcquisitionChannel(fan.referrer);

        // Get all drops this fan has signed up for
        const fanDrops = await knex("drop_signups as ds")
            .select("d.title", "d.slug", "ds.created_at")
            .join("drops as d", "ds.drop_id", "d.id")
            .where("ds.email", fan.email)
            .where("d.user_id", userId)
            .orderBy("ds.created_at", "desc");

        return {
            ...fan,
            location: location,
            acquisition_channel: acquisitionChannel,
            fan_drops: fanDrops,
            is_repeat_fan: fan.total_rsvps > 1
        };
    }));

    return {
        fans: processedFans,
        total: total,
        hasMore: (offset + limit) < total,
        pagination: {
            limit,
            offset,
            total,
            pages: Math.ceil(total / limit),
            currentPage: Math.floor(offset / limit) + 1
        }
    };
}

// Get fan summary statistics for dashboard
async function getFanSummaryStats(userId, dropId = null) {
    try {
        console.log(`🚀 Getting fan summary stats for user ${userId}, drop ${dropId}`);

        let baseQuery = knex("drop_signups as ds")
            .join("drops as d", "ds.drop_id", "d.id")
            .where("d.user_id", userId);

        if (dropId) {
            baseQuery = baseQuery.where("d.id", dropId);
        }

        // Total unique fans
        const uniqueFansResult = await baseQuery.clone().countDistinct("ds.email as count").first();
        const totalUniqueFans = parseInt(uniqueFansResult.count) || 0;

        // Total RSVPs
        const totalRSVPsResult = await baseQuery.clone().count("ds.id as count").first();
        const totalRSVPs = parseInt(totalRSVPsResult.count) || 0;

        // Repeat fans (fans who have RSVP'd to multiple drops)
        const repeatFansResult = await knex("drop_signups as ds")
            .join("drops as d", "ds.drop_id", "d.id")
            .where("d.user_id", userId)
            .select("ds.email")
            .groupBy("ds.email")
            .having(knex.raw("COUNT(*) > 1"))
            .then(results => results.length);

        // Recent signups (last 7 days) - PostgreSQL compatible
        const recentSignupsResult = await baseQuery.clone()
            .where("ds.created_at", ">=", knex.raw("NOW() - INTERVAL '7 days'"))
            .count("ds.id as count")
            .first();
        const recentSignups = parseInt(recentSignupsResult.count) || 0;

        // Top acquisition channels
        const topChannels = await baseQuery.clone()
            .select(knex.raw(`
            CASE
                WHEN ds.referrer IS NULL OR ds.referrer = '' THEN 'Direct'
                WHEN ds.referrer LIKE '%instagram%' THEN 'Instagram'
                WHEN ds.referrer LIKE '%twitter%' OR ds.referrer LIKE '%t.co%' THEN 'Twitter'
                WHEN ds.referrer LIKE '%facebook%' THEN 'Facebook'
                WHEN ds.referrer LIKE '%tiktok%' THEN 'TikTok'
                WHEN ds.referrer LIKE '%youtube%' THEN 'YouTube'
                WHEN ds.referrer LIKE '%google%' THEN 'Google'
                ELSE 'Other'
            END as channel
        `))
            .count("ds.id as count")
            .groupBy("channel")
            .orderBy("count", "desc")
            .limit(5);

        // Growth trend (last 30 days) - PostgreSQL compatible
        const growthTrend = await baseQuery.clone()
            .select(knex.raw("DATE(ds.created_at) as date"))
            .count("ds.id as signups")
            .where("ds.created_at", ">=", knex.raw("NOW() - INTERVAL '30 days'"))
            .groupBy("date")
            .orderBy("date", "asc");

        const result = {
            totalUniqueFans,
            totalRSVPs,
            repeatFans: repeatFansResult,
            recentSignups,
            averageRSVPsPerFan: totalUniqueFans > 0 ? (totalRSVPs / totalUniqueFans).toFixed(1) : '0',
            topAcquisitionChannels: topChannels || [],
            growthTrend: growthTrend || []
        };

        console.log(`✅ Fan summary stats result:`, result);
        return result;

    } catch (error) {
        console.error('🚨 Error in getFanSummaryStats:', error);
        // Return default stats on error
        return {
            totalUniqueFans: 0,
            totalRSVPs: 0,
            repeatFans: 0,
            recentSignups: 0,
            averageRSVPsPerFan: '0',
            topAcquisitionChannels: [],
            growthTrend: []
        };
    }
}

// Get location from IP address (simplified - you can integrate with a real IP geolocation service)
async function getLocationFromIP(ipAddress) {
    if (!ipAddress || ipAddress === '127.0.0.1' || ipAddress === '::1') {
        return 'Local';
    }

    // For now, return a placeholder. In production, integrate with:
    // - MaxMind GeoIP2
    // - IPinfo.io
    // - ipapi.co
    // - etc.

    try {
        // Simple IP-based location detection
        const geoip = require('geoip-lite');
        const geo = geoip.lookup(ipAddress);

        if (geo) {
            return `${geo.city || 'Unknown'}, ${geo.region || ''} ${geo.country || ''}`.trim();
        }
    } catch (error) {
        console.warn('GeoIP lookup failed:', error.message);
    }

    return 'Unknown';
}

// Determine acquisition channel from referrer
function getAcquisitionChannel(referrer) {
    if (!referrer || referrer === '') {
        return 'Direct';
    }

    const ref = referrer.toLowerCase();

    if (ref.includes('instagram')) return 'Instagram';
    if (ref.includes('twitter') || ref.includes('t.co')) return 'Twitter';
    if (ref.includes('facebook')) return 'Facebook';
    if (ref.includes('tiktok')) return 'TikTok';
    if (ref.includes('youtube')) return 'YouTube';
    if (ref.includes('google')) return 'Google';
    if (ref.includes('linkedin')) return 'LinkedIn';
    if (ref.includes('reddit')) return 'Reddit';
    if (ref.includes('discord')) return 'Discord';
    if (ref.includes('telegram')) return 'Telegram';

    // Check for common UTM parameters
    if (ref.includes('utm_source=email')) return 'Email';
    if (ref.includes('utm_source=sms')) return 'SMS';
    if (ref.includes('utm_source=newsletter')) return 'Newsletter';

    return 'Other';
}

// Get featured drops for homepage display
async function getFeaturedDrops(options = {}) {
    const { limit = 6 } = options;

    const query = knex("drops")
        .select([
            "drops.*",
            knex.raw("COUNT(drop_signups.id) as signup_count"),
            knex.raw("COUNT(DISTINCT visits.id) as view_count")
        ])
        .leftJoin("drop_signups", "drops.id", "drop_signups.drop_id")
        .leftJoin("visits", function() {
            this.on("visits.link_id", "=", knex.raw("CONCAT('/drop/', drops.slug)"))
                .orOn("visits.link_id", "=", knex.raw("CONCAT('drop/', drops.slug)"));
        })
        .where("drops.show_on_homepage", true)
        .where("drops.is_active", true)
        .groupBy("drops.id")
        .orderBy("drops.created_at", "desc")
        .limit(limit);

    return await query;
}

module.exports = {
    create,
    find,
    findOne,
    findBySlug,
    findByUser,
    findByUserWithStats,
    findWithStats,
    update,
    remove,
    createSignup,
    findSignups,
    getSignupCount,
    isEmailSignedUp,
    isPhoneSignedUp,
    countByUser,
    getTotalFansByUser,
    // 🚀 Advanced Analytics
    getFanAnalytics,
    getFanSummaryStats,
    getLocationFromIP,
    getAcquisitionChannel,
    // 🏠 Homepage Features
    getFeaturedDrops
};