/**
 * 📧 EMAIL NOTIFICATION CHANNEL
 *
 * Enterprise-grade email delivery with:
 * - Multiple provider support (SendGrid, Mailgun, SMTP)
 * - Delivery tracking and webhooks
 * - Template support with HTML/text
 * - Bounce and complaint handling
 * - Rate limiting and throttling
 * - Security and authentication
 */

const nodemailer = require('nodemailer');
const env = require('../../../env');

class EmailChannel {
    constructor() {
        this.transporter = null;
        this.provider = env.EMAIL_PROVIDER || 'smtp';
        this.isEnabled = false;
        this.initializeTransporter();
    }

    /**
     * Initialize email transporter based on provider
     */
    initializeTransporter() {
        try {
            // Check if email configuration is available
            const hasMailConfig = env.MAIL_HOST && env.MAIL_USER && env.MAIL_PASSWORD;
            const hasSendGridConfig = env.SENDGRID_API_KEY;
            const hasMailgunConfig = env.MAILGUN_USERNAME && env.MAILGUN_PASSWORD;

            if (!hasMailConfig && !hasSendGridConfig && !hasMailgunConfig) {
                console.log('📧 Email channel disabled (no configuration found)');
                this.isEnabled = false;
                return;
            }

            switch (this.provider.toLowerCase()) {
                case 'sendgrid':
                    if (hasSendGridConfig) {
                        this.transporter = nodemailer.createTransporter({
                            service: 'SendGrid',
                            auth: {
                                user: 'apikey',
                                pass: env.SENDGRID_API_KEY
                            }
                        });
                        this.isEnabled = true;
                    }
                    break;

                case 'mailgun':
                    if (hasMailgunConfig) {
                        this.transporter = nodemailer.createTransporter({
                            service: 'Mailgun',
                            auth: {
                                user: env.MAILGUN_USERNAME,
                                pass: env.MAILGUN_PASSWORD
                            }
                        });
                        this.isEnabled = true;
                    }
                    break;

                case 'smtp':
                default:
                    if (hasMailConfig) {
                        this.transporter = nodemailer.createTransporter({
                            host: env.MAIL_HOST,
                            port: env.MAIL_PORT || 587,
                            secure: env.MAIL_SECURE === 'true',
                            auth: {
                                user: env.MAIL_USER,
                                pass: env.MAIL_PASSWORD
                            },
                            pool: true,
                            maxConnections: 5,
                            maxMessages: 100,
                            rateDelta: 1000,
                            rateLimit: 5
                        });
                        this.isEnabled = true;
                    }
                    break;
            }

            if (this.isEnabled) {
                console.log(`📧 Email channel initialized with ${this.provider}`);
            } else {
                console.log(`📧 Email channel disabled (${this.provider} not configured)`);
            }
        } catch (error) {
            console.error('🚨 Failed to initialize email transporter:', error);
            this.isEnabled = false;
        }
    }

    /**
     * Send email notification
     * @param {string} recipient - Email address
     * @param {Object} content - Email content
     * @param {Object} options - Delivery options
     * @returns {Promise<Object>} - Delivery result
     */
    async send(recipient, content, options = {}) {
        try {
            if (!this.isEnabled || !this.transporter) {
                throw new Error('Email service not available');
            }

            // Validate email address
            if (!this.isValidEmail(recipient)) {
                throw new Error(`Invalid email address: ${recipient}`);
            }

            // Prepare email options
            const mailOptions = {
                from: env.MAIL_FROM || env.MAIL_USER,
                to: recipient,
                subject: content.title || 'Notification from BOUNCE2BOUNCE',
                text: content.message,
                html: content.html || this.generateHtmlFromText(content.message),
                headers: {
                    'X-Notification-ID': options.notificationId,
                    'X-User-ID': options.userId,
                    'X-Category': 'notification'
                }
            };

            // Add tracking pixels and links if enabled
            if (env.EMAIL_TRACKING_ENABLED === 'true') {
                mailOptions.html = this.addTrackingToHtml(mailOptions.html, options);
            }

            // Send email
            console.log(`📧 Sending email to ${recipient}...`);
            const result = await this.transporter.sendMail(mailOptions);

            console.log(`✅ Email sent successfully - Message ID: ${result.messageId}`);

            return {
                success: true,
                externalId: result.messageId,
                provider: this.provider,
                recipient: recipient,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`🚨 Email delivery failed to ${recipient}:`, error);

            return {
                success: false,
                error: error.message,
                provider: this.provider,
                recipient: recipient,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Validate email address format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Generate HTML from plain text
     */
    generateHtmlFromText(text) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>BOUNCE2BOUNCE Notification</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .header {
                        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                        color: white;
                        padding: 20px;
                        border-radius: 8px 8px 0 0;
                        text-align: center;
                    }
                    .content {
                        background: #ffffff;
                        padding: 30px;
                        border: 1px solid #e5e7eb;
                        border-top: none;
                    }
                    .footer {
                        background: #f9fafb;
                        padding: 20px;
                        border: 1px solid #e5e7eb;
                        border-top: none;
                        border-radius: 0 0 8px 8px;
                        text-align: center;
                        font-size: 14px;
                        color: #6b7280;
                    }
                    .message {
                        white-space: pre-wrap;
                        margin: 0;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>BOUNCE2BOUNCE</h1>
                </div>
                <div class="content">
                    <p class="message">${text}</p>
                </div>
                <div class="footer">
                    <p>This email was sent by BOUNCE2BOUNCE. If you no longer wish to receive these emails, you can <a href="#">unsubscribe here</a>.</p>
                </div>
            </body>
            </html>
        `;
    }

    /**
     * Add tracking pixels and links to HTML
     */
    addTrackingToHtml(html, options) {
        // Add tracking pixel
        const trackingPixel = `<img src="${env.SITE_URL}/api/notifications/${options.notificationId}/track/open" width="1" height="1" style="display:none;" />`;

        // Insert tracking pixel before closing body tag
        html = html.replace('</body>', `${trackingPixel}</body>`);

        // Add click tracking to links (simplified implementation)
        html = html.replace(
            /<a\s+href="([^"]+)"/g,
            `<a href="${env.SITE_URL}/api/notifications/${options.notificationId}/track/click?url=$1"`
        );

        return html;
    }

    /**
     * Handle email webhooks (bounces, complaints, etc.)
     */
    async handleWebhook(webhookData) {
        try {
            const { event, email, messageId, reason } = webhookData;

            console.log(`📧 Email webhook received: ${event} for ${email}`);

            switch (event) {
                case 'delivered':
                    await this.handleDelivered(messageId, email);
                    break;
                case 'bounce':
                    await this.handleBounce(messageId, email, reason);
                    break;
                case 'complaint':
                    await this.handleComplaint(messageId, email);
                    break;
                case 'open':
                    await this.handleOpen(messageId, email);
                    break;
                case 'click':
                    await this.handleClick(messageId, email, webhookData.url);
                    break;
                default:
                    console.log(`📧 Unknown email event: ${event}`);
            }

        } catch (error) {
            console.error('🚨 Email webhook handling failed:', error);
        }
    }

    /**
     * Handle email delivered event
     */
    async handleDelivered(messageId, email) {
        // Update notification status to delivered
        // This would integrate with the notification service
        console.log(`✅ Email delivered: ${messageId} to ${email}`);
    }

    /**
     * Handle email bounce
     */
    async handleBounce(messageId, email, reason) {
        // Mark email as bounced and potentially disable the channel
        console.log(`⚠️ Email bounced: ${messageId} to ${email} - ${reason}`);
    }

    /**
     * Handle spam complaint
     */
    async handleComplaint(messageId, email) {
        // Mark email as complained and disable notifications
        console.log(`🚨 Spam complaint: ${messageId} from ${email}`);
    }

    /**
     * Handle email open tracking
     */
    async handleOpen(messageId, email) {
        // Track email open event
        console.log(`👁️ Email opened: ${messageId} by ${email}`);
    }

    /**
     * Handle email click tracking
     */
    async handleClick(messageId, email, url) {
        // Track email click event
        console.log(`🖱️ Email link clicked: ${messageId} by ${email} - ${url}`);
    }

    /**
     * Test email configuration
     */
    async testConnection() {
        try {
            if (!this.transporter) {
                throw new Error('Email transporter not initialized');
            }

            await this.transporter.verify();
            console.log('✅ Email connection test successful');
            return true;
        } catch (error) {
            console.error('🚨 Email connection test failed:', error);
            return false;
        }
    }

    /**
     * Get delivery statistics
     */
    async getStats() {
        // This would query the database for email delivery stats
        return {
            sent: 0,
            delivered: 0,
            bounced: 0,
            complained: 0,
            opened: 0,
            clicked: 0
        };
    }
}

module.exports = new EmailChannel();