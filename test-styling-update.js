// Test script to update drop styling and verify changes
const db = require('./server/knex');

async function testStylingUpdate() {
    try {
        console.log('🧪 Testing styling system...');

        // Get current drop data
        const currentDrop = await db('drops').where('id', 22).first();
        console.log('📋 Current drop styling:');
        console.log(`   Background Type: ${currentDrop.background_type}`);
        console.log(`   Card Background Type: ${currentDrop.card_background_type}`);
        console.log(`   Background Color: ${currentDrop.background_color}`);
        console.log(`   Button Color: ${currentDrop.button_color}`);
        console.log(`   Button Text Color: ${currentDrop.button_text_color}`);

        // Update with gradient test styling values
        const testStyling = {
            background_type: 'gradient',
            card_background_type: 'translucent_dark',
            background_color: '#DC2626',
            button_color: '#EF4444',
            button_text_color: '#FFFFFF',
            title_color: '#FFFFFF',
            description_color: '#F3F4F6'
        };

        console.log('\n🔄 Updating drop with test styling...');
        await db('drops').where('id', 22).update(testStyling);

        // Verify the update
        const updatedDrop = await db('drops').where('id', 22).first();
        console.log('\n✅ Updated drop styling:');
        console.log(`   Background Type: ${updatedDrop.background_type}`);
        console.log(`   Card Background Type: ${updatedDrop.card_background_type}`);
        console.log(`   Background Color: ${updatedDrop.background_color}`);
        console.log(`   Button Color: ${updatedDrop.button_color}`);
        console.log(`   Button Text Color: ${updatedDrop.button_text_color}`);
        console.log(`   Title Color: ${updatedDrop.title_color}`);
        console.log(`   Description Color: ${updatedDrop.description_color}`);

        console.log('\n🌐 Test the live page at: http://localhost:3000/drop/laylo-test-drop');
        console.log('🎨 Test the edit page at: http://localhost:3000/drops/22/edit');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await db.destroy();
    }
}

testStylingUpdate();