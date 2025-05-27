const { body, param, query } = require("express-validator");
const { drop } = require("../queries");
const { CustomError } = require("../utils");

// Validation rules
const createDropValidation = [
    body("title")
    .isLength({ min: 1, max: 255 })
    .withMessage("Title must be between 1 and 255 characters"),
    body("description")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Description must be less than 1000 characters"),
    body("slug")
    .optional()
    .isLength({ max: 100 })
    .matches(/^[a-z0-9-]+$/)
    .withMessage("Slug must contain only lowercase letters, numbers, and hyphens"),
    body("background_color")
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage("Background color must be a valid hex color"),
    body("card_color")
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage("Card color must be a valid hex color"),
    body("title_color")
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage("Title color must be a valid hex color"),
    body("description_color")
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage("Description color must be a valid hex color"),
    body("button_color")
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage("Button color must be a valid hex color"),
    body("button_text")
    .optional()
    .isLength({ max: 50 })
    .withMessage("Button text must be less than 50 characters"),
    body("collect_email")
    .optional()
    .isBoolean()
    .withMessage("Collect email must be a boolean"),
    body("collect_phone")
    .optional()
    .isBoolean()
    .withMessage("Collect phone must be a boolean"),
    body("is_active")
    .optional()
    .isBoolean()
    .withMessage("Is active must be a boolean"),
];

const updateDropValidation = [
    param("id").isInt().withMessage("Drop ID must be an integer"),
    ...createDropValidation
];

const signupValidation = [
    param("slug")
    .isLength({ min: 1, max: 100 })
    .withMessage("Invalid drop slug"),
    body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
    body("phone")
    .optional()
    .isMobilePhone()
    .withMessage("Valid phone number required"),
    body("name")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Name must be less than 100 characters"),
];

// Create a new drop
async function createDrop(req, res) {
    const userId = req.user.id;
    const dropData = {
        ...req.body,
        user_id: userId
    };

    try {
        const newDrop = await drop.create(dropData);
        const dropWithStats = await drop.findWithStats({ id: newDrop.id });

        res.status(201).json({
            success: true,
            data: dropWithStats
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' || error.code === 'SQLITE_CONSTRAINT') {
            throw new CustomError("A drop with this slug already exists", 400);
        }
        throw error;
    }
}

// Get user's drops
async function getUserDrops(req, res) {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    const drops = await drop.findByUserWithStats(userId, {
        limit: parseInt(limit),
        offset: parseInt(offset)
    });

    res.json({
        success: true,
        data: drops
    });
}

// Get single drop
async function getDrop(req, res) {
    const { id } = req.params;
    const userId = req.user.id;

    const foundDrop = await drop.findWithStats({ id, user_id: userId });

    if (!foundDrop) {
        throw new CustomError("Drop not found", 404);
    }

    res.json({
        success: true,
        data: foundDrop
    });
}

// Update drop
async function updateDrop(req, res) {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if drop exists and belongs to user
    const existingDrop = await drop.findOne({ id, user_id: userId });
    if (!existingDrop) {
        throw new CustomError("Drop not found", 404);
    }

    try {
        // If slug is being updated, check if it conflicts with other drops (not this one)
        if (req.body.slug && req.body.slug !== existingDrop.slug) {
            const conflictingDrop = await drop.findBySlug(req.body.slug);
            if (conflictingDrop && conflictingDrop.id !== parseInt(id)) {
                throw new CustomError("A drop with this slug already exists", 400);
            }
        }

        const updatedDrop = await drop.update(id, req.body);
        const dropWithStats = await drop.findWithStats({ id: updatedDrop.id });

        res.json({
            success: true,
            data: dropWithStats
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' || error.code === 'SQLITE_CONSTRAINT') {
            throw new CustomError("A drop with this slug already exists", 400);
        }
        throw error;
    }
}

// Delete drop
async function deleteDrop(req, res) {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if drop exists and belongs to user
    const existingDrop = await drop.findOne({ id, user_id: userId });
    if (!existingDrop) {
        throw new CustomError("Drop not found", 404);
    }

    await drop.remove(id);

    res.json({
        success: true,
        message: "Drop deleted successfully"
    });
}

// Public drop signup
async function createSignup(req, res) {
    const { slug } = req.params;
    const { email, phone, name } = req.body;

    // Find the drop by slug
    const foundDrop = await drop.findBySlug(slug);
    if (!foundDrop || !foundDrop.is_active) {
        throw new CustomError("Drop not found or inactive", 404);
    }

    // Check if email already signed up
    const alreadySignedUp = await drop.isEmailSignedUp(foundDrop.id, email);
    if (alreadySignedUp) {
        throw new CustomError("Email already signed up for this drop", 400);
    }

    const signupData = {
        email,
        phone: phone || null,
        name: name || null,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        referrer: req.get('Referrer') || null
    };

    try {
        // Create signup in main database
        await drop.createSignup(foundDrop.id, signupData);

        // 🚀 OPTIONAL CRM INTEGRATION (graceful fallback if CRM not available)
        try {
            const contactService = require('../services/crm/contact.service');
            await contactService.createFromDropSignup(signupData, foundDrop.id);
            console.log('✅ Contact created in CRM for drop signup');
        } catch (crmError) {
            console.warn('⚠️ CRM integration failed (continuing without CRM):', crmError.message);
            // Continue without CRM - don't fail the signup
        }

        res.status(201).json({
            success: true,
            message: foundDrop.thank_you_message || "Thank you for signing up! You'll be notified when this drop goes live."
        });
    } catch (error) {
        if (error.message.includes('already signed up')) {
            throw new CustomError("Email already signed up for this drop", 400);
        }
        throw error;
    }
}

// Get drop signups (for drop owner)
async function getDropSignups(req, res) {
    const { id } = req.params;
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    // Check if drop belongs to user
    const foundDrop = await drop.findOne({ id, user_id: userId });
    if (!foundDrop) {
        throw new CustomError("Drop not found", 404);
    }

    const signups = await drop.findSignups(id, {
        limit: parseInt(limit),
        offset: parseInt(offset)
    });

    res.json({
        success: true,
        data: signups
    });
}

// 🚀 LAYLO-STYLE ANALYTICS ENDPOINTS

// Get comprehensive fan analytics
async function getFanAnalytics(req, res) {
    const userId = req.user.id;
    const {
        limit = 100,
            offset = 0,
            search = '',
            sortBy = 'latest',
            dropId = null
    } = req.query;

    const options = {
        limit: parseInt(limit),
        offset: parseInt(offset),
        search: search.trim(),
        sortBy,
        dropId: dropId ? parseInt(dropId) : null
    };

    const analytics = await drop.getFanAnalytics(userId, options);

    res.json({
        success: true,
        data: analytics
    });
}

// Get fan summary statistics
async function getFanSummaryStats(req, res) {
    try {
        const userId = req.user.id;
        const { dropId = null } = req.query;

        console.log(`🚀 Getting fan summary stats for user ${userId}, drop ${dropId}`);

        const stats = await drop.getFanSummaryStats(userId, dropId ? parseInt(dropId) : null);

        console.log(`✅ Fan summary stats:`, stats);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('🚨 Error getting fan summary stats:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get fan summary statistics'
        });
    }
}

// Get analytics for specific drop
async function getDropAnalytics(req, res) {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if drop belongs to user
    const foundDrop = await drop.findOne({ id, user_id: userId });
    if (!foundDrop) {
        throw new CustomError("Drop not found", 404);
    }

    // Get fan analytics for this specific drop
    const fanAnalytics = await drop.getFanAnalytics(userId, { dropId: parseInt(id) });
    const summaryStats = await drop.getFanSummaryStats(userId, parseInt(id));

    res.json({
        success: true,
        data: {
            drop: foundDrop,
            fanAnalytics,
            summaryStats
        }
    });
}

module.exports = {
    createDropValidation,
    updateDropValidation,
    signupValidation,
    createDrop,
    getUserDrops,
    getDrop,
    updateDrop,
    deleteDrop,
    createSignup,
    getDropSignups,
    // 🚀 Analytics
    getFanAnalytics,
    getFanSummaryStats,
    getDropAnalytics
};