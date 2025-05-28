/**
 * 🎨 MODERN THEME MANAGEMENT SYSTEM
 * 
 * Research-based implementation following:
 * - Web API best practices
 * - Accessibility guidelines
 * - Performance optimization
 * - User preference persistence
 */

class ThemeManager {
    constructor() {
        this.themes = ['light', 'dark', 'auto'];
        this.currentTheme = this.getStoredTheme() || 'auto';
        this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        this.init();
    }

    init() {
        // Apply initial theme
        this.applyTheme(this.currentTheme);
        
        // Listen for system theme changes
        this.mediaQuery.addEventListener('change', () => {
            if (this.currentTheme === 'auto') {
                this.updateDocumentTheme();
            }
        });
        
        // Initialize theme toggle buttons
        this.initializeToggles();
        
        console.log('🎨 Theme Manager initialized:', this.currentTheme);
    }

    getStoredTheme() {
        try {
            return localStorage.getItem('theme');
        } catch (error) {
            console.warn('Failed to get stored theme:', error);
            return null;
        }
    }

    setStoredTheme(theme) {
        try {
            localStorage.setItem('theme', theme);
        } catch (error) {
            console.warn('Failed to store theme:', error);
        }
    }

    getSystemTheme() {
        return this.mediaQuery.matches ? 'dark' : 'light';
    }

    getEffectiveTheme() {
        if (this.currentTheme === 'auto') {
            return this.getSystemTheme();
        }
        return this.currentTheme;
    }

    updateDocumentTheme() {
        const effectiveTheme = this.getEffectiveTheme();
        
        // Update document attribute
        if (effectiveTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        
        // Update meta theme-color for mobile browsers
        this.updateMetaThemeColor(effectiveTheme);
        
        // Dispatch theme change event
        this.dispatchThemeChangeEvent(effectiveTheme);
    }

    updateMetaThemeColor(theme) {
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.name = 'theme-color';
            document.head.appendChild(metaThemeColor);
        }
        
        // Set theme color based on current theme
        const colors = {
            light: '#ffffff',
            dark: '#1e293b'
        };
        
        metaThemeColor.content = colors[theme] || colors.light;
    }

    dispatchThemeChangeEvent(effectiveTheme) {
        const event = new CustomEvent('themechange', {
            detail: {
                theme: this.currentTheme,
                effectiveTheme: effectiveTheme
            }
        });
        
        document.dispatchEvent(event);
    }

    applyTheme(theme) {
        this.currentTheme = theme;
        this.setStoredTheme(theme);
        this.updateDocumentTheme();
        this.updateToggleButtons();
        
        console.log('🎨 Theme applied:', theme, '(effective:', this.getEffectiveTheme(), ')');
    }

    toggleTheme() {
        const currentIndex = this.themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % this.themes.length;
        const nextTheme = this.themes[nextIndex];
        
        this.applyTheme(nextTheme);
    }

    setTheme(theme) {
        if (this.themes.includes(theme)) {
            this.applyTheme(theme);
        } else {
            console.warn('Invalid theme:', theme);
        }
    }

    initializeToggles() {
        // Initialize all theme toggle buttons
        const toggleButtons = document.querySelectorAll('[data-theme-toggle]');
        
        toggleButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.toggleTheme();
            });
        });
        
        // Initialize theme selector dropdowns
        const themeSelectors = document.querySelectorAll('[data-theme-selector]');
        
        themeSelectors.forEach(selector => {
            selector.addEventListener('change', (e) => {
                this.setTheme(e.target.value);
            });
            
            // Set initial value
            selector.value = this.currentTheme;
        });
    }

    updateToggleButtons() {
        const toggleButtons = document.querySelectorAll('[data-theme-toggle]');
        const effectiveTheme = this.getEffectiveTheme();
        
        toggleButtons.forEach(button => {
            // Update button text and icon
            const icon = button.querySelector('.theme-icon');
            const text = button.querySelector('.theme-text');
            
            if (icon) {
                icon.textContent = this.getThemeIcon(this.currentTheme);
            }
            
            if (text) {
                text.textContent = this.getThemeText(this.currentTheme);
            }
            
            // Update aria-label for accessibility
            button.setAttribute('aria-label', `Switch to ${this.getNextTheme()} theme`);
        });
        
        // Update theme selectors
        const themeSelectors = document.querySelectorAll('[data-theme-selector]');
        themeSelectors.forEach(selector => {
            selector.value = this.currentTheme;
        });
    }

    getThemeIcon(theme) {
        const icons = {
            light: '☀️',
            dark: '🌙',
            auto: '🔄'
        };
        return icons[theme] || icons.auto;
    }

    getThemeText(theme) {
        const texts = {
            light: 'Light',
            dark: 'Dark',
            auto: 'Auto'
        };
        return texts[theme] || texts.auto;
    }

    getNextTheme() {
        const currentIndex = this.themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % this.themes.length;
        return this.themes[nextIndex];
    }

    // Public API methods
    getCurrentTheme() {
        return this.currentTheme;
    }

    getEffectiveThemePublic() {
        return this.getEffectiveTheme();
    }

    isSystemDarkMode() {
        return this.mediaQuery.matches;
    }
}

// Initialize theme manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}
