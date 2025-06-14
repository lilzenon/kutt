// Force update test - bypass the form completely
const db = require('./server/knex');

async function forceUpdateTest() {
    console.log('🔥 FORCE UPDATE TEST - BYPASSING FORM COMPLETELY');
    console.log('='.repeat(60));
    
    try {
        const dropId = 22;
        
        // Force update with very obvious changes
        const forceUpdate = {
            background_color: '#00FF00', // Bright green
            background_type: 'solid',
            card_background_type: 'solid_white',
            button_color: '#FF0000', // Bright red
            button_text_color: '#FFFFFF',
            title_color: '#000000',
            description_color: '#333333'
        };
        
        console.log('🔥 FORCING DATABASE UPDATE...');
        console.log('📤 Update data:', forceUpdate);
        
        await db('drops').where('id', dropId).update(forceUpdate);
        
        // Verify the update
        const updatedDrop = await db('drops').where('id', dropId).first();
        
        console.log('\n✅ VERIFICATION:');
        console.log(`   Background Color: ${updatedDrop.background_color} (should be #00FF00)`);
        console.log(`   Button Color: ${updatedDrop.button_color} (should be #FF0000)`);
        console.log(`   Background Type: ${updatedDrop.background_type} (should be solid)`);
        
        const success = updatedDrop.background_color === '#00FF00';
        
        if (success) {
            console.log('\n🎉 DATABASE UPDATE SUCCESSFUL!');
            console.log('🌐 Now check the live page - it should have:');
            console.log('   - BRIGHT GREEN background');
            console.log('   - RED button');
            console.log('   - WHITE card');
            console.log('\n🔗 Live page URL: http://localhost:3000/drop/laylo-test-drop');
            console.log('\n🔍 If the live page shows these changes, the backend works.');
            console.log('🔍 If not, there might be a template rendering issue.');
        } else {
            console.log('\n❌ DATABASE UPDATE FAILED!');
        }
        
    } catch (error) {
        console.error('❌ Force update error:', error.message);
    } finally {
        await db.destroy();
    }
}

forceUpdateTest();
