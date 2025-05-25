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
router.use(asyncHandler(auth.jwtAuth));

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

module.exports = router;
