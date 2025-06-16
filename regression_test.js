// Regression test to ensure existing functionality still works
// Run this in browser console on the modern drop edit page

console.log('🔄 REGRESSION TEST: Existing Functionality');
console.log('='.repeat(50));

// Test existing color pickers
const colorPickers = [
    { id: 'edit-background-color', name: 'Background Color' },
    { id: 'edit-title-color', name: 'Title Color' },
    { id: 'edit-description-color', name: 'Description Color' },
    { id: 'edit-button-color', name: 'Button Color' },
    { id: 'edit-button-text-color', name: 'Button Text Color' }
];

console.log('\n1️⃣ Testing existing color pickers...');
colorPickers.forEach(picker => {
    const element = document.getElementById(picker.id);
    if (element) {
        console.log(`✅ ${picker.name}: Found, value = ${element.value}`);
        
        // Test event handling
        const originalValue = element.value;
        element.value = '#ff0000';
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.value = originalValue;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        
    } else {
        console.error(`❌ ${picker.name}: Not found!`);
    }
});

// Test form inputs
const formInputs = [
    { id: 'edit-title', name: 'Title' },
    { id: 'edit-subtitle', name: 'Subtitle' },
    { id: 'edit-description', name: 'Description' },
    { id: 'edit-slug', name: 'Slug' },
    { id: 'edit-button-text', name: 'Button Text' }
];

console.log('\n2️⃣ Testing form inputs...');
formInputs.forEach(input => {
    const element = document.getElementById(input.id);
    if (element) {
        console.log(`✅ ${input.name}: Found, value = "${element.value}"`);
    } else {
        console.error(`❌ ${input.name}: Not found!`);
    }
});

// Test toggles
const toggles = [
    { id: 'edit-collect-email', name: 'Collect Email' },
    { id: 'edit-collect-phone', name: 'Collect Phone' }
];

console.log('\n3️⃣ Testing toggles...');
toggles.forEach(toggle => {
    const element = document.getElementById(toggle.id);
    if (element) {
        console.log(`✅ ${toggle.name}: Found, checked = ${element.checked}`);
    } else {
        console.error(`❌ ${toggle.name}: Not found!`);
    }
});

// Test preview functionality
console.log('\n4️⃣ Testing preview functionality...');
if (typeof updatePreviewColors === 'function') {
    console.log('✅ updatePreviewColors function exists');
    try {
        updatePreviewColors();
        console.log('✅ updatePreviewColors executed without error');
    } catch (error) {
        console.error('❌ updatePreviewColors error:', error);
    }
} else {
    console.error('❌ updatePreviewColors function not found!');
}

if (typeof updatePreviewContent === 'function') {
    console.log('✅ updatePreviewContent function exists');
    try {
        updatePreviewContent();
        console.log('✅ updatePreviewContent executed without error');
    } catch (error) {
        console.error('❌ updatePreviewContent error:', error);
    }
} else {
    console.error('❌ updatePreviewContent function not found!');
}

// Test form submission preparation
console.log('\n5️⃣ Testing form submission...');
const form = document.querySelector('form');
if (form) {
    console.log('✅ Form found');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    // Check critical fields
    const criticalFields = ['title', 'slug', 'background_color', 'button_color'];
    criticalFields.forEach(field => {
        if (data[field]) {
            console.log(`✅ ${field}: "${data[field]}"`);
        } else {
            console.warn(`⚠️ ${field}: Missing or empty`);
        }
    });
} else {
    console.error('❌ Form not found!');
}

// Test mobile responsiveness
console.log('\n6️⃣ Testing mobile responsiveness...');
const viewport = document.querySelector('meta[name="viewport"]');
if (viewport) {
    console.log('✅ Viewport meta tag found:', viewport.content);
} else {
    console.warn('⚠️ Viewport meta tag not found');
}

console.log('\n🏁 Regression test completed.');
console.log('='.repeat(50));
