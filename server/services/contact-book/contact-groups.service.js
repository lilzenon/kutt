const knex = require("../../knex");
const cache = require("../analytics/cache.service");

class ContactGroupsService {
    constructor() {
        this.groupCacheTTL = 300; // 5 minutes cache for group data
    }

    /**
     * Get all contact groups for a user
     */
    async getUserGroups(userId) {
        const cacheKey = `contact:groups:${userId}`;

        return await cache.getOrCompute(cacheKey, async () => {
            console.log(`📁 Loading contact groups for user ${userId}`);

            const groups = await knex("contact_groups")
                .select([
                    "id",
                    "name",
                    "description",
                    "color",
                    "contact_count",
                    "created_at",
                    "updated_at"
                ])
                .where("user_id", userId)
                .orderBy("name", "asc");

            return groups;
        }, this.groupCacheTTL);
    }

    /**
     * Create a new contact group
     */
    async createGroup(userId, groupData) {
        const { name, description, color = '#3b82f6' } = groupData;

        // Validate input
        if (!name || name.trim().length === 0) {
            throw new Error("Group name is required");
        }

        // Check for duplicate names
        const existingGroup = await knex("contact_groups")
            .where("user_id", userId)
            .where("name", name.trim())
            .first();

        if (existingGroup) {
            throw new Error("A group with this name already exists");
        }

        // Create the group
        const [group] = await knex("contact_groups")
            .insert({
                user_id: userId,
                name: name.trim(),
                description: description ? description.trim() : null,
                color: color,
                contact_count: 0
            })
            .returning("*");

        // Clear cache
        await this.clearGroupCache(userId);

        console.log(`📁 Created contact group "${name}" for user ${userId}`);
        return group;
    }

    /**
     * Update a contact group
     */
    async updateGroup(userId, groupId, updateData) {
        const { name, description, color } = updateData;

        // Verify group ownership
        const group = await knex("contact_groups")
            .where("id", groupId)
            .where("user_id", userId)
            .first();

        if (!group) {
            throw new Error("Group not found");
        }

        // Check for duplicate names if name is being changed
        if (name && name.trim() !== group.name) {
            const existingGroup = await knex("contact_groups")
                .where("user_id", userId)
                .where("name", name.trim())
                .where("id", "!=", groupId)
                .first();

            if (existingGroup) {
                throw new Error("A group with this name already exists");
            }
        }

        // Prepare update data
        const updates = {};
        if (name !== undefined) updates.name = name.trim();
        if (description !== undefined) updates.description = description ? description.trim() : null;
        if (color !== undefined) updates.color = color;
        updates.updated_at = new Date();

        // Update the group
        const [updatedGroup] = await knex("contact_groups")
            .where("id", groupId)
            .update(updates)
            .returning("*");

        // Clear cache
        await this.clearGroupCache(userId);

        console.log(`📁 Updated contact group ${groupId} for user ${userId}`);
        return updatedGroup;
    }

    /**
     * Delete a contact group
     */
    async deleteGroup(userId, groupId) {
        // Verify group ownership
        const group = await knex("contact_groups")
            .where("id", groupId)
            .where("user_id", userId)
            .first();

        if (!group) {
            throw new Error("Group not found");
        }

        // Delete group memberships first (cascade should handle this, but being explicit)
        await knex("contact_group_memberships")
            .where("group_id", groupId)
            .del();

        // Delete the group
        await knex("contact_groups")
            .where("id", groupId)
            .del();

        // Clear cache
        await this.clearGroupCache(userId);

        console.log(`📁 Deleted contact group ${groupId} for user ${userId}`);
        return { success: true };
    }

    /**
     * Add contacts to a group
     */
    async addContactsToGroup(userId, groupId, contactIds) {
        // Verify group ownership
        const group = await knex("contact_groups")
            .where("id", groupId)
            .where("user_id", userId)
            .first();

        if (!group) {
            throw new Error("Group not found");
        }

        // Verify contacts exist and belong to user's network
        const validContacts = await knex("users as u")
            .select("u.id")
            .join("drop_signups as ds", "u.id", "ds.user_id")
            .join("drops as d", "ds.drop_id", "d.id")
            .where("d.user_id", userId)
            .whereIn("u.id", contactIds)
            .groupBy("u.id");

        const validContactIds = validContacts.map(c => c.id);

        if (validContactIds.length === 0) {
            throw new Error("No valid contacts found");
        }

        // Get existing memberships to avoid duplicates
        const existingMemberships = await knex("contact_group_memberships")
            .select("contact_user_id")
            .where("group_id", groupId)
            .whereIn("contact_user_id", validContactIds);

        const existingContactIds = existingMemberships.map(m => m.contact_user_id);
        const newContactIds = validContactIds.filter(id => !existingContactIds.includes(id));

        if (newContactIds.length === 0) {
            return { added: 0, skipped: existingContactIds.length };
        }

        // Add new memberships
        const memberships = newContactIds.map(contactId => ({
            group_id: groupId,
            contact_user_id: contactId,
            added_by_user_id: userId
        }));

        await knex("contact_group_memberships").insert(memberships);

        // Update contact count
        await knex("contact_groups")
            .where("id", groupId)
            .increment("contact_count", newContactIds.length);

        // Clear cache
        await this.clearGroupCache(userId);

        console.log(`📁 Added ${newContactIds.length} contacts to group ${groupId} for user ${userId}`);
        return { 
            added: newContactIds.length, 
            skipped: existingContactIds.length,
            total: validContactIds.length
        };
    }

    /**
     * Remove contacts from a group
     */
    async removeContactsFromGroup(userId, groupId, contactIds) {
        // Verify group ownership
        const group = await knex("contact_groups")
            .where("id", groupId)
            .where("user_id", userId)
            .first();

        if (!group) {
            throw new Error("Group not found");
        }

        // Remove memberships
        const removedCount = await knex("contact_group_memberships")
            .where("group_id", groupId)
            .whereIn("contact_user_id", contactIds)
            .del();

        // Update contact count
        if (removedCount > 0) {
            await knex("contact_groups")
                .where("id", groupId)
                .decrement("contact_count", removedCount);
        }

        // Clear cache
        await this.clearGroupCache(userId);

        console.log(`📁 Removed ${removedCount} contacts from group ${groupId} for user ${userId}`);
        return { removed: removedCount };
    }

    /**
     * Get contacts in a specific group
     */
    async getGroupContacts(userId, groupId, options = {}) {
        const { limit = 50, offset = 0 } = options;

        // Verify group ownership
        const group = await knex("contact_groups")
            .where("id", groupId)
            .where("user_id", userId)
            .first();

        if (!group) {
            throw new Error("Group not found");
        }

        const cacheKey = `contact:group:${groupId}:contacts:${limit}:${offset}`;

        return await cache.getOrCompute(cacheKey, async () => {
            const contacts = await knex("users as u")
                .select([
                    "u.id",
                    "u.email",
                    "u.first_name",
                    "u.last_name",
                    "u.phone",
                    "u.company",
                    "u.created_at as join_date",
                    "cgm.created_at as added_to_group_at"
                ])
                .join("contact_group_memberships as cgm", "u.id", "cgm.contact_user_id")
                .where("cgm.group_id", groupId)
                .orderBy("cgm.created_at", "desc")
                .limit(limit)
                .offset(offset);

            const totalCount = await knex("contact_group_memberships")
                .where("group_id", groupId)
                .count("id as total")
                .first();

            return {
                group,
                contacts,
                total: parseInt(totalCount.total) || 0,
                limit,
                offset,
                hasMore: (offset + limit) < parseInt(totalCount.total)
            };
        }, this.groupCacheTTL);
    }

    /**
     * Get group statistics
     */
    async getGroupStats(userId) {
        const cacheKey = `contact:groups:stats:${userId}`;

        return await cache.getOrCompute(cacheKey, async () => {
            const stats = await knex("contact_groups")
                .select([
                    knex.raw("COUNT(*) as total_groups"),
                    knex.raw("SUM(contact_count) as total_contacts_in_groups"),
                    knex.raw("AVG(contact_count) as avg_contacts_per_group"),
                    knex.raw("MAX(contact_count) as largest_group_size")
                ])
                .where("user_id", userId)
                .first();

            return {
                totalGroups: parseInt(stats.total_groups) || 0,
                totalContactsInGroups: parseInt(stats.total_contacts_in_groups) || 0,
                avgContactsPerGroup: parseFloat(stats.avg_contacts_per_group) || 0,
                largestGroupSize: parseInt(stats.largest_group_size) || 0
            };
        }, this.groupCacheTTL);
    }

    /**
     * Clear group cache for a user
     */
    async clearGroupCache(userId) {
        try {
            const patterns = [
                `contact:groups:${userId}`,
                `contact:groups:stats:${userId}`,
                `contact:group:*:contacts:*`
            ];

            for (const pattern of patterns) {
                await cache.batchInvalidate([pattern]);
            }

            console.log(`📁 Cleared group cache for user ${userId}`);
        } catch (error) {
            console.error(`❌ Error clearing group cache for user ${userId}:`, error);
        }
    }
}

module.exports = new ContactGroupsService();
