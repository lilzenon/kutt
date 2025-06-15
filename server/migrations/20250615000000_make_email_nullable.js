/**
 * 🔧 MAKE EMAIL NULLABLE MIGRATION
 * 
 * This migration makes the email column nullable in drop_signups table
 * to support phone-only signups.
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    console.log('🔧 Making email column nullable in drop_signups table...');
    
    try {
        // Check if the table exists
        const hasTable = await knex.schema.hasTable("drop_signups");
        if (!hasTable) {
            console.log('⚠️ drop_signups table does not exist, skipping migration');
            return;
        }

        // Check if email column exists and is not nullable
        const columnInfo = await knex('drop_signups').columnInfo();
        if (!columnInfo.email) {
            console.log('⚠️ email column does not exist, skipping migration');
            return;
        }

        // Alter the email column to be nullable
        await knex.schema.alterTable("drop_signups", table => {
            table.string("email", 255).nullable().alter();
        });
        
        console.log('✅ Email column is now nullable');
        
        // Also update the unique constraint to handle nullable emails
        // Drop the old constraint and create a new one that handles nulls properly
        try {
            await knex.raw('ALTER TABLE drop_signups DROP CONSTRAINT IF EXISTS drop_signups_drop_id_email_unique');
            console.log('✅ Dropped old unique constraint');
            
            // Create a partial unique index that excludes null emails
            await knex.raw(`
                CREATE UNIQUE INDEX IF NOT EXISTS drop_signups_drop_id_email_unique 
                ON drop_signups (drop_id, email) 
                WHERE email IS NOT NULL
            `);
            console.log('✅ Created new partial unique index for non-null emails');
        } catch (constraintError) {
            console.warn('⚠️ Could not update unique constraint:', constraintError.message);
            // Continue - this is not critical for the main functionality
        }
        
        console.log('🎉 Email nullable migration complete');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    console.log('🔧 Reverting email column to not nullable...');
    
    try {
        // Check if the table exists
        const hasTable = await knex.schema.hasTable("drop_signups");
        if (!hasTable) {
            console.log('⚠️ drop_signups table does not exist, skipping rollback');
            return;
        }

        // First, update any null emails to a placeholder
        await knex('drop_signups')
            .whereNull('email')
            .update({ email: 'placeholder@example.com' });
        
        // Alter the email column back to not nullable
        await knex.schema.alterTable("drop_signups", table => {
            table.string("email", 255).notNullable().alter();
        });
        
        // Restore the original unique constraint
        try {
            await knex.raw('DROP INDEX IF EXISTS drop_signups_drop_id_email_unique');
            await knex.schema.alterTable("drop_signups", table => {
                table.unique(["drop_id", "email"]);
            });
        } catch (constraintError) {
            console.warn('⚠️ Could not restore original unique constraint:', constraintError.message);
        }
        
        console.log('✅ Email column reverted to not nullable');
        
    } catch (error) {
        console.error('❌ Rollback failed:', error);
        throw error;
    }
};
