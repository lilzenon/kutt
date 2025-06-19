const { Router } = require("express");

const helpers = require("../handlers/helpers.handler");
const renders = require("../handlers/renders.handler");
const asyncHandler = require("../utils/asyncHandler");
const locals = require("../handlers/locals.handler");
const auth = require("../handlers/auth.handler");
const env = require("../env");

const router = Router();

// pages
router.get(
    "/",
    asyncHandler(auth.jwtLoosePage),
    asyncHandler(helpers.adminSetup),
    asyncHandler(locals.user),
    asyncHandler(renders.homepage)
);

// Home page with modern navigation
router.get(
    "/home",
    asyncHandler(auth.jwtLoosePage),
    asyncHandler(helpers.adminSetup),
    asyncHandler(locals.user),
    asyncHandler(renders.home)
);

// Home Editor dashboard page
router.get(
    "/home-editor",
    asyncHandler(auth.jwtPage),
    asyncHandler(locals.user),
    asyncHandler(renders.homeEditor)
);

router.get(
    "/login",
    asyncHandler(auth.jwtLoosePage),
    asyncHandler(helpers.adminSetup),
    asyncHandler(renders.login)
);

router.get(
    "/logout",
    asyncHandler(renders.logout)
);

router.get(
    "/create-admin",
    asyncHandler(renders.createAdmin)
);

router.get(
    "/404",
    asyncHandler(auth.jwtLoosePage),
    asyncHandler(locals.user),
    asyncHandler(renders.notFound)
);

router.get(
    "/settings",
    asyncHandler(auth.jwtPage),
    asyncHandler(locals.user),
    (req, res) => {
        res.render("settings", {
            title: "Settings - BOUNCE2BOUNCE",
            layout: "layouts/dashboard",
            currentPage: "settings"
        });
    }
);

router.get(
    "/admin",
    asyncHandler(auth.jwtPage),
    asyncHandler(auth.admin),
    asyncHandler(locals.user),
    asyncHandler(renders.admin)
);

router.get(
    "/stats",
    asyncHandler(auth.jwtPage),
    asyncHandler(locals.user),
    asyncHandler(renders.stats)
);

router.get(
    "/banned",
    asyncHandler(auth.jwtLoosePage),
    asyncHandler(locals.user),
    asyncHandler(renders.banned)
);



router.get(
    "/reset-password",
    auth.featureAccessPage([env.MAIL_ENABLED]),
    asyncHandler(auth.jwtLoosePage),
    asyncHandler(locals.user),
    asyncHandler(renders.resetPassword)
);

router.get(
    "/reset-password/:resetPasswordToken",
    asyncHandler(auth.jwtLoosePage),
    asyncHandler(locals.user),
    asyncHandler(renders.resetPasswordSetNewPassword)
);

router.get(
    "/verify-email/:changeEmailToken",
    asyncHandler(auth.changeEmail),
    asyncHandler(auth.jwtLoosePage),
    asyncHandler(locals.user),
    asyncHandler(renders.verifyChangeEmail)
);

router.get(
    "/verify/:verificationToken",
    asyncHandler(auth.verify),
    asyncHandler(auth.jwtLoosePage),
    asyncHandler(locals.user),
    asyncHandler(renders.verify)
);

router.get(
    "/terms",
    asyncHandler(auth.jwtLoosePage),
    asyncHandler(locals.user),
    asyncHandler(renders.terms)
);

// partial renders
router.get(
    "/confirm-link-delete",
    locals.noLayout,
    asyncHandler(auth.jwt),
    asyncHandler(renders.confirmLinkDelete)
);

router.get(
    "/confirm-link-ban",
    locals.noLayout,
    locals.viewTemplate("partials/links/dialog/message"),
    asyncHandler(auth.jwt),
    asyncHandler(auth.admin),
    asyncHandler(renders.confirmLinkBan)
);

router.get(
    "/confirm-user-delete",
    locals.noLayout,
    asyncHandler(auth.jwt),
    asyncHandler(auth.admin),
    asyncHandler(renders.confirmUserDelete)
);

router.get(
    "/confirm-user-ban",
    locals.noLayout,
    asyncHandler(auth.jwt),
    asyncHandler(auth.admin),
    asyncHandler(renders.confirmUserBan)
);

router.get(
    "/create-user",
    locals.noLayout,
    asyncHandler(auth.jwt),
    asyncHandler(auth.admin),
    asyncHandler(renders.createUser)
);

router.get(
    "/add-domain",
    locals.noLayout,
    asyncHandler(auth.jwt),
    asyncHandler(auth.admin),
    asyncHandler(renders.addDomainAdmin)
);


router.get(
    "/confirm-domain-ban",
    locals.noLayout,
    asyncHandler(auth.jwt),
    asyncHandler(auth.admin),
    asyncHandler(renders.confirmDomainBan)
);


router.get(
    "/confirm-domain-delete-admin",
    locals.noLayout,
    asyncHandler(auth.jwt),
    asyncHandler(auth.admin),
    asyncHandler(renders.confirmDomainDeleteAdmin)
);

router.get(
    "/link/edit/:id",
    locals.noLayout,
    asyncHandler(auth.jwt),
    asyncHandler(renders.linkEdit)
);

router.get(
    "/admin/link/edit/:id",
    locals.noLayout,
    asyncHandler(auth.jwt),
    asyncHandler(auth.admin),
    asyncHandler(renders.linkEditAdmin)
);

// Admin table endpoints for tab switching
router.get(
    "/admin/links/table",
    locals.noLayout,
    asyncHandler(auth.jwt),
    asyncHandler(auth.admin),
    (req, res) => {
        res.render("partials/admin/links/table", {
            onload: true
        });
    }
);

router.get(
    "/admin/users/table",
    locals.noLayout,
    asyncHandler(auth.jwt),
    asyncHandler(auth.admin),
    (req, res) => {
        res.render("partials/admin/users/table", {
            onload: true
        });
    }
);

router.get(
    "/admin/domains/table",
    locals.noLayout,
    asyncHandler(auth.jwt),
    asyncHandler(auth.admin),
    (req, res) => {
        res.render("partials/admin/domains/table", {
            onload: true
        });
    }
);

router.get(
    "/admin/home-settings/table",
    locals.noLayout,
    asyncHandler(auth.jwt),
    asyncHandler(auth.admin),
    (req, res) => {
        res.render("partials/admin/home_settings/table", {
            onload: true
        });
    }
);

router.get(
    "/add-domain-form",
    locals.noLayout,
    asyncHandler(auth.jwt),
    asyncHandler(renders.addDomainForm)
);

router.get(
    "/confirm-domain-delete",
    locals.noLayout,
    locals.viewTemplate("partials/settings/domain/delete"),
    asyncHandler(auth.jwt),
    asyncHandler(renders.confirmDomainDelete)
);



router.get(
    "/get-support-email",
    locals.noLayout,
    locals.viewTemplate("partials/support_email"),
    asyncHandler(renders.getSupportEmail)
);

router.get(
    "/drops/:id/edit",
    asyncHandler(auth.jwt),
    asyncHandler(locals.user),
    asyncHandler(renders.dropEdit)
);

router.get(
    "/dashboard",
    asyncHandler(auth.jwt),
    asyncHandler(locals.user),
    async(req, res) => {
        try {
            // Try optimized analytics service first
            const analyticsService = require("../services/analytics/analytics.service");
            const dashboardData = await analyticsService.getDashboardAnalytics(req.user.id);

            console.log(`📊 Dashboard loaded for user ${req.user.id}:`, {
                totalDrops: dashboardData.stats.totalDrops,
                activeDrops: dashboardData.stats.activeDrops,
                totalLinks: dashboardData.stats.totalLinks,
                totalFans: dashboardData.stats.totalFans,
                cached: dashboardData.lastUpdated
            });

            res.render("modern-dashboard", {
                title: "Dashboard",
                pageTitle: "Dashboard",
                layout: "layouts/modern-dashboard",
                currentPage: "dashboard",
                user: req.user,
                domain: env.DEFAULT_DOMAIN,
                stats: dashboardData.stats,
                recentDrops: dashboardData.recentDrops,
                recentLinks: dashboardData.recentLinks,
                lastUpdated: dashboardData.lastUpdated
            });
        } catch (analyticsError) {
            console.error('❌ Analytics service error, falling back to direct queries:', analyticsError);

            try {
                // Fallback to direct database queries
                const query = require("../queries");

                // Get user's drops with stats
                const userDrops = await query.drop.findByUserWithStats(req.user.id, { limit: 5 });

                // Get user's links using existing function
                const userLinks = await query.link.get({ "links.user_id": req.user.id }, { skip: 0, limit: 5 });

                // Calculate stats from actual data
                const totalDrops = userDrops.length;
                const activeDrops = userDrops.filter(drop => drop.is_active).length;
                const totalLinks = userLinks.length;
                const totalFans = userDrops.reduce((sum, drop) => sum + (drop.signup_count || 0), 0);

                console.log(`📊 Dashboard fallback loaded for user ${req.user.id}:`, {
                    totalDrops,
                    activeDrops,
                    totalLinks,
                    totalFans
                });

                res.render("modern-dashboard", {
                    title: "Dashboard",
                    pageTitle: "Dashboard",
                    layout: "layouts/modern-dashboard",
                    currentPage: "dashboard",
                    user: req.user,
                    domain: env.DEFAULT_DOMAIN,
                    stats: {
                        totalDrops: totalDrops || 0,
                        activeDrops: activeDrops || 0,
                        totalLinks: totalLinks || 0,
                        totalFans: totalFans || 0,
                        totalClicks: 0
                    },
                    recentDrops: userDrops || [],
                    recentLinks: userLinks || []
                });
            } catch (fallbackError) {
                console.error('❌ Fallback dashboard error:', fallbackError);

                // Final fallback with empty data
                res.render("modern-dashboard", {
                    title: "Dashboard",
                    pageTitle: "Dashboard",
                    layout: "layouts/modern-dashboard",
                    currentPage: "dashboard",
                    user: req.user,
                    domain: env.DEFAULT_DOMAIN,
                    stats: {
                        totalDrops: 0,
                        activeDrops: 0,
                        totalLinks: 0,
                        totalFans: 0,
                        totalClicks: 0
                    },
                    recentDrops: [],
                    recentLinks: [],
                    error: "Failed to load dashboard data"
                });
            }
        }
    }
);

// Legacy dashboard route for backup
router.get(
    "/dashboard-old",
    asyncHandler(auth.jwt),
    asyncHandler(locals.user),
    (req, res) => {
        // Sample data to match Laylo design
        const upcomingDrops = [{
                id: 1,
                title: "JERSEY LOVES BASS PRESALE",
                image: "/images/jersey-bass.jpg",
                scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 week from now
            },
            {
                id: 2,
                title: "JULY 4TH PRESALE",
                image: "/images/july4th.jpg",
                scheduledDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 2 weeks from now
            }
        ];

        res.render("dashboard", {
            title: "Dashboard - BOUNCE2BOUNCE",
            layout: "layouts/dashboard",
            currentPage: "dashboard",
            stats: {
                totalDrops: 2,
                totalFans: 1247,
                totalSMS: 3891,
                activeDrops: 1
            },
            recentActivity: [{
                    title: "New fan signup",
                    description: "Someone joined your JERSEY LOVES BASS drop",
                    timeAgo: "2 hours ago"
                },
                {
                    title: "Drop published",
                    description: "JULY 4TH PRESALE is now live",
                    timeAgo: "1 day ago"
                }
            ],
            upcomingDrops: upcomingDrops
        });
    }
);

router.get(
    "/sms",
    asyncHandler(auth.jwt),
    asyncHandler(locals.user),
    (req, res) => {
        res.render("sms_dashboard", { title: "SMS Dashboard - BOUNCE2BOUNCE" });
    }
);

// New Laylo-style pages

// Contact Book page
router.get(
    "/contact-book",
    asyncHandler(auth.jwt),
    asyncHandler(locals.user),
    asyncHandler(async(req, res) => {
        try {
            res.render("contact-book", {
                title: "Contact Book",
                pageTitle: "Contact Book",
                layout: "layouts/modern-dashboard",
                currentPage: "contact-book",
                user: req.user,
                domain: env.DEFAULT_DOMAIN
            });
        } catch (error) {
            console.error('❌ Contact Book page error:', error);
            res.status(500).render("error", {
                title: "Error",
                layout: "layouts/modern-dashboard",
                error: "Failed to load contact book page"
            });
        }
    })
);

router.get(
    "/profile",
    asyncHandler(auth.jwt),
    asyncHandler(locals.user),
    async(req, res) => {
        try {
            const query = require("../queries");

            // Get user stats
            const totalDrops = await query.drop.countByUser(req.user.id);
            const totalLinks = await query.link.countByUser(req.user.id);
            const totalFans = await query.drop.getTotalFansByUser(req.user.id);

            res.render("modern-profile", {
                title: "Profile",
                pageTitle: "Profile",
                layout: "layouts/modern-dashboard",
                currentPage: "profile",
                user: req.user,
                stats: {
                    totalDrops: totalDrops || 0,
                    totalLinks: totalLinks || 0,
                    totalFans: totalFans || 0
                }
            });
        } catch (error) {
            console.error('Profile error:', error);

            res.render("modern-profile", {
                title: "Profile",
                pageTitle: "Profile",
                layout: "layouts/modern-dashboard",
                currentPage: "profile",
                user: req.user,
                stats: {
                    totalDrops: 0,
                    totalLinks: 0,
                    totalFans: 0
                }
            });
        }
    }
);

// Drops page - Integrated with existing drop system
router.get(
    "/drops",
    asyncHandler(auth.jwt),
    asyncHandler(locals.user),
    async(req, res) => {
        try {
            const query = require("../queries");

            // Get user's drops with stats using existing queries
            const userDrops = await query.drop.findByUserWithStats(req.user.id, { limit: 50 });

            // Calculate stats from the actual data
            const totalDrops = userDrops.length;
            const activeDrops = userDrops.filter(drop => drop.is_active).length;
            const totalFans = userDrops.reduce((sum, drop) => sum + (drop.signup_count || 0), 0);

            console.log(`📊 Drops page loaded for user ${req.user.id}:`, {
                totalDrops,
                activeDrops,
                totalFans,
                dropsFound: userDrops.length
            });

            res.render("modern-drops", {
                title: "Drops",
                pageTitle: "Drops",
                layout: "layouts/modern-dashboard",
                currentPage: "drops",
                user: req.user,
                drops: userDrops || [],
                stats: {
                    totalDrops: totalDrops || 0,
                    activeDrops: activeDrops || 0,
                    totalFans: totalFans || 0
                }
            });
        } catch (error) {
            console.error('❌ Drops page error:', error);

            res.render("modern-drops", {
                title: "Drops",
                pageTitle: "Drops",
                layout: "layouts/modern-dashboard",
                currentPage: "drops",
                user: req.user,
                drops: [],
                stats: {
                    totalDrops: 0,
                    activeDrops: 0,
                    totalFans: 0
                },
                error: "Failed to load drops data"
            });
        }
    }
);

// Links page
router.get(
    "/links",
    asyncHandler(auth.jwt),
    asyncHandler(locals.user),
    async(req, res) => {
        try {
            const query = require("../queries");

            // Get user's links using existing function
            const userLinks = await query.link.get({ "links.user_id": req.user.id }, { skip: 0, limit: 20 });

            // Calculate stats from actual data
            const totalLinks = userLinks.length;
            const totalClicks = userLinks.reduce((sum, link) => sum + (link.visit_count || 0), 0);

            console.log(`📊 Links page loaded for user ${req.user.id}:`, {
                totalLinks,
                totalClicks,
                linksFound: userLinks.length
            });

            res.render("modern-links", {
                title: "Links",
                pageTitle: "Links",
                layout: "layouts/modern-dashboard",
                currentPage: "links",
                user: req.user,
                links: userLinks || [],
                stats: {
                    totalLinks: totalLinks || 0,
                    totalClicks: totalClicks || 0
                }
            });
        } catch (error) {
            console.error('❌ Links error:', error);

            res.render("modern-links", {
                title: "Links",
                pageTitle: "Links",
                layout: "layouts/modern-dashboard",
                currentPage: "links",
                user: req.user,
                links: [],
                stats: {
                    totalLinks: 0,
                    totalClicks: 0
                }
            });
        }
    }
);

// Analytics page
router.get(
    "/analytics",
    asyncHandler(auth.jwt),
    asyncHandler(locals.user),
    async(req, res) => {
        try {
            // Try optimized analytics service first
            const analyticsService = require("../services/analytics/analytics.service");
            const analyticsData = await analyticsService.getAnalyticsPageData(req.user.id);

            console.log(`📊 Analytics page loaded for user ${req.user.id}:`, {
                totalDrops: analyticsData.stats.totalDrops,
                activeDrops: analyticsData.stats.activeDrops,
                totalLinks: analyticsData.stats.totalLinks,
                totalFans: analyticsData.stats.totalFans,
                totalClicks: analyticsData.stats.totalClicks,
                recentFanSignups: analyticsData.fanAnalytics.fans.length,
                cached: analyticsData.lastUpdated
            });

            res.render("modern-analytics", {
                title: "Analytics",
                pageTitle: "Analytics",
                layout: "layouts/modern-dashboard",
                currentPage: "analytics",
                user: req.user,
                stats: analyticsData.stats,
                recentDrops: analyticsData.recentDrops,
                recentLinks: analyticsData.recentLinks,
                fanAnalytics: analyticsData.fanAnalytics,
                performanceMetrics: analyticsData.performanceMetrics,
                lastUpdated: analyticsData.lastUpdated
            });
        } catch (analyticsError) {
            console.error('❌ Analytics service error, falling back to direct queries:', analyticsError);

            try {
                // Fallback to direct database queries
                const query = require("../queries");

                // Get analytics data using existing functions
                const recentDrops = await query.drop.findByUserWithStats(req.user.id, { limit: 10 });
                const recentLinks = await query.link.get({ "links.user_id": req.user.id }, { skip: 0, limit: 10 });

                // Get recent fan signups for analytics page
                const fanAnalytics = await query.drop.getFanAnalytics(req.user.id, { limit: 50 }).catch(err => {
                    console.error('❌ Error getting fan analytics:', err);
                    return { fans: [], totalCount: 0 };
                });

                // Calculate stats from actual data
                const totalDrops = recentDrops.length;
                const activeDrops = recentDrops.filter(drop => drop.is_active).length;
                const totalLinks = recentLinks.length;
                const totalFans = recentDrops.reduce((sum, drop) => sum + (drop.signup_count || 0), 0);
                const totalClicks = recentLinks.reduce((sum, link) => sum + (link.visit_count || 0), 0);

                console.log(`📊 Analytics fallback loaded for user ${req.user.id}:`, {
                    totalDrops,
                    activeDrops,
                    totalLinks,
                    totalFans,
                    totalClicks,
                    recentFanSignups: fanAnalytics.fans.length
                });

                res.render("modern-analytics", {
                    title: "Analytics",
                    pageTitle: "Analytics",
                    layout: "layouts/modern-dashboard",
                    currentPage: "analytics",
                    user: req.user,
                    stats: {
                        totalDrops: totalDrops || 0,
                        activeDrops: activeDrops || 0,
                        totalLinks: totalLinks || 0,
                        totalFans: totalFans || 0,
                        totalClicks: totalClicks || 0
                    },
                    recentDrops: recentDrops || [],
                    recentLinks: recentLinks || [],
                    fanAnalytics: fanAnalytics || { fans: [], totalCount: 0 }
                });
            } catch (fallbackError) {
                console.error('❌ Fallback analytics error:', fallbackError);

                res.render("modern-analytics", {
                    title: "Analytics",
                    pageTitle: "Analytics",
                    layout: "layouts/modern-dashboard",
                    currentPage: "analytics",
                    user: req.user,
                    stats: {
                        totalDrops: 0,
                        activeDrops: 0,
                        totalLinks: 0,
                        totalFans: 0,
                        totalClicks: 0
                    },
                    recentDrops: [],
                    recentLinks: [],
                    fanAnalytics: { fans: [], totalCount: 0 },
                    error: "Failed to load analytics data"
                });
            }
        }
    }
);

router.get(
    "/messages",
    asyncHandler(auth.jwt),
    asyncHandler(locals.user),
    (req, res) => {
        const messages = [{
                id: 1,
                subject: "Welcome to JERSEY LOVES BASS",
                preview: "Thanks for joining! Get ready for an amazing experience...",
                status: "sent",
                recipientCount: 1247,
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            },
            {
                id: 2,
                subject: "JULY 4TH PRESALE Announcement",
                preview: "Big news! Our July 4th presale is coming soon...",
                status: "scheduled",
                recipientCount: 1500,
                createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
            }
        ];

        res.render("messages", {
            title: "Messages - BOUNCE2BOUNCE",
            layout: "layouts/dashboard",
            currentPage: "messages",
            stats: {
                totalMessages: 12,
                deliveryRate: 98.5,
                openRate: 76.3,
                totalRecipients: 1247
            },
            messages: messages
        });
    }
);

router.get(
    "/fans",
    asyncHandler(auth.jwt),
    asyncHandler(locals.user),
    (req, res) => {
        const fans = [{
                id: 1,
                name: "Alex Johnson",
                email: "alex@example.com",
                phone: "+1 (555) 123-4567",
                location: { city: "New York", state: "NY" },
                joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                acquisitionChannel: "drop",
                rsvpCount: 3,
                status: "active"
            },
            {
                id: 2,
                name: "Sarah Williams",
                email: "sarah@example.com",
                phone: "+1 (555) 987-6543",
                location: { city: "Los Angeles", state: "CA" },
                joinedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
                acquisitionChannel: "social",
                rsvpCount: 1,
                status: "active"
            },
            {
                id: 3,
                name: "Mike Chen",
                email: "mike@example.com",
                location: { city: "Chicago", state: "IL" },
                joinedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                acquisitionChannel: "referral",
                rsvpCount: 2,
                status: "new"
            }
        ];

        res.render("fans", {
            title: "Fans - BOUNCE2BOUNCE",
            layout: "layouts/dashboard",
            currentPage: "fans",
            stats: {
                totalFans: 1247,
                newFansThisWeek: 23,
                engagementRate: 76.3,
                avgResponseTime: "2.3h"
            },
            fans: fans,
            pagination: {
                start: 1,
                end: 3,
                total: 1247,
                hasPrev: false,
                hasNext: true,
                nextPage: 2
            }
        });
    }
);

router.get(
    "/settings",
    asyncHandler(auth.jwt),
    asyncHandler(locals.user),
    (req, res) => {
        res.render("settings", {
            title: "Settings - BOUNCE2BOUNCE",
            layout: "layouts/dashboard",
            currentPage: "settings"
        });
    }
);

module.exports = router;