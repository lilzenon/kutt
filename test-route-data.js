// Test what data the route is actually retrieving
const db = require('./server/knex');
const dropQueries = require('./server/queries/drop.queries');

async function testRouteData() {
    console.log('🧪 TESTING ROUTE DATA RETRIEVAL');
    console.log('='.repeat(50));
    
    try {
        const slug = 'laylo-test-drop';
        
        // Test 1: Direct database query (what we expect)
        console.log('1️⃣ Direct database query:');
        const directQuery = await db('drops').where('slug', slug).first();
        console.log('   Background Color:', directQuery.background_color);
        console.log('   Background Type:', directQuery.background_type);
        console.log('   Card Background Type:', directQuery.card_background_type);
        console.log('   Button Color:', directQuery.button_color);
        console.log('   Button Text Color:', directQuery.button_text_color);
        
        // Test 2: Using the same query as the route (findBySlug)
        console.log('\n2️⃣ Using findBySlug function (same as route):');
        const routeQuery = await dropQueries.findBySlug(slug);
        console.log('   Background Color:', routeQuery.background_color);
        console.log('   Background Type:', routeQuery.background_type);
        console.log('   Card Background Type:', routeQuery.card_background_type);
        console.log('   Button Color:', routeQuery.button_color);
        console.log('   Button Text Color:', routeQuery.button_text_color);
        
        // Test 3: Compare the two results
        console.log('\n3️⃣ Comparison:');
        const fieldsToCheck = ['background_color', 'background_type', 'card_background_type', 'button_color', 'button_text_color'];
        
        let allMatch = true;
        fieldsToCheck.forEach(field => {
            const directValue = directQuery[field];
            const routeValue = routeQuery[field];
            const match = directValue === routeValue;
            if (!match) allMatch = false;
            console.log(`   ${match ? '✅' : '❌'} ${field}: direct="${directValue}" route="${routeValue}"`);
        });
        
        if (allMatch) {
            console.log('\n✅ All fields match! The route is getting the correct data.');
            console.log('🔍 The issue might be:');
            console.log('   1. Template rendering problem');
            console.log('   2. Browser caching');
            console.log('   3. CSS not being applied correctly');
        } else {
            console.log('\n❌ Fields do not match! There\'s a data retrieval issue.');
        }
        
        // Test 4: Check if the drop exists and is active
        console.log('\n4️⃣ Drop status check:');
        console.log(`   Drop found: ${routeQuery ? '✅' : '❌'}`);
        console.log(`   Drop active: ${routeQuery?.is_active ? '✅' : '❌'}`);
        console.log(`   Drop ID: ${routeQuery?.id}`);
        console.log(`   Drop title: ${routeQuery?.title}`);
        
        // Test 5: Simulate the exact data that would be passed to template
        console.log('\n5️⃣ Template data simulation:');
        if (routeQuery) {
            const templateData = {
                drop: {
                    ...routeQuery,
                    signup_count: 0 // This would be added by the route
                }
            };
            
            console.log('📋 Data that would be passed to template:');
            console.log(JSON.stringify(templateData.drop, null, 2));
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    } finally {
        await db.destroy();
    }
}

testRouteData();
