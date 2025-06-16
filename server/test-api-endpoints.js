/**
 * API Endpoints Test Script
 * Tests the contact book API endpoints to verify they're working correctly
 */

const fetch = require('node-fetch');

// Configuration
const BASE_URL = 'https://bounce2bounce.onrender.com';
const TEST_USER_EMAIL = 'test@example.com';
const TEST_USER_PASSWORD = 'testpassword';

async function testContactBookAPI() {
    console.log('🧪 Starting Contact Book API Tests...\n');

    try {
        // Test 1: Login to get authentication
        console.log('📋 Test 1: User Authentication');
        const loginResponse = await fetch(`${BASE_URL}/api/auth/signin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: TEST_USER_EMAIL,
                password: TEST_USER_PASSWORD
            })
        });

        console.log('Login response status:', loginResponse.status);
        
        if (!loginResponse.ok) {
            console.log('❌ Authentication failed - using anonymous request');
            console.log('Response:', await loginResponse.text());
        }

        // Extract cookies for subsequent requests
        const cookies = loginResponse.headers.get('set-cookie') || '';
        console.log('Cookies received:', cookies ? 'Yes' : 'No');

        // Test 2: Get Contact Groups
        console.log('\n📋 Test 2: Get Contact Groups');
        const groupsResponse = await fetch(`${BASE_URL}/api/contact-book/groups`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies
            }
        });

        console.log('Groups response status:', groupsResponse.status);
        console.log('Groups response headers:', Object.fromEntries(groupsResponse.headers.entries()));

        if (groupsResponse.ok) {
            const groupsResult = await groupsResponse.json();
            console.log('✅ Groups API working:', groupsResult);
        } else {
            const errorText = await groupsResponse.text();
            console.log('❌ Groups API error:', errorText);
        }

        // Test 3: Create a Test Group
        console.log('\n📋 Test 3: Create Test Group');
        const testGroupData = {
            name: 'API Test Group ' + Date.now(),
            description: 'A test group created by the API test script',
            color: '#ff6b6b'
        };

        const createGroupResponse = await fetch(`${BASE_URL}/api/contact-book/groups`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies
            },
            body: JSON.stringify(testGroupData)
        });

        console.log('Create group response status:', createGroupResponse.status);

        if (createGroupResponse.ok) {
            const createResult = await createGroupResponse.json();
            console.log('✅ Group creation working:', createResult);
        } else {
            const errorText = await createGroupResponse.text();
            console.log('❌ Group creation error:', errorText);
        }

        // Test 4: Get Contacts
        console.log('\n📋 Test 4: Get Contacts');
        const contactsResponse = await fetch(`${BASE_URL}/api/contact-book/contacts`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies
            }
        });

        console.log('Contacts response status:', contactsResponse.status);

        if (contactsResponse.ok) {
            const contactsResult = await contactsResponse.json();
            console.log('✅ Contacts API working. Total contacts:', contactsResult.data?.total || 0);
        } else {
            const errorText = await contactsResponse.text();
            console.log('❌ Contacts API error:', errorText);
        }

        // Test 5: Test Contact Book Page
        console.log('\n📋 Test 5: Contact Book Page');
        const pageResponse = await fetch(`${BASE_URL}/contact-book`, {
            method: 'GET',
            headers: {
                'Cookie': cookies
            }
        });

        console.log('Contact book page status:', pageResponse.status);

        if (pageResponse.ok) {
            console.log('✅ Contact book page accessible');
        } else {
            console.log('❌ Contact book page error:', pageResponse.statusText);
        }

        console.log('\n🎉 API endpoint tests completed!');

    } catch (error) {
        console.error('\n❌ Test failed with error:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Test without authentication (for debugging)
async function testPublicEndpoints() {
    console.log('\n🔓 Testing Public Endpoints...');

    try {
        // Test health check or public endpoint
        const healthResponse = await fetch(`${BASE_URL}/health`, {
            method: 'GET'
        });

        console.log('Health check status:', healthResponse.status);

        if (healthResponse.ok) {
            console.log('✅ Server is responding');
        } else {
            console.log('❌ Server health check failed');
        }

        // Test if contact book page loads (might redirect to login)
        const contactBookResponse = await fetch(`${BASE_URL}/contact-book`, {
            method: 'GET',
            redirect: 'manual' // Don't follow redirects
        });

        console.log('Contact book page status:', contactBookResponse.status);
        console.log('Contact book page headers:', Object.fromEntries(contactBookResponse.headers.entries()));

        if (contactBookResponse.status === 302) {
            console.log('✅ Contact book page redirects to login (expected)');
        } else if (contactBookResponse.ok) {
            console.log('✅ Contact book page accessible');
        } else {
            console.log('❌ Contact book page error');
        }

    } catch (error) {
        console.error('❌ Public endpoint test failed:', error);
    }
}

// Run tests
async function runAllTests() {
    await testPublicEndpoints();
    await testContactBookAPI();
}

if (require.main === module) {
    runAllTests()
        .then(() => {
            console.log('\n✅ All API tests completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ API tests failed:', error);
            process.exit(1);
        });
}

module.exports = { testContactBookAPI, testPublicEndpoints };
