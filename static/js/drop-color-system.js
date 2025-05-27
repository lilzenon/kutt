/**
 * MODULAR DROP COLOR SYSTEM
 * Future-proof color management for drops
 */

class DropColorSystem {
    constructor(container) {
        this.container = container;
        this.colors = {
            background: '#ffffff',
            card: '#ffffff',
            title: '#000000',
            description: '#666666',
            button: '#007bff'
        };
    }

    /**
     * Calculate contrast color for text on colored backgrounds
     */
    getContrastColor(hexColor) {
        // Remove # if present
        const color = hexColor.replace('#', '');
        
        // Convert to RGB
        const r = parseInt(color.substr(0, 2), 16);
        const g = parseInt(color.substr(2, 2), 16);
        const b = parseInt(color.substr(4, 2), 16);
        
        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        // Return white for dark colors, black for light colors
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    /**
     * Apply all colors to the container using CSS custom properties
     */
    applyColors() {
        if (!this.container) return;

        // Calculate button text color
        const buttonTextColor = this.getContrastColor(this.colors.button);

        // Apply CSS custom properties
        this.container.style.setProperty('--drop-background-color', this.colors.background);
        this.container.style.setProperty('--drop-card-color', this.colors.card);
        this.container.style.setProperty('--drop-title-color', this.colors.title);
        this.container.style.setProperty('--drop-description-color', this.colors.description);
        this.container.style.setProperty('--drop-button-color', this.colors.button);
        this.container.style.setProperty('--drop-button-text-color', buttonTextColor);

        console.log('Applied colors:', this.colors);
    }

    /**
     * Update a specific color
     */
    setColor(type, value) {
        if (this.colors.hasOwnProperty(type)) {
            this.colors[type] = value;
            this.applyColors();
        }
    }

    /**
     * Update multiple colors at once
     */
    setColors(colorObject) {
        Object.assign(this.colors, colorObject);
        this.applyColors();
    }

    /**
     * Get current colors
     */
    getColors() {
        return { ...this.colors };
    }

    /**
     * Initialize colors from form inputs
     */
    initializeFromInputs(inputs) {
        const colorMap = {
            background: inputs.background,
            card: inputs.card,
            title: inputs.title,
            description: inputs.description,
            button: inputs.button
        };

        Object.keys(colorMap).forEach(key => {
            if (colorMap[key] && colorMap[key].value) {
                this.colors[key] = colorMap[key].value;
            }
        });

        this.applyColors();
    }

    /**
     * Set up event listeners for form inputs
     */
    bindToInputs(inputs) {
        const inputMap = {
            background: inputs.background,
            card: inputs.card,
            title: inputs.title,
            description: inputs.description,
            button: inputs.button
        };

        Object.keys(inputMap).forEach(key => {
            if (inputMap[key]) {
                inputMap[key].addEventListener('input', (e) => {
                    this.setColor(key, e.target.value);
                });
            }
        });
    }

    /**
     * Apply device-specific styling
     */
    applyDeviceSpecificStyling(deviceType) {
        if (!this.container) return;

        const wrapper = this.container.querySelector('.drop-page-wrapper') || this.container;
        const container = this.container.querySelector('.drop-container') || this.container;

        // Remove existing device classes
        wrapper.classList.remove('mobile-device', 'desktop-device');
        container.classList.remove('mobile-layout', 'desktop-layout');

        // Add device-specific classes
        wrapper.classList.add(`${deviceType}-device`);
        container.classList.add(`${deviceType}-layout`);

        console.log(`Applied ${deviceType} styling`);
    }

    /**
     * Create a complete drop structure with proper classes
     */
    static createDropStructure() {
        return `
            <div class="drop-page-wrapper">
                <div class="drop-container">
                    <header class="drop-header">
                        <div class="drop-brand">
                            <a href="/" class="brand-link">
                                <img src="/images/logo.png" alt="BOUNCE2BOUNCE" class="brand-logo">
                                <span class="brand-text">BOUNCE2BOUNCE</span>
                            </a>
                        </div>
                    </header>
                    
                    <main class="drop-main">
                        <div class="drop-content">
                            <div class="drop-cover-image" style="display: none;">
                                <img src="" alt="" loading="lazy">
                            </div>
                            
                            <div class="drop-info">
                                <h1 class="drop-title">Drop Title</h1>
                                <div class="drop-description">
                                    <p>Drop description</p>
                                </div>
                                <div class="drop-stats">
                                    <span class="signup-count">42 people signed up</span>
                                </div>
                            </div>
                            
                            <div class="drop-signup-section">
                                <form class="signup-form">
                                    <div class="form-group">
                                        <input type="email" placeholder="Enter your email" readonly class="form-input">
                                    </div>
                                    <div class="form-group">
                                        <input type="text" placeholder="Your name (optional)" readonly class="form-input">
                                    </div>
                                    <button type="button" class="signup-button">
                                        <span class="button-text">Get Notified</span>
                                    </button>
                                </form>
                            </div>
                        </div>
                    </main>
                    
                    <footer class="drop-footer">
                        <p>Powered by <a href="/" class="footer-link">BOUNCE2BOUNCE</a></p>
                    </footer>
                </div>
            </div>
        `;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DropColorSystem;
} else {
    window.DropColorSystem = DropColorSystem;
}
