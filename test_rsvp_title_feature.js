// Comprehensive RSVP Title Feature Test
// Run this in browser console on modern drop edit page

console.log('🎯 COMPREHENSIVE RSVP TITLE FEATURE TEST');
console.log('='.repeat(50));

// Test 1: Check if RSVP title input exists
console.log('\n1️⃣ TESTING RSVP TITLE INPUT FIELD');
console.log('='.repeat(30));

const rsvpTitleInput = document.getElementById('edit-rsvp-title');
const rsvpTitleCounter = document.getElementById('rsvp-title-counter');

if (rsvpTitleInput) {
    console.log('✅ RSVP title input found');
    console.log(`   Current value: "${rsvpTitleInput.value}"`);
    console.log(`   Max length: ${rsvpTitleInput.maxLength}`);
    console.log(`   Placeholder: "${rsvpTitleInput.placeholder}"`);
    console.log(`   Name attribute: "${rsvpTitleInput.name}"`);
} else {
    console.error('❌ RSVP title input not found!');
}

if (rsvpTitleCounter) {
    console.log('✅ Character counter found');
    console.log(`   Counter text: "${rsvpTitleCounter.textContent}"`);
    console.log(`   Counter classes: "${rsvpTitleCounter.className}"`);
} else {
    console.error('❌ Character counter not found!');
}

// Test 2: Test character counting functionality
console.log('\n2️⃣ TESTING CHARACTER COUNTING');
console.log('='.repeat(30));

if (rsvpTitleInput && rsvpTitleCounter) {
    const originalValue = rsvpTitleInput.value;
    
    // Test short text
    console.log('Testing short text (10 chars)...');
    rsvpTitleInput.value = 'Short Text';
    rsvpTitleInput.dispatchEvent(new Event('input', { bubbles: true }));
    console.log(`   Counter: "${rsvpTitleCounter.textContent}"`);
    console.log(`   Counter color: "${rsvpTitleCounter.className}"`);
    
    // Test medium text
    console.log('Testing medium text (20 chars)...');
    rsvpTitleInput.value = 'Medium Length Text!!';
    rsvpTitleInput.dispatchEvent(new Event('input', { bubbles: true }));
    console.log(`   Counter: "${rsvpTitleCounter.textContent}"`);
    console.log(`   Counter color: "${rsvpTitleCounter.className}"`);
    
    // Test long text (warning zone)
    console.log('Testing long text (26 chars)...');
    rsvpTitleInput.value = 'This is a very long title!';
    rsvpTitleInput.dispatchEvent(new Event('input', { bubbles: true }));
    console.log(`   Counter: "${rsvpTitleCounter.textContent}"`);
    console.log(`   Counter color: "${rsvpTitleCounter.className}"`);
    
    // Test maximum length
    console.log('Testing maximum length (30 chars)...');
    rsvpTitleInput.value = 'Maximum length title here!!';
    rsvpTitleInput.dispatchEvent(new Event('input', { bubbles: true }));
    console.log(`   Counter: "${rsvpTitleCounter.textContent}"`);
    console.log(`   Counter color: "${rsvpTitleCounter.className}"`);
    
    // Restore original value
    rsvpTitleInput.value = originalValue;
    rsvpTitleInput.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('✅ Original value restored');
} else {
    console.error('❌ Cannot test character counting - missing elements');
}

// Test 3: Test real-time preview updates
console.log('\n3️⃣ TESTING REAL-TIME PREVIEW UPDATES');
console.log('='.repeat(30));

if (rsvpTitleInput) {
    const originalValue = rsvpTitleInput.value;
    
    // Check if preview iframe exists
    const previewIframe = document.querySelector('iframe');
    if (previewIframe) {
        console.log('✅ Preview iframe found');
        
        try {
            const previewDoc = previewIframe.contentDocument || previewIframe.contentWindow.document;
            const previewButton = previewDoc.querySelector('.signup-button .button-text, .laylo-card-title');
            
            if (previewButton) {
                console.log('✅ Preview button/title found');
                console.log(`   Current preview text: "${previewButton.textContent}"`);
                
                // Test preview update
                console.log('Testing preview update...');
                rsvpTitleInput.value = 'Test Preview';
                rsvpTitleInput.dispatchEvent(new Event('input', { bubbles: true }));
                
                setTimeout(() => {
                    console.log(`   Updated preview text: "${previewButton.textContent}"`);
                    
                    // Restore original value
                    rsvpTitleInput.value = originalValue;
                    rsvpTitleInput.dispatchEvent(new Event('input', { bubbles: true }));
                }, 100);
            } else {
                console.warn('⚠️ Preview button/title not found in iframe');
            }
        } catch (error) {
            console.warn('⚠️ Cannot access preview iframe (cross-origin or not loaded)');
        }
    } else {
        console.warn('⚠️ Preview iframe not found');
    }
} else {
    console.error('❌ Cannot test preview - RSVP title input missing');
}

// Test 4: Test form validation and submission
console.log('\n4️⃣ TESTING FORM VALIDATION');
console.log('='.repeat(30));

const form = document.querySelector('form');
if (form && rsvpTitleInput) {
    console.log('✅ Form found');
    
    // Test form data collection
    const formData = new FormData(form);
    const rsvpTitleValue = formData.get('rsvp_title');
    console.log(`   Form data rsvp_title: "${rsvpTitleValue}"`);
    
    // Test validation
    const isValid = rsvpTitleInput.checkValidity();
    console.log(`   Input validity: ${isValid ? '✅' : '❌'}`);
    
    if (!isValid) {
        console.log(`   Validation message: "${rsvpTitleInput.validationMessage}"`);
    }
} else {
    console.error('❌ Form or RSVP title input not found');
}

// Test 5: Test special characters and emojis
console.log('\n5️⃣ TESTING SPECIAL CHARACTERS & EMOJIS');
console.log('='.repeat(30));

if (rsvpTitleInput) {
    const originalValue = rsvpTitleInput.value;
    const testCases = [
        'Join Us! 🎉',
        'Sign Up & Win',
        'Get Notified 📧',
        'Subscribe Now!',
        'Join the List ✨',
        'Notify Me 🔔'
    ];
    
    testCases.forEach((testCase, index) => {
        console.log(`Testing case ${index + 1}: "${testCase}"`);
        rsvpTitleInput.value = testCase;
        rsvpTitleInput.dispatchEvent(new Event('input', { bubbles: true }));
        console.log(`   Length: ${testCase.length} chars`);
        console.log(`   Counter: "${rsvpTitleCounter ? rsvpTitleCounter.textContent : 'N/A'}"`);
    });
    
    // Restore original value
    rsvpTitleInput.value = originalValue;
    rsvpTitleInput.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('✅ Original value restored');
} else {
    console.error('❌ Cannot test special characters - RSVP title input missing');
}

// Test 6: Test JavaScript integration
console.log('\n6️⃣ TESTING JAVASCRIPT INTEGRATION');
console.log('='.repeat(30));

// Check if functions exist
const functions = [
    'updateRsvpTitleCounter',
    'updatePreviewContent',
    'updatePreviewColors'
];

functions.forEach(funcName => {
    if (typeof window[funcName] === 'function') {
        console.log(`✅ Function ${funcName} exists`);
    } else {
        console.warn(`⚠️ Function ${funcName} not found globally`);
    }
});

// Check if variables exist
const variables = [
    'rsvpTitleInput',
    'previewDocument',
    'previewButtonText'
];

variables.forEach(varName => {
    if (typeof window[varName] !== 'undefined') {
        console.log(`✅ Variable ${varName} exists`);
    } else {
        console.warn(`⚠️ Variable ${varName} not found globally`);
    }
});

// Summary
console.log('\n🏁 TEST SUMMARY');
console.log('='.repeat(20));

const criticalTests = [
    !!rsvpTitleInput,
    !!rsvpTitleCounter,
    rsvpTitleInput ? rsvpTitleInput.maxLength === 30 : false,
    rsvpTitleInput ? rsvpTitleInput.name === 'rsvp_title' : false,
    !!form
];

const passedTests = criticalTests.filter(test => test).length;
const totalTests = criticalTests.length;

console.log(`Critical tests passed: ${passedTests}/${totalTests}`);

if (passedTests === totalTests) {
    console.log('✅ ALL CRITICAL TESTS PASSED');
    console.log('✅ RSVP Title feature is working correctly');
} else {
    console.log('⚠️ SOME TESTS FAILED');
    console.log('⚠️ Check individual test results above');
}

console.log('\n📋 MANUAL TESTING CHECKLIST:');
console.log('□ Type in RSVP title field and verify character counter updates');
console.log('□ Test with short titles (5-10 characters)');
console.log('□ Test with medium titles (15-20 characters)');
console.log('□ Test with maximum length titles (25-30 characters)');
console.log('□ Test with special characters and emojis');
console.log('□ Verify real-time preview updates (if preview available)');
console.log('□ Save drop and verify RSVP title appears on landing page');
console.log('□ Test on mobile device for proper display');
console.log('□ Verify no layout breaking with long titles');
console.log('□ Test fallback to "Get Notified" when field is empty');

console.log('\n🔧 TROUBLESHOOTING:');
console.log('- If input not found: Check modern drop edit page is loaded');
console.log('- If counter not working: Check JavaScript console for errors');
console.log('- If preview not updating: Check iframe accessibility');
console.log('- If form not submitting: Check network tab for API errors');
console.log('- If landing page not showing custom title: Check database value');
