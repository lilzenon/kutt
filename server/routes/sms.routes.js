/**
 * 📱 SMS WEBHOOK ROUTES
 *
 * Handles Twilio webhooks for:
 * - Message status updates (delivered, failed, etc.)
 * - Incoming SMS messages (opt-out handling)
 * - Delivery receipts and error handling
 *
 * Security: All webhooks are validated using Twilio signature verification
 */

const express = require('express');
const router = express.Router();
const twilioService = require('../services/sms/twilio.service');
const campaignService = require('../services/sms/campaign.service');
const env = require('../env');

/**
 * Handle incoming SMS messages (for opt-out processing)
 */
router.post('/webhook/incoming', async(req, res) => {
    try {
        // Validate webhook signature for security
        const signature = req.headers['x-twilio-signature'];
        const url = `${env.SITE_URL}${req.originalUrl}`;

        if (!twilioService.validateWebhookSignature(signature, url, req.body)) {
            console.warn('🚨 Invalid webhook signature');
            return res.status(403).send('Forbidden');
        }

        const { From: phoneNumber, Body: messageBody } = req.body;

        console.log(`📱 Incoming SMS from ${phoneNumber}: ${messageBody}`);

        // Check for opt-out keywords
        const optOutKeywords = env.SMS_OPT_OUT_KEYWORDS.split(',');
        const isOptOut = optOutKeywords.some(keyword =>
            messageBody.toUpperCase().trim().includes(keyword.trim())
        );

        if (isOptOut) {
            console.log(`📱 Processing opt-out request from ${phoneNumber}`);
            await twilioService.handleOptOut(phoneNumber);

            // TODO: Add phone number to opt-out list in database
            // await addToOptOutList(phoneNumber);
        }

        // Respond with TwiML (required by Twilio)
        res.type('text/xml');
        res.send(`<?xml version="1.0" encoding="UTF-8"?>
                  <Response></Response>`);

    } catch (error) {
        console.error('🚨 Error processing incoming SMS:', error);
        res.status(500).send('Internal Server Error');
    }
});

/**
 * Handle SMS status updates (delivery receipts)
 */
router.post('/webhook/status', async(req, res) => {
    try {
        // Validate webhook signature
        const signature = req.headers['x-twilio-signature'];
        const url = `${env.SITE_URL}${req.originalUrl}`;

        if (!twilioService.validateWebhookSignature(signature, url, req.body)) {
            console.warn('🚨 Invalid webhook signature for status update');
            return res.status(403).send('Forbidden');
        }

        const {
            MessageSid: messageSid,
            MessageStatus: status,
            To: phoneNumber,
            ErrorCode: errorCode,
            ErrorMessage: errorMessage
        } = req.body;

        console.log(`📱 SMS Status Update - SID: ${messageSid}, Status: ${status}, To: ${phoneNumber}`);

        // Update message status in database
        const updated = await twilioService.updateSMSStatus(messageSid, status, errorCode, errorMessage);

        // Log delivery status
        if (status === 'delivered') {
            console.log(`✅ SMS delivered successfully to ${phoneNumber}`);
        } else if (status === 'failed' || status === 'undelivered') {
            console.error(`❌ SMS failed to ${phoneNumber} - Error: ${errorCode} ${errorMessage}`);
        }

        if (updated) {
            console.log(`📊 Database updated for message ${messageSid}`);
        }

        res.status(200).send('OK');

    } catch (error) {
        console.error('🚨 Error processing SMS status update:', error);
        res.status(500).send('Internal Server Error');
    }
});

/**
 * Test SMS endpoint (for development/testing)
 */
router.post('/test', async(req, res) => {
    try {
        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                error: 'Phone number is required'
            });
        }

        const result = await twilioService.testSMS(phoneNumber);

        res.json(result);

    } catch (error) {
        console.error('🚨 Error sending test SMS:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Send drop announcement to all subscribers
 */
router.post('/announce-drop', async(req, res) => {
    try {
        const { dropId, dropTitle, dropSlug, scheduledAt, segmentId } = req.body;

        if (!dropId || !dropTitle || !dropSlug) {
            return res.status(400).json({
                success: false,
                error: 'Drop ID, title, and slug are required'
            });
        }

        const dropInfo = {
            id: dropId,
            title: dropTitle,
            slug: dropSlug
        };

        const options = {};
        if (scheduledAt) options.scheduledAt = new Date(scheduledAt);
        if (segmentId) options.segmentId = segmentId;

        console.log(`📱 Starting drop announcement campaign for: ${dropTitle}`);

        const result = await campaignService.sendDropAnnouncement(dropInfo, options);

        if (result.success) {
            res.json({
                success: true,
                message: `Drop announcement sent to ${result.totalSent} subscribers`,
                campaignId: result.campaignId,
                totalSent: result.totalSent,
                totalFailed: result.totalFailed
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }

    } catch (error) {
        console.error('🚨 Error sending drop announcement:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get campaign analytics
 */
router.get('/campaign/:campaignId/analytics', async(req, res) => {
    try {
        const { campaignId } = req.params;

        const analytics = await campaignService.getCampaignAnalytics(campaignId);

        if (analytics) {
            res.json(analytics);
        } else {
            res.status(404).json({
                success: false,
                error: 'Campaign not found or analytics unavailable'
            });
        }

    } catch (error) {
        console.error('🚨 Error getting campaign analytics:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get SMS analytics for a drop
 */
router.get('/analytics/:dropId', async(req, res) => {
    try {
        const { dropId } = req.params;

        const analytics = await twilioService.getDropSMSAnalytics(dropId);

        if (analytics) {
            res.json({
                success: true,
                analytics: analytics
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Analytics not available for this drop'
            });
        }

    } catch (error) {
        console.error('🚨 Error getting SMS analytics:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get SMS service status
 */
router.get('/status', (req, res) => {
    try {
        const status = twilioService.getStatus();
        res.json(status);
    } catch (error) {
        console.error('🚨 Error getting SMS status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;