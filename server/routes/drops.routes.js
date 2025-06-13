const { Router } = require("express");
const { validationResult } = require("express-validator");

const auth = require("../handlers/auth.handler");
const drops = require("../handlers/drops.handler");
const asyncHandler = require("../utils/asyncHandler");
const { CustomError } = require("../utils");

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

// Protected routes (require authentication)
router.use(auth.jwt);

// GET /api/drops - Get user's drops
router.get(
    "/",
    asyncHandler(drops.getUserDrops)
);

// POST /api/drops - Create new drop
router.post(
    "/",
    drops.createDropValidation,
    validateRequest,
    asyncHandler(drops.createDrop)
);

// GET /api/drops/:id - Get single drop
router.get(
    "/:id",
    asyncHandler(drops.getDrop)
);

// PUT /api/drops/:id - Update drop
router.put(
    "/:id",
    drops.updateDropValidation,
    validateRequest,
    asyncHandler(drops.updateDrop)
);

// DELETE /api/drops/:id - Delete drop
router.delete(
    "/:id",
    asyncHandler(drops.deleteDrop)
);

// GET /api/drops/:id/signups - Get drop signups
router.get(
    "/:id/signups",
    asyncHandler(drops.getDropSignups)
);

// GET /api/drops/:id/analytics - Get drop analytics for edit page
router.get(
    "/:id/analytics",
    asyncHandler(drops.getDropAnalytics)
);

// 🚀 ANALYTICS ROUTES - LAYLO-STYLE FANS SYSTEM

// GET /api/drops/analytics/fans - Get comprehensive fan analytics
router.get(
    "/analytics/fans",
    asyncHandler(drops.getFanAnalytics)
);

// GET /api/drops/analytics/summary - Get fan summary statistics
router.get(
    "/analytics/summary",
    asyncHandler(drops.getFanSummaryStats)
);

module.exports = router;