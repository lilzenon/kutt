/**
 * 📱 COMPREHENSIVE MOBILE NAVIGATION SYSTEM
 *
 * Research-based mobile navigation implementation
 * Following 2024 mobile UX best practices
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

        this.init();
    }

    init() {
        this.setupElements();
        this.setupEventListeners();
        this.setupTouchGestures();
        this.setupKeyboardNavigation();
        this.setupAccessibility();

        console.log('📱 Mobile Navigation Manager initialized');
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

    setupEventListeners() {
        if (!this.mobileTrigger) return;

        // Track if we've handled a touch event to prevent duplicate events
        let touchHandled = false;

        // Mobile trigger button - comprehensive touch handling
        this.mobileTrigger.addEventListener('touchstart', (e) => {
            console.log('📱 Mobile trigger touchstart');
            e.preventDefault();
            e.stopPropagation();
            touchHandled = true;
            this.addTouchFeedback(this.mobileTrigger);
        }, { passive: false });

        this.mobileTrigger.addEventListener('touchend', (e) => {
            console.log('📱 Mobile trigger touchend');
            e.preventDefault();
            e.stopPropagation();
            if (touchHandled) {
                this.toggleNavigation();
                touchHandled = false;
                // Reset touch handled after a delay to allow click events on desktop
                setTimeout(() => {
                    touchHandled = false;
                }, 300);
            }
        }, { passive: false });

        // Fallback click handler for desktop and devices that don't support touch
        this.mobileTrigger.addEventListener('click', (e) => {
            console.log('📱 Mobile trigger click, touchHandled:', touchHandled);
            if (!touchHandled) {
                e.preventDefault();
                e.stopPropagation();
                this.toggleNavigation();
            }
        });

        // Pointer events for modern browsers
        this.mobileTrigger.addEventListener('pointerdown', (e) => {
            console.log('📱 Mobile trigger pointerdown');
            if (e.pointerType === 'touch') {
                this.addTouchFeedback(this.mobileTrigger);
            }
        });

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

    addTouchFeedback(element) {
        // Visual feedback for touch interactions
        element.style.transform = 'scale(0.95)';
        element.style.opacity = '0.8';

        setTimeout(() => {
            element.style.transform = '';
            element.style.opacity = '';
        }, 150);

        // Haptic feedback on supported devices
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }

    toggleNavigation() {
        if (this.isAnimating) return;

        if (this.isOpen) {
            this.closeNavigation();
        } else {
            this.openNavigation();
        }
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