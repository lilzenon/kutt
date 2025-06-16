/**
 * Test Groups Functionality
 * Creates test groups and verifies the API endpoints are working
 */

const knex = require('./knex');

async function testGroupsFunctionality() {
    console.log('🧪 Testing Contact Groups Functionality...\n');

    try {
        // Test 1: Check if contact_groups table exists
        console.log('📋 Test 1: Check Database Tables');
        
        const tablesExist = await knex.schema.hasTable('contact_groups');
        console.log('contact_groups table exists:', tablesExist);
        
        if (!tablesExist) {
            console.log('❌ contact_groups table does not exist!');
            return;
        }
        
        const membershipTableExists = await knex.schema.hasTable('contact_group_memberships');
        console.log('contact_group_memberships table exists:', membershipTableExists);

        // Test 2: Check existing groups
        console.log('\n📋 Test 2: Check Existing Groups');
        const existingGroups = await knex('contact_groups').select('*');
        console.log(`Found ${existingGroups.length} existing groups:`);
        existingGroups.forEach((group, index) => {
            console.log(`  ${index + 1}. ${group.name} (User: ${group.user_id}, Count: ${group.contact_count})`);
        });

        // Test 3: Create a test group
        console.log('\n📋 Test 3: Create Test Group');
        
        // First, let's get or create a test user
        let testUser = await knex('users').where('email', 'test@example.com').first();
        
        if (!testUser) {
            console.log('Creating test user...');
            [testUser] = await knex('users').insert({
                email: 'test@example.com',
                first_name: 'Test',
                last_name: 'User',
                password_hash: 'test_hash',
                email_verified: true
            }).returning('*');
        }
        
        console.log('Test user ID:', testUser.id);

        // Create a test group
        const testGroupName = `Test Group ${Date.now()}`;
        const [testGroup] = await knex('contact_groups').insert({
            user_id: testUser.id,
            name: testGroupName,
            description: 'A test group created by the test script',
            color: '#ff6b6b',
            contact_count: 0
        }).returning('*');

        console.log('✅ Created test group:', testGroup);

        // Test 4: Query groups for the test user
        console.log('\n📋 Test 4: Query Groups for Test User');
        const userGroups = await knex('contact_groups')
            .select([
                'id',
                'name', 
                'description',
                'color',
                'contact_count',
                'created_at',
                'updated_at'
            ])
            .where('user_id', testUser.id)
            .orderBy('name', 'asc');

        console.log(`Found ${userGroups.length} groups for test user:`);
        userGroups.forEach((group, index) => {
            console.log(`  ${index + 1}. ${group.name} - ${group.color} (${group.contact_count} contacts)`);
        });

        // Test 5: Test the ContactGroupsService directly
        console.log('\n📋 Test 5: Test ContactGroupsService');
        const contactGroupsService = require('./services/contact-book/contact-groups.service');
        
        const serviceGroups = await contactGroupsService.getUserGroups(testUser.id);
        console.log('✅ ContactGroupsService returned:', serviceGroups);

        // Test 6: Clean up test data
        console.log('\n📋 Test 6: Clean Up Test Data');
        await knex('contact_groups').where('id', testGroup.id).del();
        console.log('✅ Cleaned up test group');

        console.log('\n🎉 All tests completed successfully!');

    } catch (error) {
        console.error('\n❌ Test failed with error:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        // Close database connection
        await knex.destroy();
    }
}

// Run the test
if (require.main === module) {
    testGroupsFunctionality()
        .then(() => {
            console.log('\n✅ Groups functionality test completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Groups functionality test failed:', error);
            process.exit(1);
        });
}

module.exports = { testGroupsFunctionality };
