// Test script to simulate form submission and verify API endpoints
const fetch = require('node-fetch');

async function testFormSubmission() {
    console.log('🧪 TESTING FORM SUBMISSION API');
    console.log('='.repeat(50));
    
    const baseUrl = 'http://localhost:3000';
    const dropId = 22;
    
    try {
        // 1. Test GET endpoint to retrieve current drop data
        console.log('\n1️⃣ TESTING GET ENDPOINT');
        console.log('-'.repeat(30));
        
        const getResponse = await fetch(`${baseUrl}/api/drops/${dropId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // Note: In real scenario, we'd need authentication headers
            }
        });
        
        console.log(`GET /api/drops/${dropId} - Status: ${getResponse.status}`);
        
        if (getResponse.ok) {
            const dropData = await getResponse.json();
            console.log('✅ Current drop data retrieved:');
            console.log(`   Background Type: ${dropData.data?.background_type || 'undefined'}`);
            console.log(`   Card Background Type: ${dropData.data?.card_background_type || 'undefined'}`);
            console.log(`   Button Text Color: ${dropData.data?.button_text_color || 'undefined'}`);
        } else {
            console.log('❌ Failed to retrieve drop data');
            const errorText = await getResponse.text();
            console.log(`   Error: ${errorText}`);
        }
        
        // 2. Test PUT endpoint to update styling
        console.log('\n2️⃣ TESTING PUT ENDPOINT');
        console.log('-'.repeat(30));
        
        const updateData = {
            background_type: 'gradient',
            card_background_type: 'translucent_dark',
            background_color: '#DC2626',
            button_color: '#EF4444',
            button_text_color: '#FFFFFF',
            title_color: '#FFFFFF',
            description_color: '#F3F4F6'
        };
        
        console.log('🔄 Attempting to update drop styling...');
        console.log('   Data to send:', JSON.stringify(updateData, null, 2));
        
        const putResponse = await fetch(`${baseUrl}/api/drops/${dropId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                // Note: In real scenario, we'd need authentication headers
            },
            body: JSON.stringify(updateData)
        });
        
        console.log(`PUT /api/drops/${dropId} - Status: ${putResponse.status}`);
        
        if (putResponse.ok) {
            const result = await putResponse.json();
            console.log('✅ Drop updated successfully');
            console.log('   Updated data:', JSON.stringify(result.data, null, 2));
        } else {
            console.log('❌ Failed to update drop');
            const errorText = await putResponse.text();
            console.log(`   Error: ${errorText}`);
        }
        
        // 3. Test live page accessibility
        console.log('\n3️⃣ TESTING LIVE PAGE');
        console.log('-'.repeat(30));
        
        const livePageResponse = await fetch(`${baseUrl}/drop/laylo-test-drop`);
        console.log(`GET /drop/laylo-test-drop - Status: ${livePageResponse.status}`);
        
        if (livePageResponse.ok) {
            console.log('✅ Live page accessible');
            const htmlContent = await livePageResponse.text();
            
            // Check if styling data is present in the HTML
            const hasBackgroundType = htmlContent.includes('background_type') || htmlContent.includes('solid') || htmlContent.includes('gradient');
            const hasCardType = htmlContent.includes('card_background_type') || htmlContent.includes('solid_white') || htmlContent.includes('translucent_dark');
            const hasButtonTextColor = htmlContent.includes('button_text_color') || htmlContent.includes('#FFFFFF');
            
            console.log(`   Background type in HTML: ${hasBackgroundType ? '✅' : '❌'}`);
            console.log(`   Card type in HTML: ${hasCardType ? '✅' : '❌'}`);
            console.log(`   Button text color in HTML: ${hasButtonTextColor ? '✅' : '❌'}`);
        } else {
            console.log('❌ Live page not accessible');
        }
        
        console.log('\n🎯 SUMMARY');
        console.log('-'.repeat(30));
        console.log('If all tests pass, the issue is likely in:');
        console.log('1. Frontend form submission JavaScript');
        console.log('2. Authentication/authorization');
        console.log('3. Template rendering logic');
        console.log('4. CSS styling application');
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testFormSubmission();
