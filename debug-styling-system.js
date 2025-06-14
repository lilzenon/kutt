// Comprehensive debugging script for the enhanced styling system
const db = require('./server/knex');

async function debugStylingSystem() {
    console.log('🔍 COMPREHENSIVE STYLING SYSTEM DEBUG');
    console.log('='.repeat(60));

    try {
        // 1. Database Schema Verification
        console.log('\n1️⃣ DATABASE SCHEMA VERIFICATION');
        console.log('-'.repeat(40));

        const tableInfo = await db.raw(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'drops'
        `);
        const columns = tableInfo.rows.map(col => col.column_name);

        const requiredStylingFields = [
            'background_color', 'background_type', 'card_background_type',
            'button_color', 'button_text_color', 'title_color', 'description_color'
        ];

        console.log('📋 Available columns in drops table:');
        columns.forEach(col => {
            const isRequired = requiredStylingFields.includes(col);
            console.log(`   ${isRequired ? '✅' : '  '} ${col}`);
        });

        const missingFields = requiredStylingFields.filter(field => !columns.includes(field));
        if (missingFields.length > 0) {
            console.log(`❌ Missing required fields: ${missingFields.join(', ')}`);
        } else {
            console.log('✅ All required styling fields exist in database');
        }

        // 2. Current Drop Data Analysis
        console.log('\n2️⃣ CURRENT DROP DATA ANALYSIS');
        console.log('-'.repeat(40));

        const drop = await db('drops').where('id', 22).first();
        if (!drop) {
            console.log('❌ Drop with ID 22 not found');
            return;
        }

        console.log('📊 Current drop styling data:');
        requiredStylingFields.forEach(field => {
            const value = drop[field];
            const status = value ? '✅' : '⚠️ ';
            console.log(`   ${status} ${field}: ${value || 'NULL'}`);
        });

        // 3. Test Form Submission Simulation
        console.log('\n3️⃣ FORM SUBMISSION SIMULATION');
        console.log('-'.repeat(40));

        const testStylingData = {
            background_type: 'solid',
            card_background_type: 'solid_white',
            background_color: '#FF5733',
            button_color: '#28A745',
            button_text_color: '#FFFFFF',
            title_color: '#212529',
            description_color: '#6C757D'
        };

        console.log('🧪 Testing database update with new styling data...');
        await db('drops').where('id', 22).update(testStylingData);

        // Verify the update
        const updatedDrop = await db('drops').where('id', 22).first();
        console.log('✅ Database update verification:');
        Object.keys(testStylingData).forEach(field => {
                    const expected = testStylingData[field];
                    const actual = updatedDrop[field];
                    const match = expected === actual;
                    console.log(`   ${match ? '✅' : '❌'} ${field}: ${actual} ${match ? '' : `(expected: ${expected})`}`);
        });
        
        // 4. Template Data Verification
        console.log('\n4️⃣ TEMPLATE DATA VERIFICATION');
        console.log('-'.repeat(40));
        
        console.log('🎨 Data that would be passed to templates:');
        console.log(`   Drop ID: ${updatedDrop.id}`);
        console.log(`   Title: ${updatedDrop.title}`);
        console.log(`   Slug: ${updatedDrop.slug}`);
        console.log(`   Background Type: ${updatedDrop.background_type}`);
        console.log(`   Card Background Type: ${updatedDrop.card_background_type}`);
        
        // 5. Handlebars Conditional Testing
        console.log('\n5️⃣ HANDLEBARS CONDITIONAL TESTING');
        console.log('-'.repeat(40));
        
        const backgroundType = updatedDrop.background_type;
        const cardBackgroundType = updatedDrop.card_background_type;
        
        console.log('🔧 Testing Handlebars conditionals:');
        console.log(`   Background Type = "${backgroundType}"`);
        console.log(`     - (eq background_type "solid"): ${backgroundType === 'solid'}`);
        console.log(`     - (eq background_type "gradient"): ${backgroundType === 'gradient'}`);
        
        console.log(`   Card Background Type = "${cardBackgroundType}"`);
        ['solid_white', 'solid_dark', 'translucent_light', 'translucent_dark'].forEach(type => {
            console.log(`     - (eq card_background_type "${type}"): ${cardBackgroundType === type}`);
        });
        
        // 6. API Endpoint Testing
        console.log('\n6️⃣ API ENDPOINT TESTING');
        console.log('-'.repeat(40));
        
        console.log('🌐 Testing API endpoints:');
        console.log(`   GET /api/drops/22 - Should return drop with styling data`);
        console.log(`   PUT /api/drops/22 - Should accept styling updates`);
        console.log(`   GET /drop/${updatedDrop.slug} - Should render with styling`);
        
        // 7. Recommendations
        console.log('\n7️⃣ DEBUGGING RECOMMENDATIONS');
        console.log('-'.repeat(40));
        
        console.log('🔧 Next steps for debugging:');
        console.log('   1. Check browser developer tools for JavaScript errors');
        console.log('   2. Inspect form submission network requests');
        console.log('   3. Verify template rendering with updated data');
        console.log('   4. Test live page styling application');
        
        console.log('\n🌐 Test URLs:');
        console.log(`   Edit Page: http://localhost:3000/drops/22/edit`);
        console.log(`   Live Page: http://localhost:3000/drop/${updatedDrop.slug}`);
        
    } catch (error) {
        console.error('❌ Debug error:', error.message);
        console.error(error.stack);
    } finally {
        await db.destroy();
    }
}

debugStylingSystem();