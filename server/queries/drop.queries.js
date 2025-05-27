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

// Update a drop
async function update(id, data) {
    await knex("drops").where("id", id).update(data);
    return await knex("drops").where("id", id).first();
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

// Get drops with stats for user
async function findByUserWithStats(userId, options = {}) {
    const drops = await findByUser(userId, options);

    const dropsWithStats = await Promise.all(
        drops.map(async(drop) => {
            const signupCount = await getSignupCount(drop.id);
            return {
                ...drop,
                signup_count: signupCount
            };
        })
    );

    return dropsWithStats;
}

// Create a signup for a drop
async function createSignup(dropId, signupData) {
    const data = {
        drop_id: dropId,
        ...signupData
    };

    try {
        const [id] = await knex("drop_signups").insert(data);
        return await knex("drop_signups").where("id", id).first();
    } catch (error) {
        // Handle duplicate email signup
        if (error.code === 'ER_DUP_ENTRY' || error.code === 'SQLITE_CONSTRAINT') {
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
    const signup = await knex("drop_signups")
        .where("drop_id", dropId)
        .where("email", email)
        .first();
    return !!signup;
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

    // Recent signups (last 7 days)
    const recentSignupsResult = await baseQuery.clone()
        .where("ds.created_at", ">=", knex.raw("DATE_SUB(NOW(), INTERVAL 7 DAY)"))
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

    // Growth trend (last 30 days)
    const growthTrend = await baseQuery.clone()
        .select(knex.raw("DATE(ds.created_at) as date"))
        .count("ds.id as signups")
        .where("ds.created_at", ">=", knex.raw("DATE_SUB(NOW(), INTERVAL 30 DAY)"))
        .groupBy("date")
        .orderBy("date", "asc");

    return {
        totalUniqueFans,
        totalRSVPs,
        repeatFans: repeatFansResult,
        recentSignups,
        averageRSVPsPerFan: totalUniqueFans > 0 ? (totalRSVPs / totalUniqueFans).toFixed(1) : 0,
        topAcquisitionChannels: topChannels,
        growthTrend
    };
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
    // 🚀 Advanced Analytics
    getFanAnalytics,
    getFanSummaryStats,
    getLocationFromIP,
    getAcquisitionChannel
};