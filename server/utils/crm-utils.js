const crypto = require('crypto');
const { parsePhoneNumber, isValidPhoneNumber } = require('libphonenumber-js');

/**
 * 🛠️ CRM UTILITY FUNCTIONS
 * 
 * FEATURES:
 * - Phone number normalization (E.164 format)
 * - Email validation and normalization
 * - UUID generation
 * - Data quality scoring
 * - GDPR compliance helpers
 * - Encryption utilities
 */

/**
 * Normalize phone number to E.164 format
 * @param {string} phoneNumber - Raw phone number
 * @param {string} defaultCountry - Default country code (ISO 2-letter)
 * @returns {string|null} - Normalized phone number or null if invalid
 */
function normalizePhoneNumber(phoneNumber, defaultCountry = 'US') {
    try {
        if (!phoneNumber) return null;
        
        // Remove all non-digit characters except +
        const cleaned = phoneNumber.replace(/[^\d+]/g, '');
        
        // Parse and validate phone number
        const parsed = parsePhoneNumber(cleaned, defaultCountry);
        
        if (parsed && parsed.isValid()) {
            return parsed.format('E.164');
        }
        
        return null;
    } catch (error) {
        console.warn('📱 Phone number normalization failed:', phoneNumber, error.message);
        return null;
    }
}

/**
 * Validate phone number
 * @param {string} phoneNumber - Phone number to validate
 * @param {string} defaultCountry - Default country code
 * @returns {boolean} - True if valid
 */
function validatePhoneNumber(phoneNumber, defaultCountry = 'US') {
    try {
        if (!phoneNumber) return false;
        return isValidPhoneNumber(phoneNumber, defaultCountry);
    } catch (error) {
        return false;
    }
}

/**
 * Validate and normalize email address
 * @param {string} email - Email address to validate
 * @returns {string|null} - Normalized email or null if invalid
 */
function validateEmail(email) {
    if (!email) return null;
    
    // Basic email regex (RFC 5322 compliant)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    const normalizedEmail = email.toLowerCase().trim();
    
    if (emailRegex.test(normalizedEmail)) {
        return normalizedEmail;
    }
    
    return null;
}

/**
 * Generate UUID v4
 * @returns {string} - UUID string
 */
function generateUUID() {
    return crypto.randomUUID();
}

/**
 * Generate secure random token
 * @param {number} length - Token length in bytes
 * @returns {string} - Hex token
 */
function generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash sensitive data (one-way)
 * @param {string} data - Data to hash
 * @param {string} salt - Optional salt
 * @returns {string} - Hashed data
 */
function hashData(data, salt = '') {
    return crypto.createHash('sha256').update(data + salt).digest('hex');
}

/**
 * Encrypt sensitive data (reversible)
 * @param {string} text - Text to encrypt
 * @param {string} key - Encryption key
 * @returns {string} - Encrypted text
 */
function encryptData(text, key) {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt sensitive data
 * @param {string} encryptedText - Encrypted text
 * @param {string} key - Decryption key
 * @returns {string} - Decrypted text
 */
function decryptData(encryptedText, key) {
    const algorithm = 'aes-256-gcm';
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

/**
 * Anonymize email for GDPR compliance
 * @param {string} email - Email to anonymize
 * @returns {string} - Anonymized email
 */
function anonymizeEmail(email) {
    if (!email) return null;
    
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return 'anonymized@example.com';
    
    // Keep first and last character, replace middle with asterisks
    const anonymizedLocal = localPart.length > 2 
        ? localPart[0] + '*'.repeat(localPart.length - 2) + localPart[localPart.length - 1]
        : '*'.repeat(localPart.length);
    
    return `${anonymizedLocal}@${domain}`;
}

/**
 * Anonymize phone number for GDPR compliance
 * @param {string} phone - Phone number to anonymize
 * @returns {string} - Anonymized phone number
 */
function anonymizePhone(phone) {
    if (!phone) return null;
    
    // Keep country code and last 2 digits, replace middle with asterisks
    if (phone.length > 6) {
        const countryCode = phone.substring(0, 3);
        const lastDigits = phone.substring(phone.length - 2);
        const middleLength = phone.length - 5;
        
        return `${countryCode}${'*'.repeat(middleLength)}${lastDigits}`;
    }
    
    return '*'.repeat(phone.length);
}

/**
 * Extract country from phone number
 * @param {string} phoneNumber - Phone number in E.164 format
 * @returns {string|null} - ISO country code
 */
function extractCountryFromPhone(phoneNumber) {
    try {
        if (!phoneNumber) return null;
        
        const parsed = parsePhoneNumber(phoneNumber);
        return parsed ? parsed.country : null;
    } catch (error) {
        return null;
    }
}

/**
 * Calculate data completeness score
 * @param {Object} contactData - Contact data object
 * @returns {number} - Completeness score (0-100)
 */
function calculateCompletenessScore(contactData) {
    const fields = [
        'email', 'phone', 'first_name', 'last_name', 
        'company', 'job_title', 'country', 'city'
    ];
    
    const completedFields = fields.filter(field => 
        contactData[field] && contactData[field].toString().trim().length > 0
    );
    
    return Math.round((completedFields.length / fields.length) * 100);
}

/**
 * Validate GDPR consent
 * @param {Object} consentData - Consent data
 * @returns {boolean} - True if consent is valid
 */
function validateGDPRConsent(consentData) {
    const required = ['consent_date', 'consent_source', 'email_opt_in'];
    
    return required.every(field => 
        consentData[field] !== undefined && consentData[field] !== null
    );
}

/**
 * Generate opt-out token for unsubscribe links
 * @param {string} contactId - Contact ID
 * @param {string} campaignId - Campaign ID
 * @returns {string} - Secure opt-out token
 */
function generateOptOutToken(contactId, campaignId) {
    const data = `${contactId}:${campaignId}:${Date.now()}`;
    return Buffer.from(data).toString('base64url');
}

/**
 * Parse opt-out token
 * @param {string} token - Opt-out token
 * @returns {Object|null} - Parsed token data or null if invalid
 */
function parseOptOutToken(token) {
    try {
        const decoded = Buffer.from(token, 'base64url').toString('utf8');
        const [contactId, campaignId, timestamp] = decoded.split(':');
        
        // Check if token is not older than 30 days
        const tokenAge = Date.now() - parseInt(timestamp);
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        
        if (tokenAge > maxAge) {
            return null;
        }
        
        return {
            contactId: parseInt(contactId),
            campaignId: parseInt(campaignId),
            timestamp: parseInt(timestamp)
        };
    } catch (error) {
        return null;
    }
}

/**
 * Sanitize input data
 * @param {string} input - Input string
 * @returns {string} - Sanitized string
 */
function sanitizeInput(input) {
    if (!input) return '';
    
    return input
        .toString()
        .trim()
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .substring(0, 1000); // Limit length
}

/**
 * Format currency for display
 * @param {number} amount - Amount in cents
 * @param {string} currency - Currency code
 * @returns {string} - Formatted currency
 */
function formatCurrency(amount, currency = 'USD') {
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
    });
    
    return formatter.format(amount / 100); // Convert cents to dollars
}

/**
 * Calculate time difference in human readable format
 * @param {Date} date - Date to compare
 * @returns {string} - Human readable time difference
 */
function timeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
    
    const intervals = [
        { label: 'year', seconds: 31536000 },
        { label: 'month', seconds: 2592000 },
        { label: 'week', seconds: 604800 },
        { label: 'day', seconds: 86400 },
        { label: 'hour', seconds: 3600 },
        { label: 'minute', seconds: 60 }
    ];
    
    for (const interval of intervals) {
        const count = Math.floor(diffInSeconds / interval.seconds);
        if (count >= 1) {
            return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
        }
    }
    
    return 'just now';
}

module.exports = {
    normalizePhoneNumber,
    validatePhoneNumber,
    validateEmail,
    generateUUID,
    generateSecureToken,
    hashData,
    encryptData,
    decryptData,
    anonymizeEmail,
    anonymizePhone,
    extractCountryFromPhone,
    calculateCompletenessScore,
    validateGDPRConsent,
    generateOptOutToken,
    parseOptOutToken,
    sanitizeInput,
    formatCurrency,
    timeAgo
};
