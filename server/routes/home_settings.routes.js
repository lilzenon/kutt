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

            // Enable show_on_homepage for the first drop and add event data
            await query.drop.update(firstDrop[0].id, {
                show_on_homepage: true,
                is_active: true,
                artist_name: "Test Artist",
                event_date: new Date("2025-07-04T20:00:00"),
                event_address: "123 Test Venue, Test City, NY"
            });

            // Get updated data
            const updatedDrop = await query.drop.findOne({ id: firstDrop[0].id });
            const featuredDrops = await query.drop.getFeaturedDrops({ limit: 10 });

            res.json({
                message: "Test completed - enabled homepage for first drop with event data",
                updatedDrop: {
                    id: updatedDrop.id,
                    title: updatedDrop.title,
                    artist_name: updatedDrop.artist_name,
                    event_date: updatedDrop.event_date,
                    event_address: updatedDrop.event_address,
                    show_on_homepage: updatedDrop.show_on_homepage,
                    is_active: updatedDrop.is_active
                },
                featuredDropsCount: featuredDrops.length,
                featuredDrops: featuredDrops.map(drop => ({
                    id: drop.id,
                    title: drop.title,
                    artist_name: drop.artist_name,
                    event_date: drop.event_date,
                    event_address: drop.event_address,
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

// 🚀 COMPREHENSIVE TEST - Create sample drops with homepage enabled
router.get(
    "/test-create-sample-drops",
    asyncHandler(async(req, res) => {
        try {
            // Get the first user to assign drops to
            const firstUser = await query.user.find({}, { limit: 1 });
            const userId = firstUser.length > 0 ? firstUser[0].id : 1; // Fallback to user ID 1

            console.log(`🔧 Creating sample drops with user_id: ${userId}`);

            const sampleDrops = [{
                    title: "Summer Music Festival 2025",
                    description: "Join us for an amazing summer music festival featuring top artists!",
                    slug: "summer-music-festival-2025",
                    artist_name: "Various Artists",
                    event_date: new Date("2025-07-15T18:00:00"),
                    event_address: "Central Park, New York, NY",
                    background_color: "#ff6b6b",
                    button_text: "Get Tickets",
                    show_on_homepage: true,
                    is_active: true,
                    user_id: userId
                },
                {
                    title: "Electronic Dance Night",
                    description: "Experience the best electronic music with world-class DJs!",
                    slug: "electronic-dance-night",
                    artist_name: "DJ Awesome",
                    event_date: new Date("2025-08-20T21:00:00"),
                    event_address: "Brooklyn Warehouse, Brooklyn, NY",
                    background_color: "#4ecdc4",
                    button_text: "Join the Party",
                    show_on_homepage: true,
                    is_active: true,
                    user_id: userId
                },
                {
                    title: "Jazz & Blues Evening",
                    description: "A sophisticated evening of jazz and blues music.",
                    slug: "jazz-blues-evening",
                    artist_name: "The Jazz Collective",
                    event_date: new Date("2025-09-10T19:30:00"),
                    event_address: "Blue Note, Manhattan, NY",
                    background_color: "#45b7d1",
                    button_text: "Reserve Seat",
                    show_on_homepage: true,
                    is_active: true,
                    user_id: userId
                }
            ];

            const createdDrops = [];
            for (const dropData of sampleDrops) {
                try {
                    // Check if drop with this slug already exists
                    const existingDrop = await query.drop.findBySlug(dropData.slug);
                    if (!existingDrop) {
                        const newDrop = await query.drop.create(dropData);
                        createdDrops.push(newDrop);
                        console.log(`✅ Created sample drop: ${dropData.title} with user_id: ${userId}`);
                    } else {
                        // Update existing drop to ensure it has the correct flags
                        await query.drop.update(existingDrop.id, {
                            show_on_homepage: true,
                            is_active: true,
                            artist_name: dropData.artist_name,
                            event_date: dropData.event_date,
                            event_address: dropData.event_address
                        });
                        const updatedDrop = await query.drop.findOne({ id: existingDrop.id });
                        createdDrops.push(updatedDrop);
                        console.log(`🔄 Updated existing drop: ${dropData.title}`);
                    }
                } catch (dropError) {
                    console.error(`❌ Error creating/updating drop ${dropData.title}:`, dropError);
                }
            }

            // Get featured drops after creation
            const featuredDrops = await query.drop.getFeaturedDrops({ limit: 10 });

            console.log(`🎯 Test completed: ${createdDrops.length} drops processed, ${featuredDrops.length} featured drops found`);

            res.json({
                message: `Sample drops created/verified successfully`,
                userId: userId,
                createdCount: createdDrops.length,
                featuredDropsCount: featuredDrops.length,
                createdDrops: createdDrops.map(drop => ({
                    id: drop.id,
                    title: drop.title,
                    artist_name: drop.artist_name,
                    event_date: drop.event_date,
                    event_address: drop.event_address,
                    show_on_homepage: drop.show_on_homepage,
                    is_active: drop.is_active,
                    user_id: drop.user_id
                })),
                featuredDrops: featuredDrops.map(drop => ({
                    id: drop.id,
                    title: drop.title,
                    artist_name: drop.artist_name,
                    event_date: drop.event_date,
                    event_address: drop.event_address,
                    show_on_homepage: drop.show_on_homepage,
                    is_active: drop.is_active,
                    user_id: drop.user_id
                }))
            });
        } catch (error) {
            console.error('Test create sample drops error:', error);
            res.status(500).json({ error: error.message });
        }
    })
);

// 🚀 DIRECT TEST - Check what homepage render receives
router.get(
    "/test-homepage-data",
    asyncHandler(async(req, res) => {
        try {
            // Simulate the exact same data fetching as the homepage render
            const homeSettings = await query.homeSettings.get();
            const featuredDrops = await query.drop.getFeaturedDrops({ limit: 6 });

            console.log(`🏠 Homepage data test:`, {
                homeSettingsExists: !!homeSettings,
                featuredDropsCount: featuredDrops.length,
                featuredDropsData: featuredDrops
            });

            res.json({
                message: "Homepage data test completed",
                homeSettings: {
                    event_title: homeSettings.event_title,
                    artist_name: homeSettings.artist_name,
                    event_date: homeSettings.event_date,
                    event_address: homeSettings.event_address
                },
                featuredDrops: featuredDrops,
                featuredDropsCount: featuredDrops.length,
                totalCards: 1 + featuredDrops.length
            });
        } catch (error) {
            console.error('Test homepage data error:', error);
            res.status(500).json({ error: error.message });
        }
    })
);

module.exports = router;