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

        // Toggle button click handler
        toggleButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleMobileNav();
        });

        // Close on outside click
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

        // Handle navigation item clicks
        const navItems = this.mobileNav.querySelectorAll('.mobile-nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                // Close nav after navigation (with slight delay for UX)
                setTimeout(() => {
                    this.closeMobileNav();
                }, 150);
            });
        });
    }

    setupTouchGestures() {
        if (!this.mobileNav) return;

        // Swipe down to close when expanded
        this.mobileNav.addEventListener('touchstart', (e) => {
            this.touchStartY = e.touches[0].clientY;
        }, { passive: true });

        this.mobileNav.addEventListener('touchend', (e) => {
            this.touchEndY = e.changedTouches[0].clientY;
            this.handleSwipeGesture();
        }, { passive: true });

        // Swipe up from bottom to open
        document.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            const isBottomArea = touch.clientY > window.innerHeight - 100;
            
            if (isBottomArea && !this.isExpanded) {
                this.touchStartY = touch.clientY;
            }
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            const touch = e.changedTouches[0];
            this.touchEndY = touch.clientY;
            
            if (!this.isExpanded && this.touchStartY > window.innerHeight - 100) {
                this.handleSwipeGesture();
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
