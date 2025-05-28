const knex = require("./server/knex");

async function updateUserData() {
    try {
        console.log("🔄 Updating user data with test information...");

        // Get the first user (assuming there's at least one user)
        const users = await knex("users").select("*").limit(1);

        if (users.length === 0) {
            console.log("❌ No users found in database");
            return;
        }

        const user = users[0];
        console.log("👤 Found user:", user.email);

        // Update user with test data
        const updateData = {
            first_name: "BOUNCE2BOUNCE",
            last_name: "Admin",
            username: "bounce2bounce",
            phone: "(640) 500-4727",
            company: "BOUNCE2BOUNCE LLC",
            profile_picture: null // Will use initials
        };

        await knex("users")
            .where("id", user.id)
            .update(updateData);

        console.log("✅ User data updated successfully:");
        console.log("   - Name: BOUNCE2BOUNCE Admin");
        console.log("   - Username: bounce2bounce");
        console.log("   - Phone: (640) 500-4727");
        console.log("   - Company: BOUNCE2BOUNCE LLC");

        // Verify the update
        const updatedUser = await knex("users").where("id", user.id).first();
        console.log("📋 Updated user data:", {
            email: updatedUser.email,
            first_name: updatedUser.first_name,
            last_name: updatedUser.last_name,
            username: updatedUser.username,
            phone: updatedUser.phone,
            company: updatedUser.company
        });

    } catch (error) {
        console.error("❌ Error updating user data:", error);
    } finally {
        await knex.destroy();
    }
}

updateUserData();