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
    body("sub_header")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Sub-header must be less than 500 characters"),
    body("sub_header_title")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Sub-header title must be less than 100 characters"),
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
    .custom((value) => {
        if (!value) return true; // Optional field

        console.log('📱 Server validating phone number:', value);

        // Accept international format (+1XXXXXXXXXX) or clean 10-digit US numbers
        const cleanPhone = value.replace(/[^\d+]/g, '');
        console.log('📱 Cleaned phone number:', cleanPhone);

        // Check for +1 followed by 10 digits (US format)
        if (/^\+1\d{10}$/.test(cleanPhone)) {
            console.log('📱 Phone validation passed: +1 format');
            return true;
        }

        // Check for exactly 10 digits (US format without country code)
        if (/^\d{10}$/.test(cleanPhone)) {
            console.log('📱 Phone validation passed: 10-digit format');
            return true;
        }

        console.log('📱 Phone validation failed:', {
            original: value,
            cleaned: cleanPhone,
            length: cleanPhone.length,
            hasPlus: cleanPhone.includes('+')
        });

        // Provide specific error messages based on the issue
        if (cleanPhone.length === 0) {
            throw new Error('Phone number cannot be empty');
        } else if (cleanPhone.length < 10) {
            throw new Error(`Phone number too short: ${cleanPhone.length} digits (need 10)`);
        } else if (cleanPhone.length > 11) {
            throw new Error(`Phone number too long: ${cleanPhone.length} digits (need 10)`);
        } else if (cleanPhone.length === 11 && !cleanPhone.startsWith('+1')) {
            throw new Error('11-digit number must start with +1 for US format');
        } else {
            throw new Error(`Invalid phone format: ${value} (need 10 digits like 5551234567)`);
        }
    })
    .withMessage("Please enter a valid 10-digit US phone number"),
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

// Update drop with enhanced error handling and column validation
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

        // Validate and sanitize update data to prevent column errors
        const sanitizedData = validateAndSanitizeDropData(req.body);

        console.log(`🔄 Updating drop ${id} with data:`, Object.keys(sanitizedData));

        const updatedDrop = await drop.update(id, sanitizedData);
        const dropWithStats = await drop.findWithStats({ id: updatedDrop.id });

        console.log(`✅ Drop ${id} updated successfully`);

        res.json({
            success: true,
            data: dropWithStats
        });
    } catch (error) {
        console.error(`❌ Error updating drop ${id}:`, error);

        if (error.code === 'ER_DUP_ENTRY' || error.code === 'SQLITE_CONSTRAINT') {
            throw new CustomError("A drop with this slug already exists", 400);
        }

        // Handle PostgreSQL column errors
        if (error.code === '42703') {
            console.error('🚨 PostgreSQL column error:', error.message);
            throw new CustomError("Invalid field in update request", 400);
        }

        throw error;
    }
}

// Validate and sanitize drop data to prevent database column errors
function validateAndSanitizeDropData(data) {
    // Define allowed columns based on actual database schema
    const allowedColumns = [
        'title',
        'description',
        'sub_header',
        'sub_header_title',
        'slug',
        'cover_image',
        'background_color',
        'text_color',
        'title_color',
        'description_color',
        'card_color',
        'button_color',
        'button_text_color',
        'form_field_color',
        'button_text',
        'background_type',
        'card_background_type',
        'gradient_data',
        'custom_css',
        'is_active',
        'collect_email',
        'collect_phone',
        'website_link',
        'instagram_link',
        'twitter_link',
        'youtube_link',
        'spotify_link',
        'tiktok_link',
        'apple_music_url',
        'soundcloud_url'
    ];

    const sanitizedData = {};

    // Only include fields that exist in the database schema
    for (const [key, value] of Object.entries(data)) {
        if (allowedColumns.includes(key)) {
            // Additional validation for specific field types
            if (key.includes('color') && value) {
                // Validate color format
                if (/^#[0-9A-F]{6}$/i.test(value)) {
                    sanitizedData[key] = value;
                } else {
                    console.warn(`⚠️ Invalid color format for ${key}: ${value}`);
                }
            } else if (key.includes('_link') || key.includes('_url') || key === 'cover_image') {
                // Validate URL format (optional)
                if (!value || value === '' || isValidUrl(value)) {
                    sanitizedData[key] = value || null;
                } else {
                    console.warn(`⚠️ Invalid URL format for ${key}: ${value}`);
                }
            } else if (typeof value === 'boolean' || key === 'is_active' || key === 'collect_email' || key === 'collect_phone') {
                // Handle boolean fields
                sanitizedData[key] = Boolean(value);
            } else if (key === 'gradient_data') {
                // Handle gradient data - validate JSON format
                if (value && typeof value === 'string') {
                    try {
                        const parsed = JSON.parse(value);
                        if (parsed && typeof parsed === 'object') {
                            sanitizedData[key] = value; // Store as JSON string
                            console.log('🎨 Valid gradient data captured:', value);
                        } else {
                            console.warn(`⚠️ Invalid gradient data format: ${value}`);
                        }
                    } catch (error) {
                        console.warn(`⚠️ Invalid gradient data JSON: ${value}`, error.message);
                    }
                }
            } else {
                // Include other valid fields
                sanitizedData[key] = value;
            }
        } else {
            console.warn(`⚠️ Ignoring unknown field: ${key}`);
        }
    }

    console.log(`🔍 Sanitized ${Object.keys(data).length} fields to ${Object.keys(sanitizedData).length} valid fields`);

    return sanitizedData;
}

// URL validation helper
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
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
    try {
        const { slug } = req.params;
        const { email, phone, name } = req.body;

        console.log(`🚀 Drop signup attempt for slug: ${slug}`);
        console.log(`📧 Email: ${email}`);
        console.log(`📱 Phone: ${phone || 'none'}`);
        console.log(`👤 Name: ${name || 'none'}`);

        // Find the drop by slug
        console.log(`🔍 Looking for drop with slug: ${slug}`);
        const foundDrop = await drop.findBySlug(slug);

        if (!foundDrop) {
            console.error(`❌ Drop not found for slug: ${slug}`);
            throw new CustomError("Drop not found", 404);
        }

        if (!foundDrop.is_active) {
            console.error(`❌ Drop is inactive: ${slug}`);
            throw new CustomError("Drop is currently inactive", 404);
        }

        console.log(`✅ Found active drop: ${foundDrop.title} (ID: ${foundDrop.id})`);

        // Check if email already signed up
        console.log(`🔍 Checking if email already signed up: ${email}`);
        const alreadySignedUp = await drop.isEmailSignedUp(foundDrop.id, email);
        if (alreadySignedUp) {
            console.error(`❌ Email already signed up: ${email}`);
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

        console.log(`📝 Creating signup with data:`, signupData);

        try {
            // Create signup in main database
            console.log(`💾 Inserting signup into database...`);
            const newSignup = await drop.createSignup(foundDrop.id, signupData);
            console.log(`✅ Signup created successfully:`, newSignup);

            // 🚀 OPTIONAL CRM INTEGRATION (graceful fallback if CRM not available)
            try {
                const contactService = require('../services/crm/contact.service');
                await contactService.createFromDropSignup(signupData, foundDrop.id);
                console.log('✅ Contact created in CRM for drop signup');
            } catch (crmError) {
                console.warn('⚠️ CRM integration failed (continuing without CRM):', crmError.message);
                // Continue without CRM - don't fail the signup
            }

            // 📱 PRODUCTION SMS CONFIRMATION (graceful fallback if SMS not available)
            try {
                const twilioService = require('../services/sms/twilio.service');

                if (phone) {
                    console.log(`📱 Sending SMS confirmation to ${phone}...`);

                    // Check if phone number is opted out
                    const isOptedOut = await twilioService.isOptedOut(phone);

                    if (isOptedOut) {
                        console.log(`📱 Phone ${phone} is opted out - skipping SMS`);
                    } else {
                        const smsResult = await twilioService.sendDropSignupConfirmation({ name, email, phone }, { id: foundDrop.id, title: foundDrop.title, slug: foundDrop.slug },
                            newSignup.id // Pass signup ID for tracking
                        );

                        if (smsResult.success) {
                            console.log(`✅ SMS confirmation sent successfully - SID: ${smsResult.messageSid}`);
                        } else {
                            console.warn(`⚠️ SMS confirmation failed: ${smsResult.error}`);
                        }
                    }
                } else {
                    console.log('📱 SMS not sent - no phone number provided');
                }
            } catch (smsError) {
                console.warn('⚠️ SMS service failed (continuing without SMS):', smsError.message);
                // Continue without SMS - don't fail the signup
            }

            console.log(`🎉 Signup process completed successfully for ${email}`);

            res.status(201).json({
                success: true,
                message: foundDrop.thank_you_message || "Thank you for signing up! You'll be notified when this drop goes live."
            });
        } catch (dbError) {
            console.error(`🚨 Database error during signup creation:`, dbError);

            if (dbError.message.includes('already signed up')) {
                throw new CustomError("Email already signed up for this drop", 400);
            }

            // Check for specific database errors
            if (dbError.code === 'ER_NO_SUCH_TABLE' || dbError.message.includes('no such table')) {
                console.error(`🚨 Table missing error - drop_signups table may not exist`);
                throw new CustomError("Database configuration error. Please contact support.", 500);
            }

            if (dbError.code === 'ER_DUP_ENTRY' || dbError.code === 'SQLITE_CONSTRAINT') {
                throw new CustomError("Email already signed up for this drop", 400);
            }

            throw new CustomError("Database error occurred. Please try again.", 500);
        }
    } catch (error) {
        console.error(`🚨 Signup error for slug ${req.params.slug}:`, error);

        // If it's already a CustomError, just re-throw it
        if (error.name === 'CustomError') {
            throw error;
        }

        // For any other error, wrap it
        throw new CustomError("An unexpected error occurred. Please try again.", 500);
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

// Get analytics for specific drop (for edit page)
async function getDropAnalytics(req, res) {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if drop belongs to user
    const foundDrop = await drop.findWithStats({ id, user_id: userId });
    if (!foundDrop) {
        throw new CustomError("Drop not found", 404);
    }

    // Get recent signups for this drop
    const recentSignups = await drop.findSignups({ drop_id: parseInt(id) }, { limit: 5 });

    // Calculate basic analytics
    const views = foundDrop.view_count || 0;
    const fans = foundDrop.signup_count || 0;
    const conversionRate = views > 0 ? ((fans / views) * 100).toFixed(1) : 0;

    res.json({
        success: true,
        data: {
            views,
            fans,
            conversionRate,
            recentSignups: recentSignups.map(signup => ({
                email: signup.email,
                phone: signup.phone,
                created_at: signup.created_at
            }))
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