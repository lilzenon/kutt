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

        const foundDrop = await drop.findBySlug(slug);
        if (!foundDrop) {
            return res.status(404).render("404", {
                message: "Drop not found"
            });
        }

        // Get signup count for display
        const signupCount = await drop.getSignupCount(foundDrop.id);

        res.render("drop_landing", {
            drop: {
                ...foundDrop,
                signup_count: signupCount
            },
            pageTitle: foundDrop.title,
            metaDescription: foundDrop.description || `Join ${foundDrop.title} - Get notified when this drop goes live!`,
            metaImage: foundDrop.cover_image
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