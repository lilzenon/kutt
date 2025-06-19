const knex = require("./server/knex");
const bcrypt = require("bcryptjs");

async function resetPassword() {
    console.log("🔧 Resetting admin password...");
    
    try {
        // Set a known password for the admin user
        const hashedPassword = await bcrypt.hash("admin123", 12);
        
        const updated = await knex("users")
            .where("email", "info@bounce2bounce.com")
            .update({
                password: hashedPassword
            });
        
        if (updated) {
            console.log("✅ Password updated successfully!");
            console.log("📧 Email: info@bounce2bounce.com");
            console.log("🔑 Password: admin123");
            console.log("👑 Role: ADMIN");
        } else {
            console.log("❌ User not found");
        }
        
    } catch (error) {
        console.error("❌ Error resetting password:", error);
    } finally {
        await knex.destroy();
    }
}

resetPassword();
