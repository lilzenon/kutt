/**
 * 🧭 MODERN NAVIGATION SYSTEM
 *
 * Research-based implementation following:
 * - Mobile-first design principles
 * - Touch interaction best practices
 * - Accessibility guidelines
 * - Performance optimization
 */

class NavigationManager {
    constructor() {
        this.mobileNav = null;
        this.isExpanded = false;
        this.touchStartY = 0;
        this.touchEndY = 0;
        this.isAnimating = false;

        this.init();
    }

    init() {
        this.setupMobileNavigation();
        this.setupActiveStates();
        this.setupTouchGestures();
        this.setupKeyboardNavigation();

        console.log('🧭 Navigation Manager initialized');
    }

    setupMobileNavigation() {
        this.mobileNav = document.querySelector('.mobile-nav');
        const toggleButton = document.querySelector('.mobile-nav-toggle');

        if (!this.mobileNav || !toggleButton) {
            return; // Not on mobile or elements not found
        }

        // Toggle button click handler with modern animation
        toggleButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleMobileNav();

            // Add haptic feedback on supported devices
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        });

        // Close on outside click (but not on collapsed nav)
        document.addEventListener('click', (e) => {
            if (this.isExpanded && !this.mobileNav.contains(e.target)) {
                this.closeMobileNav();
            }
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isExpanded) {
                this.closeMobileNav();
            }
        });

        // Handle navigation item clicks in expanded state
        const navItems = this.mobileNav.querySelectorAll('.mobile-nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                // Add touch feedback
                item.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    item.style.transform = '';
                }, 100);

                // Close nav after navigation (with smooth delay)
                setTimeout(() => {
                    this.closeMobileNav();
                }, 200);
            });
        });

        // Handle tab clicks in collapsed state (no closing)
        const tabItems = this.mobileNav.querySelectorAll('.mobile-nav-tab');
        tabItems.forEach(tab => {
            tab.addEventListener('click', () => {
                // Add touch feedback
                tab.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    tab.style.transform = '';
                }, 100);
            });
        });

        // Add smooth scroll behavior
        this.setupSmoothScrolling();
    }

    setupSmoothScrolling() {
        // Add smooth scrolling to all navigation links
        const allNavLinks = document.querySelectorAll('a[href^="/"]');
        allNavLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                // Add loading state for better UX
                this.addLoadingState(link);
            });
        });
    }

    addLoadingState(element) {
        element.style.opacity = '0.7';
        element.style.transform = 'scale(0.98)';

        setTimeout(() => {
            element.style.opacity = '';
            element.style.transform = '';
        }, 300);
    }

    setupTouchGestures() {
        if (!this.mobileNav) return;

        let startY = 0;
        let currentY = 0;
        let isDragging = false;

        // Enhanced touch handling for smooth interactions
        this.mobileNav.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            currentY = startY;
            isDragging = true;

            // Add touch start feedback
            if (this.isExpanded) {
                this.mobileNav.style.transition = 'none';
            }
        }, { passive: true });

        this.mobileNav.addEventListener('touchmove', (e) => {
            if (!isDragging) return;

            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;

            // Only allow downward swipe when expanded
            if (this.isExpanded && deltaY > 0) {
                const progress = Math.min(deltaY / 200, 1);
                const opacity = 1 - (progress * 0.3);
                const scale = 1 - (progress * 0.05);

                this.mobileNav.style.opacity = opacity;
                this.mobileNav.style.transform = `scale(${scale}) translateY(${deltaY * 0.5}px)`;
            }
        }, { passive: true });

        this.mobileNav.addEventListener('touchend', (e) => {
            if (!isDragging) return;

            isDragging = false;
            const deltaY = currentY - startY;

            // Restore transition
            this.mobileNav.style.transition = '';
            this.mobileNav.style.opacity = '';
            this.mobileNav.style.transform = '';

            // Close if swiped down enough
            if (this.isExpanded && deltaY > 100) {
                this.closeMobileNav();
            }
        }, { passive: true });

        // Swipe up from bottom edge to open (when collapsed)
        document.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            const isBottomEdge = touch.clientY > window.innerHeight - 80;

            if (isBottomEdge && !this.isExpanded) {
                this.touchStartY = touch.clientY;
            }
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            const touch = e.changedTouches[0];
            const deltaY = this.touchStartY - touch.clientY;

            // Open if swiped up from bottom edge
            if (!this.isExpanded && deltaY > 50 && this.touchStartY > window.innerHeight - 80) {
                this.openMobileNav();
            }
        }, { passive: true });
    }

    handleSwipeGesture() {
        const swipeDistance = this.touchStartY - this.touchEndY;
        const minSwipeDistance = 50;

        if (Math.abs(swipeDistance) < minSwipeDistance) {
            return;
        }

        if (swipeDistance > 0 && !this.isExpanded) {
            // Swipe up to open
            this.openMobileNav();
        } else if (swipeDistance < 0 && this.isExpanded) {
            // Swipe down to close
            this.closeMobileNav();
        }
    }

    setupKeyboardNavigation() {
        // Tab navigation support
        const focusableElements = document.querySelectorAll(
            'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
        );

        focusableElements.forEach(element => {
            element.addEventListener('focus', () => {
                // Ensure focused element is visible
                this.ensureElementVisible(element);
            });
        });
    }

    setupActiveStates() {
        const currentPath = window.location.pathname;

        // Desktop navigation
        const desktopNavLinks = document.querySelectorAll('.nav-link');
        desktopNavLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && this.isActivePath(currentPath, href)) {
                link.classList.add('active');
            }
        });

        // Mobile navigation
        const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
        mobileNavItems.forEach(item => {
            const href = item.getAttribute('href');
            if (href && this.isActivePath(currentPath, href)) {
                item.classList.add('active');
            }
        });
    }

    isActivePath(currentPath, linkPath) {
        // Exact match for home
        if (linkPath === '/' || linkPath === '/dashboard') {
            return currentPath === '/' || currentPath === '/dashboard';
        }

        // Starts with for other paths
        return currentPath.startsWith(linkPath);
    }

    toggleMobileNav() {
        if (this.isAnimating) return;

        if (this.isExpanded) {
            this.closeMobileNav();
        } else {
            this.openMobileNav();
        }
    }

    openMobileNav() {
        if (this.isAnimating || this.isExpanded) return;

        this.isAnimating = true;
        this.isExpanded = true;

        this.mobileNav.classList.add('expanded');

        // Update toggle button aria-label
        const toggleButton = this.mobileNav.querySelector('.mobile-nav-toggle');
        if (toggleButton) {
            toggleButton.setAttribute('aria-label', 'Close navigation menu');
            toggleButton.setAttribute('aria-expanded', 'true');
        }

        // Focus management
        const firstFocusable = this.mobileNav.querySelector('.mobile-nav-item');
        if (firstFocusable) {
            setTimeout(() => {
                firstFocusable.focus();
            }, 300);
        }

        // Add body scroll lock
        document.body.style.overflow = 'hidden';

        setTimeout(() => {
            this.isAnimating = false;
        }, 350);

        // Dispatch event
        this.dispatchNavigationEvent('opened');
    }

    closeMobileNav() {
        if (this.isAnimating || !this.isExpanded) return;

        this.isAnimating = true;
        this.isExpanded = false;

        this.mobileNav.classList.remove('expanded');

        // Update toggle button aria-label
        const toggleButton = this.mobileNav.querySelector('.mobile-nav-toggle');
        if (toggleButton) {
            toggleButton.setAttribute('aria-label', 'Open navigation menu');
            toggleButton.setAttribute('aria-expanded', 'false');
        }

        // Remove body scroll lock
        document.body.style.overflow = '';

        setTimeout(() => {
            this.isAnimating = false;
        }, 350);

        // Dispatch event
        this.dispatchNavigationEvent('closed');
    }

    ensureElementVisible(element) {
        // Scroll element into view if needed
        if (element.scrollIntoViewIfNeeded) {
            element.scrollIntoViewIfNeeded();
        } else {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
    }

    dispatchNavigationEvent(action) {
        const event = new CustomEvent('navigationchange', {
            detail: {
                action: action,
                isExpanded: this.isExpanded
            }
        });

        document.dispatchEvent(event);
    }

    // Public API methods
    isNavigationExpanded() {
        return this.isExpanded;
    }

    closeNavigation() {
        this.closeMobileNav();
    }

    openNavigation() {
        this.openMobileNav();
    }
}

// Initialize navigation manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.navigationManager = new NavigationManager();
});

// Handle page navigation updates
window.addEventListener('popstate', () => {
    if (window.navigationManager) {
        window.navigationManager.setupActiveStates();
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationManager;
}