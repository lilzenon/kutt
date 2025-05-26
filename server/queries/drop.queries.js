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
    isEmailSignedUp
};