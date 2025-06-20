const { Router } = require("express");

const validators = require("../handlers/validators.handler");
const helpers = require("../handlers/helpers.handler");
const asyncHandler = require("../utils/asyncHandler");
const locals = require("../handlers/locals.handler");
const homeSettings = require("../handlers/home_settings.handler");
const auth = require("../handlers/auth.handler");

const router = Router();

// Admin routes for home settings management
router.get(
    "/admin",
    locals.viewTemplate("partials/admin/home_settings/table"),
    asyncHandler(auth.apikey),
    asyncHandler(auth.jwt),
    asyncHandler(auth.admin),
    asyncHandler(homeSettings.getAdmin)
);

router.post(
    "/admin",
    homeSettings.upload.single('event_image'),
    locals.viewTemplate("partials/admin/home_settings/form"),
    asyncHandler(auth.apikey),
    asyncHandler(auth.jwt),
    asyncHandler(auth.admin),
    validators.updateHomeSettings,
    asyncHandler(helpers.verify),
    asyncHandler(homeSettings.update)
);

// Public API route for getting home settings (for the home page)
router.get(
    "/",
    asyncHandler(homeSettings.get)
);

// 🚀 HOMEPAGE REFRESH ENDPOINT - Get updated homepage data
router.get(
    "/refresh",
    asyncHandler(homeSettings.getHomepageData)
);

module.exports = router;