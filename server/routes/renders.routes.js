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
            // Get real data from database
            const query = require("../queries");

            // Get user's drops
            const userDrops = await query.drop.findByUserWithStats(req.user.id, { limit: 5 });

            // Get user's links
            const userLinks = await query.link.findByUser(req.user.id, { limit: 5 });

            // Calculate stats
            const totalDrops = await query.drop.countByUser(req.user.id);
            const activeDrops = await query.drop.countActiveByUser(req.user.id);
            const totalLinks = await query.link.countByUser(req.user.id);
            const totalFans = await query.drop.getTotalFansByUser(req.user.id);

            res.render("modern-dashboard", {
                title: "Dashboard",
                pageTitle: "Dashboard",
                layout: "layouts/modern-dashboard",
                currentPage: "dashboard",
                user: req.user,
                stats: {
                    totalDrops: totalDrops || 0,
                    activeDrops: activeDrops || 0,
                    totalLinks: totalLinks || 0,
                    totalFans: totalFans || 0
                },
                recentDrops: userDrops || [],
                recentLinks: userLinks || []
            });
        } catch (error) {
            console.error('Dashboard error:', error);

            // Fallback with sample data if database queries fail
            res.render("modern-dashboard", {
                title: "Dashboard",
                pageTitle: "Dashboard",
                layout: "layouts/modern-dashboard",
                currentPage: "dashboard",
                user: req.user,
                stats: {
                    totalDrops: 0,
                    activeDrops: 0,
                    totalLinks: 0,
                    totalFans: 0
                },
                recentDrops: [],
                recentLinks: []
            });
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
router.get(
    "/profile",
    asyncHandler(auth.jwt),
    asyncHandler(locals.user),
    (req, res) => {
        res.render("profile", {
            title: "Profile - BOUNCE2BOUNCE",
            layout: "layouts/dashboard",
            currentPage: "profile",
            stats: {
                totalDrops: 2,
                totalFans: 1247,
                totalLinks: 156,
            }
        });
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