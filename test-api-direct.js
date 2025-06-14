// Direct API test to verify the endpoint is working
const db = require('./server/knex');

async function testApiDirect() {
    console.log('🧪 DIRECT API TEST');
    console.log('='.repeat(40));
    
    try {
        const dropId = 22;
        
        // Test 1: Get current state
        console.log('1️⃣ Current drop state:');
        const currentDrop = await db('drops').where('id', dropId).first();
        console.log(`   Background Color: ${currentDrop.background_color}`);
        console.log(`   Background Type: ${currentDrop.background_type}`);
        console.log(`   Card Background Type: ${currentDrop.card_background_type}`);
        
        // Test 2: Direct database update (simulating successful API call)
        console.log('\n2️⃣ Testing direct database update...');
        
        const testUpdate = {
            background_color: '#00FF00', // Bright green
            background_type: 'solid',
            card_background_type: 'solid_white',
            button_color: '#FF0000',
            button_text_color: '#FFFFFF',
            title_color: '#000000',
            description_color: '#333333'
        };
        
        console.log('📤 Updating with:', testUpdate);
        
        await db('drops').where('id', dropId).update(testUpdate);
        
        // Verify the update
        const updatedDrop = await db('drops').where('id', dropId).first();
        console.log('\n✅ Update verification:');
        console.log(`   Background Color: ${updatedDrop.background_color}`);
        console.log(`   Background Type: ${updatedDrop.background_type}`);
        console.log(`   Card Background Type: ${updatedDrop.card_background_type}`);
        
        // Check if the update was successful
        const success = updatedDrop.background_color === testUpdate.background_color;
        console.log(`\n${success ? '✅' : '❌'} Database update ${success ? 'successful' : 'failed'}`);
        
        if (success) {
            console.log('\n🌐 The database update works correctly!');
            console.log('🔍 This means the issue is in the frontend form submission.');
            console.log('\n📋 Debugging checklist:');
            console.log('   1. Check if form fields are properly named');
            console.log('   2. Verify form submission JavaScript is running');
            console.log('   3. Check for authentication issues');
            console.log('   4. Look for JavaScript errors in browser console');
            console.log('   5. Verify API request is being sent');
        }
        
        console.log('\n🌐 Test URLs:');
        console.log(`   Edit Page: http://localhost:3000/drops/${dropId}/edit`);
        console.log(`   Live Page: http://localhost:3000/drop/${updatedDrop.slug}`);
        console.log('\n🔧 Use the Debug Test button on the edit page to test API connectivity');
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    } finally {
        await db.destroy();
    }
}

testApiDirect();
