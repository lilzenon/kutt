const { Router } = require("express");
const { validationResult } = require("express-validator");

const drops = require("../handlers/drops.handler");
const asyncHandler = require("../utils/asyncHandler");
const { CustomError } = require("../utils");
const { drop } = require("../queries");

const router = Router();

// Validation middleware
function validateRequest(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg);
        throw new CustomError(errorMessages.join(', '), 400);
    }
    next();
}

// GET /drop/:slug - Public drop landing page
router.get(
    "/:slug",
    asyncHandler(async(req, res) => {
        const { slug } = req.params;

        // DEBUG: Add cache busting and detailed logging
        console.log(`🔍 Looking up drop with slug: ${slug}`);

        const foundDrop = await drop.findBySlug(slug);

        console.log('🔍 Found drop data:', {
            id: foundDrop ? .id,
            title: foundDrop ? .title,
            background_color: foundDrop ? .background_color,
            background_type: foundDrop ? .background_type,
            card_background_type: foundDrop ? .card_background_type,
            button_color: foundDrop ? .button_color,
            button_text_color: foundDrop ? .button_text_color
        });

        if (!foundDrop) {
            return res.status(404).render("404", {
                message: "Drop not found"
            });
        }

        // Check if drop is active (enterprise access control)
        if (!foundDrop.is_active) {
            return res.status(404).render("drop_inactive", {
                message: "This drop is currently inactive",
                dropTitle: foundDrop.title,
                pageTitle: "Drop Inactive"
            });
        }

        // Get signup count for display
        const signupCount = await drop.getSignupCount(foundDrop.id);

        // Detect mobile vs desktop for optimized experience
        const userAgent = req.headers['user-agent'] || '';
        const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

        // Also check screen width from client hint if available
        const viewportWidth = req.headers['sec-ch-viewport-width'];
        const isMobileByWidth = viewportWidth && parseInt(viewportWidth) <= 768;

        const deviceType = (isMobile || isMobileByWidth) ? 'mobile' : 'desktop';

        res.render("drop_landing", {
            drop: {
                ...foundDrop,
                signup_count: signupCount
            },
            pageTitle: foundDrop.title,
            metaDescription: foundDrop.description || `Join ${foundDrop.title} - Get notified when this drop goes live!`,
            metaImage: foundDrop.cover_image,
            deviceType: deviceType,
            isMobile: deviceType === 'mobile',
            isDesktop: deviceType === 'desktop'
        });
    })
);

// POST /signup/:slug - Public signup endpoint
router.post(
    "/signup/:slug",
    drops.signupValidation,
    validateRequest,
    asyncHandler(drops.createSignup)
);

module.exports = router;