const { Drop, DropSignup } = require("../models");
const { normalizeMatch } = require("../utils");

// Create a new drop
async function create(data) {
    // Generate unique slug if not provided
    if (!data.slug && data.title) {
        const existingSlugs = await Drop.query().select('slug').then(rows => rows.map(r => r.slug));
        data.slug = Drop.generateSlug(data.title, existingSlugs);
    }
    
    return await Drop.query().insert(data);
}

// Find drops with optional filters
async function find(match = {}) {
    const query = Drop.query();
    
    if (match) {
        query.where(normalizeMatch(match));
    }
    
    return await query;
}

// Find a single drop
async function findOne(match) {
    return await Drop.query().where(normalizeMatch(match)).first();
}

// Find drop by slug
async function findBySlug(slug) {
    return await Drop.query().where('slug', slug).first();
}

// Find drops by user
async function findByUser(userId, options = {}) {
    const query = Drop.query()
        .where('user_id', userId)
        .orderBy('created_at', 'desc');
    
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
    return await Drop.query().patchAndFetchById(id, data);
}

// Delete a drop
async function remove(id) {
    return await Drop.query().deleteById(id);
}

// Get drop with signup count
async function findWithStats(match) {
    const drop = await Drop.query()
        .where(normalizeMatch(match))
        .first();
    
    if (!drop) return null;
    
    const signupCount = await drop.getSignupCount();
    
    return {
        ...drop,
        signup_count: signupCount
    };
}

// Get drops with stats for user
async function findByUserWithStats(userId, options = {}) {
    const drops = await findByUser(userId, options);
    
    const dropsWithStats = await Promise.all(
        drops.map(async (drop) => {
            const signupCount = await drop.getSignupCount();
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
        return await DropSignup.query().insert(data);
    } catch (error) {
        // Handle duplicate email signup
        if (error.code === 'ER_DUP_ENTRY' || error.constraint === 'drop_signups_drop_id_email_unique') {
            throw new Error('Email already signed up for this drop');
        }
        throw error;
    }
}

// Find signups for a drop
async function findSignups(dropId, options = {}) {
    const query = DropSignup.query()
        .where('drop_id', dropId)
        .orderBy('created_at', 'desc');
    
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
    const result = await DropSignup.query()
        .where('drop_id', dropId)
        .count('id as count')
        .first();
    return parseInt(result.count) || 0;
}

// Check if email is already signed up
async function isEmailSignedUp(dropId, email) {
    const signup = await DropSignup.query()
        .where('drop_id', dropId)
        .where('email', email)
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
