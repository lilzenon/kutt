/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    console.log("🚀 Adding user profile fields...");

    const hasFirstName = await knex.schema.hasColumn("users", "first_name");
    const hasLastName = await knex.schema.hasColumn("users", "last_name");
    const hasPhone = await knex.schema.hasColumn("users", "phone");
    const hasProfilePicture = await knex.schema.hasColumn("users", "profile_picture");
    const hasUsername = await knex.schema.hasColumn("users", "username");
    const hasCompany = await knex.schema.hasColumn("users", "company");

    if (!hasFirstName || !hasLastName || !hasPhone || !hasProfilePicture || !hasUsername || !hasCompany) {
        await knex.schema.alterTable("users", table => {
            if (!hasFirstName) {
                table.string("first_name");
                console.log("   ✅ Added first_name column");
            }
            if (!hasLastName) {
                table.string("last_name");
                console.log("   ✅ Added last_name column");
            }
            if (!hasPhone) {
                table.string("phone");
                console.log("   ✅ Added phone column");
            }
            if (!hasProfilePicture) {
                table.string("profile_picture");
                console.log("   ✅ Added profile_picture column");
            }
            if (!hasUsername) {
                table.string("username").unique();
                console.log("   ✅ Added username column");
            }
            if (!hasCompany) {
                table.string("company");
                console.log("   ✅ Added company column");
            }
        });

        console.log("✅ User profile fields migration completed");
    } else {
        console.log("✅ User profile fields already exist");
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    console.log("🔄 Removing user profile fields...");

    await knex.schema.alterTable("users", table => {
        table.dropColumn("first_name");
        table.dropColumn("last_name");
        table.dropColumn("phone");
        table.dropColumn("profile_picture");
        table.dropColumn("username");
        table.dropColumn("company");
    });

    console.log("✅ User profile fields removed");
};