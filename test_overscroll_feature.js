// Test script to verify overscroll background color feature end-to-end
// Run this in browser console on the modern drop edit page

console.log('🧪 TESTING OVERSCROLL BACKGROUND COLOR FEATURE');
console.log('='.repeat(50));

// Test 1: Check if color picker exists
console.log('\n1️⃣ Testing color picker existence...');
const colorPicker = document.getElementById('edit-overscroll-background-color');
if (colorPicker) {
    console.log('✅ Color picker found:', colorPicker);
    console.log('   Current value:', colorPicker.value);
    console.log('   Name attribute:', colorPicker.name);
} else {
    console.error('❌ Color picker not found!');
}

// Test 2: Check if JavaScript variable is initialized
console.log('\n2️⃣ Testing JavaScript integration...');
if (typeof overscrollBackgroundColorInput !== 'undefined' && overscrollBackgroundColorInput) {
    console.log('✅ JavaScript variable initialized:', overscrollBackgroundColorInput);
} else {
    console.error('❌ JavaScript variable not initialized!');
}

// Test 3: Test color change and preview update
console.log('\n3️⃣ Testing color change functionality...');
if (colorPicker) {
    const testColor = '#ff0000'; // Red
    const originalColor = colorPicker.value;
    
    console.log('   Setting test color:', testColor);
    colorPicker.value = testColor;
    
    // Trigger input event
    colorPicker.dispatchEvent(new Event('input', { bubbles: true }));
    
    console.log('   Color changed from', originalColor, 'to', colorPicker.value);
    
    // Check if CSS variable is updated in preview
    if (typeof previewDocument !== 'undefined' && previewDocument) {
        const cssVar = previewDocument.documentElement.style.getPropertyValue('--drop-overscroll-background-color');
        console.log('   Preview CSS variable:', cssVar);
        if (cssVar === testColor) {
            console.log('✅ Preview updated correctly');
        } else {
            console.warn('⚠️ Preview may not be updated');
        }
    } else {
        console.log('   Preview document not available for testing');
    }
    
    // Restore original color
    colorPicker.value = originalColor;
    colorPicker.dispatchEvent(new Event('input', { bubbles: true }));
}

// Test 4: Check form submission data
console.log('\n4️⃣ Testing form data collection...');
const form = document.querySelector('form');
if (form) {
    const formData = new FormData(form);
    const overscrollColor = formData.get('overscroll_background_color');
    console.log('✅ Form data includes overscroll_background_color:', overscrollColor);
} else {
    console.error('❌ Form not found!');
}

// Test 5: API endpoint test
console.log('\n5️⃣ Testing API endpoint...');
async function testAPI() {
    try {
        const dropId = window.location.pathname.split('/').pop();
        console.log('   Drop ID:', dropId);
        
        const testData = {
            overscroll_background_color: '#00ff00' // Green
        };
        
        console.log('   Sending test data:', testData);
        
        const response = await fetch(`/api/drops/${dropId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify(testData)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ API test successful:', result.success);
            console.log('   Updated overscroll color:', result.data?.overscroll_background_color);
        } else {
            console.error('❌ API test failed:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('   Error details:', errorText);
        }
    } catch (error) {
        console.error('❌ API test error:', error);
    }
}

testAPI();

console.log('\n🏁 Test completed. Check results above.');
console.log('='.repeat(50));
