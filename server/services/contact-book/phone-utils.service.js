/**
 * Phone Number Utilities Service
 * Handles phone number normalization, validation, and formatting
 */

class PhoneUtilsService {
    constructor() {
        // Common country codes and their patterns
        this.countryPatterns = {
            'US': /^(\+1)?[2-9]\d{2}[2-9]\d{2}\d{4}$/,
            'CA': /^(\+1)?[2-9]\d{2}[2-9]\d{2}\d{4}$/,
            'UK': /^(\+44)?[1-9]\d{8,9}$/,
            'AU': /^(\+61)?[2-9]\d{8}$/,
            'DE': /^(\+49)?[1-9]\d{10,11}$/,
            'FR': /^(\+33)?[1-9]\d{8}$/,
            'IN': /^(\+91)?[6-9]\d{9}$/,
            'BR': /^(\+55)?[1-9]\d{10}$/,
            'MX': /^(\+52)?[1-9]\d{9}$/,
            'JP': /^(\+81)?[7-9]\d{9}$/
        };
    }

    /**
     * Normalize phone number by removing all non-digit characters except +
     */
    normalizePhone(phone) {
        if (!phone || typeof phone !== 'string') {
            return null;
        }

        // Remove all characters except digits and +
        let normalized = phone.replace(/[^0-9+]/g, '');

        // Handle common formatting issues
        if (normalized.startsWith('00')) {
            // Replace 00 with + for international format
            normalized = '+' + normalized.substring(2);
        }

        // Remove leading + if it's not followed by digits
        if (normalized === '+' || normalized.match(/^\+[^0-9]/)) {
            normalized = normalized.substring(1);
        }

        // Ensure we have at least some digits
        if (normalized.length < 7) {
            return null;
        }

        return normalized;
    }

    /**
     * Validate phone number format
     */
    isValidPhone(phone) {
        const normalized = this.normalizePhone(phone);
        if (!normalized) {
            return false;
        }

        // Basic validation: should be between 7 and 15 digits (ITU-T E.164 standard)
        const digitsOnly = normalized.replace(/[^0-9]/g, '');
        if (digitsOnly.length < 7 || digitsOnly.length > 15) {
            return false;
        }

        // Check against known country patterns
        for (const [country, pattern] of Object.entries(this.countryPatterns)) {
            if (pattern.test(normalized)) {
                return true;
            }
        }

        // If no specific pattern matches, use general validation
        // Must start with + and country code, or be a valid local number
        return /^(\+[1-9]\d{1,14}|[2-9]\d{6,14})$/.test(normalized);
    }

    /**
     * Format phone number for display
     */
    formatPhone(phone, country = 'US') {
        const normalized = this.normalizePhone(phone);
        if (!normalized) {
            return phone; // Return original if can't normalize
        }

        // Remove + for formatting
        const digitsOnly = normalized.replace(/[^0-9]/g, '');

        // Format based on country
        switch (country) {
            case 'US':
            case 'CA':
                if (digitsOnly.length === 10) {
                    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
                } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
                    return `+1 (${digitsOnly.slice(1, 4)}) ${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`;
                }
                break;
            case 'UK':
                if (digitsOnly.length === 10) {
                    return `${digitsOnly.slice(0, 4)} ${digitsOnly.slice(4, 7)} ${digitsOnly.slice(7)}`;
                } else if (digitsOnly.length === 12 && digitsOnly.startsWith('44')) {
                    return `+44 ${digitsOnly.slice(2, 6)} ${digitsOnly.slice(6, 9)} ${digitsOnly.slice(9)}`;
                }
                break;
            default:
                // International format
                if (normalized.startsWith('+')) {
                    return normalized;
                } else if (digitsOnly.length > 10) {
                    return `+${digitsOnly}`;
                }
        }

        // Fallback formatting
        if (digitsOnly.length >= 10) {
            return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
        }

        return normalized;
    }

    /**
     * Get country code from phone number
     */
    getCountryCode(phone) {
        const normalized = this.normalizePhone(phone);
        if (!normalized || !normalized.startsWith('+')) {
            return null;
        }

        // Common country codes
        const countryCodes = {
            '+1': ['US', 'CA'],
            '+44': ['UK'],
            '+49': ['DE'],
            '+33': ['FR'],
            '+61': ['AU'],
            '+91': ['IN'],
            '+55': ['BR'],
            '+52': ['MX'],
            '+81': ['JP'],
            '+86': ['CN'],
            '+7': ['RU'],
            '+39': ['IT'],
            '+34': ['ES'],
            '+31': ['NL'],
            '+46': ['SE'],
            '+47': ['NO'],
            '+45': ['DK'],
            '+41': ['CH'],
            '+43': ['AT'],
            '+32': ['BE']
        };

        // Check for exact matches first
        for (const [code, countries] of Object.entries(countryCodes)) {
            if (normalized.startsWith(code)) {
                return { code, countries };
            }
        }

        // Extract potential country code (1-4 digits after +)
        const match = normalized.match(/^\+(\d{1,4})/);
        if (match) {
            return { code: `+${match[1]}`, countries: ['Unknown'] };
        }

        return null;
    }

    /**
     * Compare two phone numbers for equality
     */
    phoneEquals(phone1, phone2) {
        const norm1 = this.normalizePhone(phone1);
        const norm2 = this.normalizePhone(phone2);

        if (!norm1 || !norm2) {
            return false;
        }

        // Remove + and compare digits only
        const digits1 = norm1.replace(/[^0-9]/g, '');
        const digits2 = norm2.replace(/[^0-9]/g, '');

        // Handle cases where one has country code and other doesn't
        if (digits1.length !== digits2.length) {
            // Try removing common country codes
            const withoutUS1 = digits1.startsWith('1') ? digits1.substring(1) : digits1;
            const withoutUS2 = digits2.startsWith('1') ? digits2.substring(1) : digits2;

            if (withoutUS1 === withoutUS2 && withoutUS1.length >= 10) {
                return true;
            }
        }

        return digits1 === digits2;
    }

    /**
     * Generate contact identifier (phone-first, email fallback)
     */
    generateContactId(phone, email) {
        const normalizedPhone = this.normalizePhone(phone);
        
        if (normalizedPhone && this.isValidPhone(normalizedPhone)) {
            return {
                type: 'phone',
                value: normalizedPhone,
                display: this.formatPhone(normalizedPhone)
            };
        }

        if (email && this.isValidEmail(email)) {
            return {
                type: 'email',
                value: email.toLowerCase().trim(),
                display: email.toLowerCase().trim()
            };
        }

        return null;
    }

    /**
     * Validate email address
     */
    isValidEmail(email) {
        if (!email || typeof email !== 'string') {
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
    }

    /**
     * Extract phone numbers from text
     */
    extractPhones(text) {
        if (!text || typeof text !== 'string') {
            return [];
        }

        // Common phone number patterns
        const patterns = [
            /\+?[1-9]\d{1,14}/g, // International format
            /\(\d{3}\)\s*\d{3}-\d{4}/g, // US format (123) 456-7890
            /\d{3}-\d{3}-\d{4}/g, // US format 123-456-7890
            /\d{3}\.\d{3}\.\d{4}/g, // US format 123.456.7890
            /\d{10,}/g // 10+ consecutive digits
        ];

        const found = new Set();

        for (const pattern of patterns) {
            const matches = text.match(pattern) || [];
            matches.forEach(match => {
                const normalized = this.normalizePhone(match);
                if (normalized && this.isValidPhone(normalized)) {
                    found.add(normalized);
                }
            });
        }

        return Array.from(found);
    }

    /**
     * Get phone number type (mobile, landline, etc.)
     */
    getPhoneType(phone) {
        const normalized = this.normalizePhone(phone);
        if (!normalized) {
            return 'unknown';
        }

        const digitsOnly = normalized.replace(/[^0-9]/g, '');

        // US/Canada mobile patterns
        if (digitsOnly.length === 10 || (digitsOnly.length === 11 && digitsOnly.startsWith('1'))) {
            const areaCode = digitsOnly.length === 11 ? digitsOnly.substring(1, 4) : digitsOnly.substring(0, 3);
            
            // Common US mobile area codes (partial list)
            const mobileAreaCodes = ['201', '202', '203', '212', '213', '214', '215', '216', '217', '218'];
            if (mobileAreaCodes.includes(areaCode)) {
                return 'mobile';
            }
        }

        // Default to unknown since we can't reliably determine without carrier lookup
        return 'unknown';
    }
}

module.exports = new PhoneUtilsService();
