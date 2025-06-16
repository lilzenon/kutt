const { Router } = require("express");
const asyncHandler = require("../../utils/asyncHandler");
const auth = require("../../handlers/auth.handler");
const contactBookService = require("../../services/contact-book/contact-book.service");
const contactGroupsService = require("../../services/contact-book/contact-groups.service");

const router = Router();

/**
 * GET /api/contact-book/contacts
 * Get contacts with search and filtering
 */
router.get(
    "/contacts",
    asyncHandler(auth.jwt),
    asyncHandler(async(req, res) => {
        try {
            const {
                limit = 50,
                    offset = 0,
                    search = '',
                    sortBy = 'recent_activity',
                    groupId = null,
                    acquisitionChannel = null,
                    dateStart = null,
                    dateEnd = null,
                    includeStats = true
            } = req.query;

            const options = {
                limit: parseInt(limit),
                offset: parseInt(offset),
                search,
                sortBy,
                groupId: groupId ? parseInt(groupId) : null,
                acquisitionChannel,
                dateRange: (dateStart && dateEnd) ? { start: dateStart, end: dateEnd } : null,
                includeStats: includeStats === 'true'
            };

            const result = await contactBookService.getContacts(req.user.id, options);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('❌ Contact book API error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    })
);

/**
 * GET /api/contact-book/contacts/:contactIdentifier
 * Get detailed contact profile (supports both phone and email)
 */
router.get(
    "/contacts/:contactIdentifier",
    asyncHandler(auth.jwt),
    asyncHandler(async(req, res) => {
        try {
            const contactIdentifier = decodeURIComponent(req.params.contactIdentifier);

            if (!contactIdentifier || contactIdentifier.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: "Contact identifier is required"
                });
            }

            const result = await contactBookService.getContactProfile(req.user.id, contactIdentifier);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('❌ Contact profile API error:', error);
            const statusCode = error.message.includes('not found') ? 404 :
                error.message.includes('Invalid') ? 400 : 500;
            res.status(statusCode).json({
                success: false,
                error: error.message
            });
        }
    })
);

/**
 * GET /api/contact-book/groups
 * Get all contact groups for the user
 */
router.get(
    "/groups",
    asyncHandler(auth.jwt),
    asyncHandler(async(req, res) => {
        try {
            const groups = await contactGroupsService.getUserGroups(req.user.id);

            res.json({
                success: true,
                data: groups
            });
        } catch (error) {
            console.error('❌ Contact groups API error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    })
);

/**
 * POST /api/contact-book/groups
 * Create a new contact group
 */
router.post(
    "/groups",
    asyncHandler(auth.jwt),
    asyncHandler(async(req, res) => {
        try {
            const { name, description, color } = req.body;

            if (!name || name.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: "Group name is required"
                });
            }

            const group = await contactGroupsService.createGroup(req.user.id, {
                name,
                description,
                color
            });

            res.status(201).json({
                success: true,
                data: group
            });
        } catch (error) {
            console.error('❌ Create group API error:', error);
            const statusCode = error.message.includes('already exists') ? 409 : 500;
            res.status(statusCode).json({
                success: false,
                error: error.message
            });
        }
    })
);

/**
 * PUT /api/contact-book/groups/:groupId
 * Update a contact group
 */
router.put(
    "/groups/:groupId",
    asyncHandler(auth.jwt),
    asyncHandler(async(req, res) => {
        try {
            const groupId = parseInt(req.params.groupId);
            const { name, description, color } = req.body;

            if (!groupId) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid group ID"
                });
            }

            const group = await contactGroupsService.updateGroup(req.user.id, groupId, {
                name,
                description,
                color
            });

            res.json({
                success: true,
                data: group
            });
        } catch (error) {
            console.error('❌ Update group API error:', error);
            const statusCode = error.message.includes('not found') ? 404 :
                error.message.includes('already exists') ? 409 : 500;
            res.status(statusCode).json({
                success: false,
                error: error.message
            });
        }
    })
);

/**
 * DELETE /api/contact-book/groups/:groupId
 * Delete a contact group
 */
router.delete(
    "/groups/:groupId",
    asyncHandler(auth.jwt),
    asyncHandler(async(req, res) => {
        try {
            const groupId = parseInt(req.params.groupId);

            if (!groupId) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid group ID"
                });
            }

            await contactGroupsService.deleteGroup(req.user.id, groupId);

            res.json({
                success: true,
                message: "Group deleted successfully"
            });
        } catch (error) {
            console.error('❌ Delete group API error:', error);
            const statusCode = error.message.includes('not found') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                error: error.message
            });
        }
    })
);

/**
 * POST /api/contact-book/groups/:groupId/contacts
 * Add contacts to a group
 */
router.post(
    "/groups/:groupId/contacts",
    asyncHandler(auth.jwt),
    asyncHandler(async(req, res) => {
        try {
            const groupId = parseInt(req.params.groupId);
            const { contactIds } = req.body;

            if (!groupId) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid group ID"
                });
            }

            if (!Array.isArray(contactIds) || contactIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: "Contact IDs array is required"
                });
            }

            const result = await contactGroupsService.addContactsToGroup(req.user.id, groupId, contactIds);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('❌ Add contacts to group API error:', error);
            const statusCode = error.message.includes('not found') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                error: error.message
            });
        }
    })
);

/**
 * DELETE /api/contact-book/groups/:groupId/contacts
 * Remove contacts from a group
 */
router.delete(
    "/groups/:groupId/contacts",
    asyncHandler(auth.jwt),
    asyncHandler(async(req, res) => {
        try {
            const groupId = parseInt(req.params.groupId);
            const { contactIds } = req.body;

            if (!groupId) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid group ID"
                });
            }

            if (!Array.isArray(contactIds) || contactIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: "Contact IDs array is required"
                });
            }

            const result = await contactGroupsService.removeContactsFromGroup(req.user.id, groupId, contactIds);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('❌ Remove contacts from group API error:', error);
            const statusCode = error.message.includes('not found') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                error: error.message
            });
        }
    })
);

/**
 * GET /api/contact-book/groups/:groupId/contacts
 * Get contacts in a specific group
 */
router.get(
    "/groups/:groupId/contacts",
    asyncHandler(auth.jwt),
    asyncHandler(async(req, res) => {
        try {
            const groupId = parseInt(req.params.groupId);
            const { limit = 50, offset = 0 } = req.query;

            if (!groupId) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid group ID"
                });
            }

            const result = await contactGroupsService.getGroupContacts(req.user.id, groupId, {
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('❌ Group contacts API error:', error);
            const statusCode = error.message.includes('not found') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                error: error.message
            });
        }
    })
);

/**
 * GET /api/contact-book/stats
 * Get contact book statistics
 */
router.get(
    "/stats",
    asyncHandler(auth.jwt),
    asyncHandler(async(req, res) => {
        try {
            const groupStats = await contactGroupsService.getGroupStats(req.user.id);

            res.json({
                success: true,
                data: {
                    groups: groupStats
                }
            });
        } catch (error) {
            console.error('❌ Contact book stats API error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    })
);

module.exports = router;