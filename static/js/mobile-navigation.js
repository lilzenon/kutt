/**
 * 🚀 ULTRA-RESPONSIVE MOBILE NAVIGATION SYSTEM
 *
 * Eliminates all delays and jankiness
 * Provides instant, native-like mobile experience
 */

class MobileNavigationManager {
    constructor() {
        this.mobileNav = null;
        this.mobileOverlay = null;
        this.mobileTrigger = null;
        this.isOpen = false;
        this.isAnimating = false;
        this.touchStartY = 0;
        this.touchCurrentY = 0;
        this.isDragging = false;
        this.touchStartTime = 0;
        this.lastTouchEnd = 0;

        this.init();
    }

    init() {
        this.setupElements();
        this.setupInstantEventListeners();
        this.setupTouchGestures();
        this.setupKeyboardNavigation();
        this.setupAccessibility();

        console.log('🚀 Ultra-Responsive Mobile Navigation initialized');
    }

    setupElements() {
        this.mobileNav = document.getElementById('mobileNav');
        this.mobileOverlay = document.getElementById('mobileOverlay');
        this.mobileTrigger = document.getElementById('mobileTrigger');
        this.mobileClose = document.getElementById('mobileClose');

        if (!this.mobileNav || !this.mobileOverlay || !this.mobileTrigger) {
            console.warn('Mobile navigation elements not found');
            return;
        }

        // Set initial ARIA attributes
        this.mobileTrigger.setAttribute('aria-label', 'Open navigation menu');
        this.mobileTrigger.setAttribute('aria-expanded', 'false');
        this.mobileNav.setAttribute('aria-hidden', 'true');
    }

    setupInstantEventListeners() {
        if (!this.mobileTrigger) return;

        // INSTANT TOUCH HANDLING - No delays, no conflicts
        let touchActive = false;
        let touchStarted = false;

        // Immediate touchstart response
        this.mobileTrigger.addEventListener('touchstart', (e) => {
            console.log('🚀 INSTANT touchstart');
            e.preventDefault();
            e.stopPropagation();

            touchActive = true;
            touchStarted = true;
            this.touchStartTime = Date.now();

            // INSTANT visual feedback
            this.addInstantFeedback(this.mobileTrigger);

            // Haptic feedback immediately
            if (navigator.vibrate) {
                navigator.vibrate(25); // Shorter, snappier vibration
            }
        }, { passive: false });

        // Immediate touchend response
        this.mobileTrigger.addEventListener('touchend', (e) => {
            console.log('🚀 INSTANT touchend');
            e.preventDefault();
            e.stopPropagation();

            if (touchActive && touchStarted) {
                const touchDuration = Date.now() - this.touchStartTime;

                // Only toggle if it was a quick tap (not a long press)
                if (touchDuration < 500) {
                    this.toggleNavigationInstant();
                }

                this.removeInstantFeedback(this.mobileTrigger);
                touchActive = false;
                touchStarted = false;

                // Prevent click events for a short time
                this.lastTouchEnd = Date.now();
            }
        }, { passive: false });

        // Fallback click handler (only for non-touch devices)
        this.mobileTrigger.addEventListener('click', (e) => {
            const timeSinceTouch = Date.now() - this.lastTouchEnd;

            // Only handle click if no recent touch event
            if (timeSinceTouch > 300) {
                console.log('🚀 INSTANT click (non-touch device)');
                e.preventDefault();
                e.stopPropagation();
                this.toggleNavigationInstant();
            }
        });

        // Cancel touch if user moves finger away
        this.mobileTrigger.addEventListener('touchcancel', (e) => {
            console.log('🚀 Touch cancelled');
            touchActive = false;
            touchStarted = false;
            this.removeInstantFeedback(this.mobileTrigger);
        }, { passive: false });

        // Close button
        if (this.mobileClose) {
            this.mobileClose.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeNavigation();
            });
        }

        // Overlay click to close
        if (this.mobileOverlay) {
            this.mobileOverlay.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeNavigation();
            });
        }

        // Navigation item clicks
        const navItems = document.querySelectorAll('.laylo-mobile-nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                this.addTouchFeedback(item);
                // Close navigation after a short delay for better UX
                setTimeout(() => {
                    this.closeNavigation();
                }, 150);
            });
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeNavigation();
            }
        });

        // Prevent body scroll when navigation is open
        document.addEventListener('touchmove', (e) => {
            if (this.isOpen && !this.mobileNav.contains(e.target)) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    setupTouchGestures() {
        if (!this.mobileNav) return;

        // Swipe down to close navigation
        this.mobileNav.addEventListener('touchstart', (e) => {
            this.touchStartY = e.touches[0].clientY;
            this.touchCurrentY = this.touchStartY;
            this.isDragging = false;
        }, { passive: true });

        this.mobileNav.addEventListener('touchmove', (e) => {
            this.touchCurrentY = e.touches[0].clientY;
            const deltaY = this.touchCurrentY - this.touchStartY;

            // Only allow downward swipe
            if (deltaY > 10) {
                this.isDragging = true;
                // Add visual feedback for swipe
                const progress = Math.min(deltaY / 200, 1);
                this.mobileNav.style.transform = `translateY(${deltaY * 0.3}px)`;
                this.mobileNav.style.opacity = 1 - (progress * 0.3);
            }
        }, { passive: true });

        this.mobileNav.addEventListener('touchend', (e) => {
            const deltaY = this.touchCurrentY - this.touchStartY;

            // Reset transform
            this.mobileNav.style.transform = '';
            this.mobileNav.style.opacity = '';

            // Close if swiped down enough
            if (this.isDragging && deltaY > 100) {
                this.closeNavigation();
            }

            this.isDragging = false;
        }, { passive: true });

        // Swipe up from bottom edge to open navigation
        document.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            const isBottomEdge = touch.clientY > window.innerHeight - 50;

            if (isBottomEdge && !this.isOpen) {
                this.touchStartY = touch.clientY;
            }
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (!this.isOpen) {
                const touch = e.changedTouches[0];
                const deltaY = this.touchStartY - touch.clientY;

                // Open if swiped up from bottom edge
                if (deltaY > 50 && this.touchStartY > window.innerHeight - 50) {
                    this.openNavigation();
                }
            }
        }, { passive: true });
    }

    setupKeyboardNavigation() {
        // Tab trapping when navigation is open
        document.addEventListener('keydown', (e) => {
            if (!this.isOpen || e.key !== 'Tab') return;

            const focusableElements = this.mobileNav.querySelectorAll(
                'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
            );

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                // Tab
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        });
    }

    setupAccessibility() {
        // Announce navigation state changes to screen readers
        const announcer = document.createElement('div');
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        announcer.className = 'sr-only';
        document.body.appendChild(announcer);
        this.announcer = announcer;
    }

    addInstantFeedback(element) {
        // INSTANT visual feedback - no delays
        element.style.transform = 'scale(0.96)';
        element.style.opacity = '0.7';
        element.style.transition = 'none'; // Remove any transition delays
    }

    removeInstantFeedback(element) {
        // Reset visual feedback instantly
        element.style.transform = '';
        element.style.opacity = '';
        element.style.transition = ''; // Restore transitions
    }

    toggleNavigationInstant() {
        // INSTANT navigation toggle - no animation delays
        console.log('🚀 INSTANT navigation toggle');

        if (this.isOpen) {
            this.closeNavigationInstant();
        } else {
            this.openNavigationInstant();
        }
    }

    openNavigationInstant() {
        if (this.isOpen) return;

        console.log('🚀 INSTANT navigation open');
        this.isOpen = true;

        // Update ARIA attributes
        this.mobileTrigger.setAttribute('aria-expanded', 'true');
        this.mobileNav.setAttribute('aria-hidden', 'false');

        // Show overlay and navigation INSTANTLY
        this.mobileOverlay.classList.add('active');
        this.mobileNav.classList.add('active');

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';

        // Dispatch event
        this.dispatchEvent('opened');
    }

    closeNavigationInstant() {
        if (!this.isOpen) return;

        console.log('🚀 INSTANT navigation close');
        this.isOpen = false;

        // Update ARIA attributes
        this.mobileTrigger.setAttribute('aria-expanded', 'false');
        this.mobileNav.setAttribute('aria-hidden', 'true');

        // Hide overlay and navigation INSTANTLY
        this.mobileOverlay.classList.remove('active');
        this.mobileNav.classList.remove('active');

        // Restore body scroll
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';

        // Dispatch event
        this.dispatchEvent('closed');
    }

    // Legacy methods for compatibility
    toggleNavigation() {
        this.toggleNavigationInstant();
    }

    addTouchFeedback(element) {
        this.addInstantFeedback(element);
    }

    openNavigation() {
        if (this.isAnimating || this.isOpen) return;

        console.log('📱 Opening mobile navigation');
        this.isAnimating = true;
        this.isOpen = true;

        // Update ARIA attributes
        this.mobileTrigger.setAttribute('aria-expanded', 'true');
        this.mobileNav.setAttribute('aria-hidden', 'false');

        // Show overlay and navigation
        this.mobileOverlay.classList.add('active');
        this.mobileNav.classList.add('active');

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';

        // Focus management
        setTimeout(() => {
            const firstFocusable = this.mobileNav.querySelector('.laylo-mobile-nav-item');
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }, 300);

        // Announce to screen readers
        if (this.announcer) {
            this.announcer.textContent = 'Navigation menu opened';
        }

        setTimeout(() => {
            this.isAnimating = false;
        }, 400);

        // Dispatch custom event
        this.dispatchEvent('opened');
    }

    closeNavigation() {
        if (this.isAnimating || !this.isOpen) return;

        console.log('📱 Closing mobile navigation');
        this.isAnimating = true;
        this.isOpen = false;

        // Update ARIA attributes
        this.mobileTrigger.setAttribute('aria-expanded', 'false');
        this.mobileNav.setAttribute('aria-hidden', 'true');

        // Hide overlay and navigation
        this.mobileOverlay.classList.remove('active');
        this.mobileNav.classList.remove('active');

        // Restore body scroll
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';

        // Return focus to trigger button
        this.mobileTrigger.focus();

        // Announce to screen readers
        if (this.announcer) {
            this.announcer.textContent = 'Navigation menu closed';
        }

        setTimeout(() => {
            this.isAnimating = false;
        }, 400);

        // Dispatch custom event
        this.dispatchEvent('closed');
    }

    dispatchEvent(action) {
        const event = new CustomEvent('mobileNavigationChange', {
            detail: {
                action: action,
                isOpen: this.isOpen
            }
        });
        document.dispatchEvent(event);
    }

    // Public API
    isNavigationOpen() {
        return this.isOpen;
    }

    forceClose() {
        this.closeNavigation();
    }

    forceOpen() {
        this.openNavigation();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.mobileNavigationManager = new MobileNavigationManager();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.mobileNavigationManager) {
        window.mobileNavigationManager.forceClose();
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileNavigationManager;
}