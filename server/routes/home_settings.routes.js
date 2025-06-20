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

// 🚀 DEBUG ENDPOINT - Check drops status
router.get(
    "/debug-drops",
    asyncHandler(async(req, res) => {
        try {
            const allDrops = await query.drop.find({});
            const featuredDrops = await query.drop.getFeaturedDrops({ limit: 10 });

            res.json({
                totalDrops: allDrops.length,
                featuredDrops: featuredDrops.length,
                allDropsData: allDrops.map(drop => ({
                    id: drop.id,
                    title: drop.title,
                    show_on_homepage: drop.show_on_homepage,
                    is_active: drop.is_active,
                    created_at: drop.created_at
                })),
                featuredDropsData: featuredDrops.map(drop => ({
                    id: drop.id,
                    title: drop.title,
                    show_on_homepage: drop.show_on_homepage,
                    is_active: drop.is_active
                }))
            });
        } catch (error) {
            console.error('Debug drops error:', error);
            res.status(500).json({ error: error.message });
        }
    })
);

// 🚀 TEST ENDPOINT - Enable homepage for first drop
router.get(
    "/test-enable-homepage",
    asyncHandler(async(req, res) => {
        try {
            // Get the first drop
            const firstDrop = await query.drop.find({}, { limit: 1 });

            if (firstDrop.length === 0) {
                return res.json({ error: "No drops found to test with" });
            }

            // Enable show_on_homepage for the first drop
            await query.drop.update(firstDrop[0].id, {
                show_on_homepage: true,
                is_active: true
            });

            // Get updated data
            const updatedDrop = await query.drop.findOne({ id: firstDrop[0].id });
            const featuredDrops = await query.drop.getFeaturedDrops({ limit: 10 });

            res.json({
                message: "Test completed - enabled homepage for first drop",
                updatedDrop: {
                    id: updatedDrop.id,
                    title: updatedDrop.title,
                    show_on_homepage: updatedDrop.show_on_homepage,
                    is_active: updatedDrop.is_active
                },
                featuredDropsCount: featuredDrops.length,
                featuredDrops: featuredDrops.map(drop => ({
                    id: drop.id,
                    title: drop.title,
                    show_on_homepage: drop.show_on_homepage,
                    is_active: drop.is_active
                }))
            });
        } catch (error) {
            console.error('Test enable homepage error:', error);
            res.status(500).json({ error: error.message });
        }
    })
);

module.exports = router;