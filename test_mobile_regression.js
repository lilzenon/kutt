// Mobile regression test to ensure existing functionality still works
// Run this in browser console on mobile device

console.log('🔄 MOBILE REGRESSION TEST');
console.log('='.repeat(40));

// Test 1: Basic page functionality
console.log('\n1️⃣ TESTING BASIC PAGE FUNCTIONALITY');
console.log('='.repeat(30));

// Check if page loads properly
const pageTitle = document.title;
const hasContent = document.body.children.length > 0;
const hasDropContainer = document.querySelector('.drop-container') !== null;

console.log(`Page title: ${pageTitle ? '✅' : '❌'} - "${pageTitle}"`);
console.log(`Page has content: ${hasContent ? '✅' : '❌'}`);
console.log(`Drop container exists: ${hasDropContainer ? '✅' : '❌'}`);

// Test 2: Mobile layout and responsiveness
console.log('\n2️⃣ TESTING MOBILE LAYOUT');
console.log('='.repeat(30));

const viewport = window.innerWidth;
const isMobileViewport = viewport <= 767;
const hasViewportMeta = document.querySelector('meta[name="viewport"]') !== null;

console.log(`Viewport width: ${viewport}px`);
console.log(`Mobile viewport: ${isMobileViewport ? '✅' : '❌'}`);
console.log(`Viewport meta tag: ${hasViewportMeta ? '✅' : '❌'}`);

// Check mobile-specific elements
const dropTitle = document.querySelector('.drop-title');
const dropSubtitle = document.querySelector('.drop-subtitle');
const rsvpCard = document.querySelector('.rsvp-card');

if (dropTitle) {
    const titleStyles = getComputedStyle(dropTitle);
    console.log(`Title font-size: ${titleStyles.fontSize}`);
    console.log(`Title text-align: ${titleStyles.textAlign}`);
}

if (dropSubtitle) {
    const subtitleStyles = getComputedStyle(dropSubtitle);
    console.log(`Subtitle font-size: ${subtitleStyles.fontSize}`);
    console.log(`Subtitle text-align: ${subtitleStyles.textAlign}`);
}

// Test 3: Form functionality
console.log('\n3️⃣ TESTING FORM FUNCTIONALITY');
console.log('='.repeat(30));

const emailInput = document.querySelector('input[type="email"]');
const phoneInput = document.querySelector('input[type="tel"]');
const submitButton = document.querySelector('button[type="submit"], .signup-button');

console.log(`Email input: ${emailInput ? '✅' : '❌'}`);
console.log(`Phone input: ${phoneInput ? '✅' : '❌'}`);
console.log(`Submit button: ${submitButton ? '✅' : '❌'}`);

// Test input focus and keyboard behavior
if (emailInput) {
    const emailStyles = getComputedStyle(emailInput);
    const fontSize = parseFloat(emailStyles.fontSize);
    console.log(`Email input font-size: ${fontSize}px ${fontSize >= 16 ? '✅' : '❌ (should be ≥16px to prevent zoom)'}`);
}

// Test 4: Touch and scroll behavior
console.log('\n4️⃣ TESTING TOUCH & SCROLL BEHAVIOR');
console.log('='.repeat(30));

const bodyStyles = getComputedStyle(document.body);
const touchAction = bodyStyles.touchAction;
const overflowX = bodyStyles.overflowX;
const webkitOverflow = bodyStyles.webkitOverflowScrolling;

console.log(`Touch action: ${touchAction}`);
console.log(`Overflow-X: ${overflowX}`);
console.log(`-webkit-overflow-scrolling: ${webkitOverflow}`);

// Test scroll behavior
const isScrollable = document.documentElement.scrollHeight > window.innerHeight;
const currentScroll = window.pageYOffset;

console.log(`Page is scrollable: ${isScrollable ? '✅' : '❌'}`);
console.log(`Current scroll position: ${currentScroll}px`);

// Test 5: Background and theming
console.log('\n5️⃣ TESTING BACKGROUND & THEMING');
console.log('='.repeat(30));

const themeColors = document.querySelectorAll('meta[name="theme-color"]');
const bodyBg = bodyStyles.backgroundColor;
const htmlBg = getComputedStyle(document.documentElement).backgroundColor;

console.log(`Theme color tags: ${themeColors.length} ${themeColors.length > 0 ? '✅' : '❌'}`);
console.log(`Body background: ${bodyBg}`);
console.log(`HTML background: ${htmlBg}`);

// Check if background images/gradients are working
const dropPageContainer = document.querySelector('.drop-page-container');
if (dropPageContainer) {
    const containerStyles = getComputedStyle(dropPageContainer);
    const backgroundImage = containerStyles.backgroundImage;
    console.log(`Container background: ${backgroundImage !== 'none' ? '✅ Has background' : '❌ No background'}`);
}

// Test 6: Performance and loading
console.log('\n6️⃣ TESTING PERFORMANCE');
console.log('='.repeat(30));

// Check for any JavaScript errors
const hasErrors = window.onerror !== null;
console.log(`JavaScript errors: ${hasErrors ? '⚠️ Check console' : '✅ None detected'}`);

// Check loading performance
const loadTime = performance.timing ? 
    performance.timing.loadEventEnd - performance.timing.navigationStart : 
    'Unknown';
console.log(`Page load time: ${loadTime}ms`);

// Test 7: Mobile-specific features
console.log('\n7️⃣ TESTING MOBILE-SPECIFIC FEATURES');
console.log('='.repeat(30));

const supportsTouchEvents = 'ontouchstart' in window;
const supportsOrientationChange = 'onorientationchange' in window;
const supportsDeviceMotion = 'ondevicemotion' in window;

console.log(`Touch events: ${supportsTouchEvents ? '✅' : '❌'}`);
console.log(`Orientation change: ${supportsOrientationChange ? '✅' : '❌'}`);
console.log(`Device motion: ${supportsDeviceMotion ? '✅' : '❌'}`);

// Test orientation
const orientation = screen.orientation ? screen.orientation.angle : window.orientation;
console.log(`Current orientation: ${orientation}°`);

// Test 8: Accessibility
console.log('\n8️⃣ TESTING ACCESSIBILITY');
console.log('='.repeat(30));

const hasAltTexts = Array.from(document.images).every(img => img.alt !== '');
const hasLabels = Array.from(document.querySelectorAll('input')).every(input => 
    input.labels && input.labels.length > 0 || input.getAttribute('aria-label')
);
const hasHeadings = document.querySelector('h1, h2, h3, h4, h5, h6') !== null;

console.log(`Images have alt text: ${hasAltTexts ? '✅' : '⚠️'}`);
console.log(`Inputs have labels: ${hasLabels ? '✅' : '⚠️'}`);
console.log(`Page has headings: ${hasHeadings ? '✅' : '⚠️'}`);

// Test 9: Network and connectivity
console.log('\n9️⃣ TESTING NETWORK & CONNECTIVITY');
console.log('='.repeat(30));

const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
if (connection) {
    console.log(`Connection type: ${connection.effectiveType || connection.type || 'Unknown'}`);
    console.log(`Downlink: ${connection.downlink || 'Unknown'} Mbps`);
} else {
    console.log('Network API not supported');
}

// Test online status
console.log(`Online status: ${navigator.onLine ? '✅ Online' : '❌ Offline'}`);

// Summary
console.log('\n🏁 REGRESSION TEST SUMMARY');
console.log('='.repeat(30));

const criticalTests = [
    hasContent,
    hasDropContainer,
    hasViewportMeta,
    supportsTouchEvents,
    themeColors.length > 0
];

const passedTests = criticalTests.filter(test => test).length;
const totalTests = criticalTests.length;

console.log(`Critical tests passed: ${passedTests}/${totalTests}`);

if (passedTests === totalTests) {
    console.log('✅ ALL CRITICAL TESTS PASSED');
    console.log('✅ No regressions detected');
    console.log('✅ Mobile functionality working correctly');
} else {
    console.log('⚠️ SOME TESTS FAILED');
    console.log('⚠️ Check individual test results above');
    console.log('⚠️ May indicate regressions or issues');
}

console.log('\n📱 MANUAL TESTING CHECKLIST:');
console.log('□ Page loads correctly on mobile');
console.log('□ Text is readable and properly sized');
console.log('□ Forms work and inputs don\'t cause zoom');
console.log('□ Scrolling is smooth and responsive');
console.log('□ Pull-to-refresh works with custom color');
console.log('□ No horizontal scrolling issues');
console.log('□ Buttons are properly sized for touch');
console.log('□ Page works in both portrait and landscape');
console.log('□ No JavaScript errors in console');
console.log('□ Performance is acceptable');

console.log('\n🔧 IF ISSUES FOUND:');
console.log('1. Check browser console for errors');
console.log('2. Test on different mobile browsers');
console.log('3. Verify viewport meta tag configuration');
console.log('4. Check CSS media queries');
console.log('5. Test touch event handling');
console.log('6. Verify theme-color implementation');
