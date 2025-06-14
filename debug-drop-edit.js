// Debug script to check drop edit data flow
const db = require('./server/knex');

async function debugDropEdit() {
    try {
        console.log('🔍 Debugging drop edit data flow...');
        
        // Get the drop data as it would be retrieved for the edit page
        const drop = await db('drops').where('id', 22).first();
        
        console.log('\n📋 Drop data being passed to template:');
        console.log('='.repeat(50));
        console.log(`ID: ${drop.id}`);
        console.log(`Title: ${drop.title}`);
        console.log(`Slug: ${drop.slug}`);
        console.log(`Background Color: ${drop.background_color}`);
        console.log(`Background Type: ${drop.background_type}`);
        console.log(`Card Background Type: ${drop.card_background_type}`);
        console.log(`Button Color: ${drop.button_color}`);
        console.log(`Button Text Color: ${drop.button_text_color}`);
        console.log(`Title Color: ${drop.title_color}`);
        console.log(`Description Color: ${drop.description_color}`);
        
        console.log('\n🧪 Testing Handlebars conditionals:');
        console.log('='.repeat(50));
        
        // Test background type conditional
        const isGradient = drop.background_type === 'gradient';
        const isSolid = drop.background_type === 'solid';
        console.log(`Background Type = "${drop.background_type}"`);
        console.log(`  - Is Gradient: ${isGradient}`);
        console.log(`  - Is Solid: ${isSolid}`);
        
        // Test card background type conditionals
        const cardTypes = ['solid_white', 'solid_dark', 'translucent_light', 'translucent_dark'];
        console.log(`Card Background Type = "${drop.card_background_type}"`);
        cardTypes.forEach(type => {
            const isSelected = drop.card_background_type === type;
            console.log(`  - Is ${type}: ${isSelected}`);
        });
        
        console.log('\n🎨 Color values:');
        console.log('='.repeat(50));
        console.log(`Background Color: ${drop.background_color || 'NULL'}`);
        console.log(`Button Color: ${drop.button_color || 'NULL'}`);
        console.log(`Button Text Color: ${drop.button_text_color || 'NULL'}`);
        console.log(`Title Color: ${drop.title_color || 'NULL'}`);
        console.log(`Description Color: ${drop.description_color || 'NULL'}`);
        
        // Check for any null or undefined values that might cause issues
        console.log('\n⚠️  Potential issues:');
        console.log('='.repeat(50));
        const issues = [];
        
        if (!drop.background_type) issues.push('background_type is null/undefined');
        if (!drop.card_background_type) issues.push('card_background_type is null/undefined');
        if (!drop.button_text_color) issues.push('button_text_color is null/undefined');
        
        if (issues.length === 0) {
            console.log('✅ No obvious data issues found');
        } else {
            issues.forEach(issue => console.log(`❌ ${issue}`));
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await db.destroy();
    }
}

debugDropEdit();
