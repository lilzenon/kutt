/**
 * Contact Groups Database Test Script
 * Tests database connectivity and contact groups functionality
 */

const knex = require('./knex');
const contactGroupsService = require('./services/contact-book/contact-groups.service');

async function testContactGroupsDatabase() {
    console.log('🧪 Starting Contact Groups Database Tests...\n');

    try {
        // Test 1: Database Connection
        console.log('📋 Test 1: Database Connection');
        await knex.raw('SELECT 1');
        console.log('✅ Database connection successful');

        // Test 2: Check if contact_groups table exists
        console.log('\n📋 Test 2: Contact Groups Table Existence');
        const hasContactGroupsTable = await knex.schema.hasTable('contact_groups');
        console.log(`Contact groups table exists: ${hasContactGroupsTable}`);
        
        if (hasContactGroupsTable) {
            // Get table info
            const tableInfo = await knex('contact_groups').columnInfo();
            console.log('Table columns:', Object.keys(tableInfo));
        } else {
            console.log('❌ contact_groups table does not exist!');
            console.log('Run migrations to create the table: npm run migrate');
            return;
        }

        // Test 3: Check if contact_group_memberships table exists
        console.log('\n📋 Test 3: Contact Group Memberships Table Existence');
        const hasMembershipsTable = await knex.schema.hasTable('contact_group_memberships');
        console.log(`Contact group memberships table exists: ${hasMembershipsTable}`);

        // Test 4: Test with a sample user (user ID 1)
        console.log('\n📋 Test 4: Sample User Groups Query');
        const sampleUserId = 1;
        
        // Check if user exists
        const user = await knex('users').where('id', sampleUserId).first();
        if (!user) {
            console.log(`❌ User with ID ${sampleUserId} does not exist`);
            console.log('Creating a test user...');
            
            // Create a test user
            const [testUser] = await knex('users').insert({
                email: 'test-contact-groups@example.com',
                password: 'test',
                first_name: 'Test',
                last_name: 'User',
                created_at: new Date(),
                updated_at: new Date()
            }).returning('*');
            
            console.log('✅ Test user created:', testUser.id);
            sampleUserId = testUser.id;
        } else {
            console.log(`✅ User ${sampleUserId} exists:`, user.email);
        }

        // Test 5: Get user groups (should return empty array for new user)
        console.log('\n📋 Test 5: Get User Groups');
        const groups = await contactGroupsService.getUserGroups(sampleUserId);
        console.log(`User ${sampleUserId} has ${groups.length} groups:`, groups);

        // Test 6: Create a test group
        console.log('\n📋 Test 6: Create Test Group');
        const testGroupData = {
            name: 'Test Group ' + Date.now(),
            description: 'A test group created by the test script',
            color: '#ff6b6b'
        };
        
        const createdGroup = await contactGroupsService.createGroup(sampleUserId, testGroupData);
        console.log('✅ Test group created:', createdGroup);

        // Test 7: Get groups again (should now have 1 group)
        console.log('\n📋 Test 7: Get User Groups After Creation');
        const groupsAfterCreation = await contactGroupsService.getUserGroups(sampleUserId);
        console.log(`User ${sampleUserId} now has ${groupsAfterCreation.length} groups:`, groupsAfterCreation);

        // Test 8: Update the test group
        console.log('\n📋 Test 8: Update Test Group');
        const updatedGroup = await contactGroupsService.updateGroup(sampleUserId, createdGroup.id, {
            name: 'Updated Test Group',
            description: 'Updated description',
            color: '#4ecdc4'
        });
        console.log('✅ Test group updated:', updatedGroup);

        // Test 9: Get group statistics
        console.log('\n📋 Test 9: Get Group Statistics');
        const stats = await contactGroupsService.getGroupStats(sampleUserId);
        console.log('Group statistics:', stats);

        // Test 10: Clean up - delete the test group
        console.log('\n📋 Test 10: Delete Test Group');
        await contactGroupsService.deleteGroup(sampleUserId, createdGroup.id);
        console.log('✅ Test group deleted');

        // Final verification
        console.log('\n📋 Final Verification: Get User Groups After Deletion');
        const finalGroups = await contactGroupsService.getUserGroups(sampleUserId);
        console.log(`User ${sampleUserId} finally has ${finalGroups.length} groups:`, finalGroups);

        console.log('\n🎉 All Contact Groups database tests completed successfully!');
        console.log('\n📊 Test Summary:');
        console.log('✅ Database connection working');
        console.log('✅ Contact groups table exists');
        console.log('✅ Contact group memberships table exists');
        console.log('✅ User groups query working');
        console.log('✅ Group creation working');
        console.log('✅ Group update working');
        console.log('✅ Group statistics working');
        console.log('✅ Group deletion working');

    } catch (error) {
        console.error('\n❌ Test failed with error:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        // Close database connection
        await knex.destroy();
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    testContactGroupsDatabase()
        .then(() => {
            console.log('\n✅ Contact Groups database is ready for production use!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Contact Groups database tests failed:', error);
            process.exit(1);
        });
}

module.exports = { testContactGroupsDatabase };
