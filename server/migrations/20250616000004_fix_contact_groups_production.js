/**
 * CRITICAL FIX: Contact Groups Production Database Schema
 * Fixes the contact_group_memberships table structure for phone-first contact system
 * This migration addresses the NOT NULL constraint issue on contact_user_id
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
async function up(knex) {
    console.log("🚨 CRITICAL FIX: Updating Contact Groups for Production...");

    try {
        // Check current table structure
        const tableExists = await knex.schema.hasTable('contact_group_memberships');
        
        if (tableExists) {
            console.log("📋 Checking current contact_group_memberships structure...");
            
            // Check if we have the old structure with contact_user_id
            const hasContactUserId = await knex.schema.hasColumn('contact_group_memberships', 'contact_user_id');
            const hasContactPhone = await knex.schema.hasColumn('contact_group_memberships', 'contact_phone');
            const hasContactEmail = await knex.schema.hasColumn('contact_group_memberships', 'contact_email');
            
            console.log(`Current structure: contact_user_id=${hasContactUserId}, contact_phone=${hasContactPhone}, contact_email=${hasContactEmail}`);
            
            if (hasContactUserId && (!hasContactPhone || !hasContactEmail)) {
                console.log("🔧 Migrating from user_id based to phone-first structure...");
                
                // Step 1: Add new columns if they don't exist
                if (!hasContactPhone) {
                    await knex.schema.alterTable('contact_group_memberships', table => {
                        table.string('contact_phone', 20);
                    });
                    console.log("✅ Added contact_phone column");
                }
                
                if (!hasContactEmail) {
                    await knex.schema.alterTable('contact_group_memberships', table => {
                        table.string('contact_email', 255);
                    });
                    console.log("✅ Added contact_email column");
                }
                
                // Step 2: Migrate existing data if any exists
                const existingMemberships = await knex('contact_group_memberships').count('id as count').first();
                const membershipCount = parseInt(existingMemberships.count) || 0;
                
                if (membershipCount > 0) {
                    console.log(`📊 Found ${membershipCount} existing memberships to migrate...`);
                    
                    // Try to migrate existing user-based memberships to phone/email based
                    const memberships = await knex('contact_group_memberships as cgm')
                        .select('cgm.*', 'u.phone', 'u.email')
                        .leftJoin('users as u', 'cgm.contact_user_id', 'u.id')
                        .whereNotNull('cgm.contact_user_id');
                    
                    for (const membership of memberships) {
                        if (membership.phone || membership.email) {
                            await knex('contact_group_memberships')
                                .where('id', membership.id)
                                .update({
                                    contact_phone: membership.phone || null,
                                    contact_email: membership.email || null
                                });
                        }
                    }
                    
                    console.log(`✅ Migrated ${memberships.length} memberships to phone-first format`);
                }
                
                // Step 3: Remove NOT NULL constraint from contact_user_id
                console.log("🔧 Removing NOT NULL constraint from contact_user_id...");
                
                // For PostgreSQL, we need to alter the column to allow NULL
                await knex.raw('ALTER TABLE contact_group_memberships ALTER COLUMN contact_user_id DROP NOT NULL');
                
                console.log("✅ Removed NOT NULL constraint from contact_user_id");
                
                // Step 4: Add new constraints for phone-first approach
                console.log("🔧 Adding phone-first constraints...");
                
                // Add check constraint to ensure at least one contact method is provided
                try {
                    await knex.raw(`
                        ALTER TABLE contact_group_memberships 
                        ADD CONSTRAINT contact_identifier_required 
                        CHECK (contact_phone IS NOT NULL OR contact_email IS NOT NULL)
                    `);
                    console.log("✅ Added contact identifier check constraint");
                } catch (error) {
                    if (!error.message.includes('already exists')) {
                        console.log("⚠️ Could not add check constraint:", error.message);
                    }
                }
                
                // Add unique constraints for phone and email
                try {
                    await knex.raw(`
                        CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS unique_group_phone 
                        ON contact_group_memberships (group_id, contact_phone) 
                        WHERE contact_phone IS NOT NULL
                    `);
                    console.log("✅ Added unique constraint for group_id + contact_phone");
                } catch (error) {
                    console.log("⚠️ Could not add phone unique constraint:", error.message);
                }
                
                try {
                    await knex.raw(`
                        CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS unique_group_email 
                        ON contact_group_memberships (group_id, contact_email) 
                        WHERE contact_email IS NOT NULL
                    `);
                    console.log("✅ Added unique constraint for group_id + contact_email");
                } catch (error) {
                    console.log("⚠️ Could not add email unique constraint:", error.message);
                }
                
                // Step 5: Add indexes for performance
                try {
                    await knex.schema.alterTable('contact_group_memberships', table => {
                        table.index('contact_phone', 'contact_memberships_phone_idx');
                        table.index('contact_email', 'contact_memberships_email_idx');
                    });
                    console.log("✅ Added performance indexes");
                } catch (error) {
                    console.log("⚠️ Could not add indexes:", error.message);
                }
                
            } else if (hasContactPhone && hasContactEmail) {
                console.log("✅ Table already has phone-first structure");
                
                // Just ensure contact_user_id allows NULL
                try {
                    await knex.raw('ALTER TABLE contact_group_memberships ALTER COLUMN contact_user_id DROP NOT NULL');
                    console.log("✅ Ensured contact_user_id allows NULL");
                } catch (error) {
                    console.log("⚠️ contact_user_id constraint:", error.message);
                }
            }
        } else {
            console.log("📋 Creating contact_group_memberships table with phone-first structure...");
            
            await knex.schema.createTable('contact_group_memberships', table => {
                table.increments('id').primary();
                table.integer('group_id').unsigned().notNullable().references('id').inTable('contact_groups').onDelete('CASCADE');
                
                // Phone-first contact identification
                table.string('contact_phone', 20); // Normalized phone number
                table.string('contact_email', 255); // Email address
                
                // Keep contact_user_id for backward compatibility but allow NULL
                table.integer('contact_user_id').unsigned().nullable().references('id').inTable('users').onDelete('CASCADE');
                
                table.integer('added_by_user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
                table.timestamps(true, true);
                
                // Ensure at least one contact method is provided
                table.check('contact_phone IS NOT NULL OR contact_email IS NOT NULL', 'contact_identifier_required');
                
                // Indexes for performance
                table.index('group_id', 'contact_memberships_group_idx');
                table.index('contact_phone', 'contact_memberships_phone_idx');
                table.index('contact_email', 'contact_memberships_email_idx');
                table.index('added_by_user_id', 'contact_memberships_added_by_idx');
            });
            
            console.log("✅ Created contact_group_memberships table with phone-first structure");
        }

        console.log("🎉 Contact Groups production fix completed successfully!");

    } catch (error) {
        console.error("❌ Error in contact groups production fix:", error);
        throw error;
    }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
async function down(knex) {
    console.log("🗄️ Rolling back Contact Groups production fix...");
    
    // This rollback is complex and potentially destructive
    // For safety, we'll just log what would be done
    console.log("⚠️ Rollback would restore contact_user_id NOT NULL constraint");
    console.log("⚠️ Manual intervention may be required for rollback");
    
    console.log("✅ Contact Groups production fix rollback noted");
}

module.exports = {
    up,
    down
};
