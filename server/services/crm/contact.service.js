const { crmDb } = require("../../config/crm-database");
const { normalizePhoneNumber, validateEmail, generateUUID } = require("../../utils/crm-utils");
const eventService = require("./event.service");

/**
 * 🎯 CONTACT SERVICE - CORE CRM OPERATIONS
 * 
 * FEATURES:
 * - Contact creation and deduplication
 * - GDPR-compliant data management
 * - Phone number normalization (E.164)
 * - Email validation and verification
 * - Lifecycle stage management
 * - Consent tracking and opt-in/opt-out
 * - Data quality scoring
 * - Merge and duplicate handling
 */

class ContactService {
    /**
     * Create or update contact from drop signup
     */
    async createFromDropSignup(dropSignupData, dropId) {
        try {
            const contactData = {
                email: dropSignupData.email?.toLowerCase().trim(),
                phone: dropSignupData.phone ? normalizePhoneNumber(dropSignupData.phone) : null,
                first_name: dropSignupData.name ? this.extractFirstName(dropSignupData.name) : null,
                last_name: dropSignupData.name ? this.extractLastName(dropSignupData.name) : null,
                full_name: dropSignupData.name?.trim(),
                source: 'drop',
                source_drop_id: dropId,
                ip_address: dropSignupData.ip_address,
                user_agent: dropSignupData.user_agent,
                lifecycle_stage: 'subscriber',
                lead_status: 'new',
                email_opt_in: !!dropSignupData.email,
                sms_opt_in: !!dropSignupData.phone,
                email_opt_in_date: dropSignupData.email ? new Date() : null,
                sms_opt_in_date: dropSignupData.phone ? new Date() : null,
                gdpr_consent_date: new Date(),
                gdpr_consent_source: `drop_${dropId}`,
                is_active: true
            };

            // Check for existing contact
            const existingContact = await this.findExistingContact(contactData.email, contactData.phone);
            
            if (existingContact) {
                // Update existing contact
                return await this.updateContact(existingContact.id, contactData);
            } else {
                // Create new contact
                return await this.createContact(contactData);
            }
        } catch (error) {
            console.error("🚨 Error creating contact from drop signup:", error);
            throw error;
        }
    }

    /**
     * Create new contact
     */
    async createContact(contactData) {
        try {
            // Validate required data
            if (!contactData.email && !contactData.phone) {
                throw new Error("Contact must have either email or phone number");
            }

            // Validate email if provided
            if (contactData.email && !validateEmail(contactData.email)) {
                throw new Error("Invalid email address");
            }

            // Generate UUID
            contactData.uuid = generateUUID();
            
            // Calculate data quality score
            contactData.data_quality_score = this.calculateDataQualityScore(contactData);
            
            // Set timestamps
            contactData.created_at = new Date();
            contactData.updated_at = new Date();
            contactData.last_activity_date = new Date();

            // Insert contact
            const [contact] = await crmDb("contacts").insert(contactData).returning("*");
            
            // Track creation event
            await eventService.trackEvent({
                event_name: "contact_created",
                event_category: "crm",
                event_source: contactData.source || "manual",
                contact_id: contact.id,
                source_drop_id: contactData.source_drop_id,
                event_properties: {
                    lifecycle_stage: contact.lifecycle_stage,
                    lead_status: contact.lead_status,
                    has_email: !!contact.email,
                    has_phone: !!contact.phone,
                    data_quality_score: contact.data_quality_score
                }
            });

            console.log(`✅ Created contact: ${contact.uuid}`);
            return contact;
            
        } catch (error) {
            console.error("🚨 Error creating contact:", error);
            throw error;
        }
    }

    /**
     * Update existing contact
     */
    async updateContact(contactId, updateData) {
        try {
            // Remove system fields that shouldn't be updated directly
            const { id, uuid, created_at, ...safeUpdateData } = updateData;
            
            // Set updated timestamp
            safeUpdateData.updated_at = new Date();
            safeUpdateData.last_activity_date = new Date();
            
            // Recalculate data quality score
            const existingContact = await this.getContactById(contactId);
            const mergedData = { ...existingContact, ...safeUpdateData };
            safeUpdateData.data_quality_score = this.calculateDataQualityScore(mergedData);

            // Update contact
            const [updatedContact] = await crmDb("contacts")
                .where("id", contactId)
                .update(safeUpdateData)
                .returning("*");

            // Track update event
            await eventService.trackEvent({
                event_name: "contact_updated",
                event_category: "crm",
                event_source: "system",
                contact_id: contactId,
                event_properties: {
                    updated_fields: Object.keys(safeUpdateData),
                    data_quality_score: updatedContact.data_quality_score
                }
            });

            console.log(`✅ Updated contact: ${updatedContact.uuid}`);
            return updatedContact;
            
        } catch (error) {
            console.error("🚨 Error updating contact:", error);
            throw error;
        }
    }

    /**
     * Find existing contact by email or phone
     */
    async findExistingContact(email, phone) {
        try {
            let query = crmDb("contacts").where("is_active", true);
            
            if (email && phone) {
                query = query.where(function() {
                    this.where("email", email).orWhere("phone", phone);
                });
            } else if (email) {
                query = query.where("email", email);
            } else if (phone) {
                query = query.where("phone", phone);
            } else {
                return null;
            }

            return await query.first();
        } catch (error) {
            console.error("🚨 Error finding existing contact:", error);
            throw error;
        }
    }

    /**
     * Get contact by ID
     */
    async getContactById(contactId) {
        try {
            return await crmDb("contacts")
                .where("id", contactId)
                .where("is_active", true)
                .first();
        } catch (error) {
            console.error("🚨 Error getting contact by ID:", error);
            throw error;
        }
    }

    /**
     * Update contact lifecycle stage
     */
    async updateLifecycleStage(contactId, newStage, reason = null) {
        try {
            const contact = await this.getContactById(contactId);
            if (!contact) {
                throw new Error("Contact not found");
            }

            const oldStage = contact.lifecycle_stage;
            
            await this.updateContact(contactId, {
                lifecycle_stage: newStage,
                lead_status: this.getDefaultLeadStatus(newStage)
            });

            // Track lifecycle stage change
            await eventService.trackEvent({
                event_name: "lifecycle_stage_changed",
                event_category: "crm",
                event_source: "system",
                contact_id: contactId,
                event_properties: {
                    old_stage: oldStage,
                    new_stage: newStage,
                    reason: reason
                }
            });

            console.log(`✅ Updated lifecycle stage for contact ${contact.uuid}: ${oldStage} → ${newStage}`);
            
        } catch (error) {
            console.error("🚨 Error updating lifecycle stage:", error);
            throw error;
        }
    }

    /**
     * Handle SMS opt-out
     */
    async handleSMSOptOut(phone, optOutType = "STOP", campaignId = null) {
        try {
            const normalizedPhone = normalizePhoneNumber(phone);
            
            // Find contact by phone
            const contact = await crmDb("contacts")
                .where("phone", normalizedPhone)
                .where("is_active", true)
                .first();

            if (contact) {
                // Update contact opt-out status
                await this.updateContact(contact.id, {
                    sms_opt_in: false,
                    sms_opt_out_date: new Date(),
                    do_not_sms: true
                });

                // Track opt-out event
                await eventService.trackEvent({
                    event_name: "sms_opt_out",
                    event_category: "sms",
                    event_source: "twilio",
                    contact_id: contact.id,
                    event_properties: {
                        opt_out_type: optOutType,
                        campaign_id: campaignId,
                        phone: normalizedPhone
                    }
                });
            }

            // Record in opt-out table
            await crmDb("sms_opt_outs").insert({
                contact_id: contact?.id,
                phone: normalizedPhone,
                opt_out_type: optOutType,
                campaign_id: campaignId,
                opt_out_date: new Date(),
                is_active: true
            });

            console.log(`✅ Processed SMS opt-out for ${normalizedPhone}`);
            
        } catch (error) {
            console.error("🚨 Error handling SMS opt-out:", error);
            throw error;
        }
    }

    /**
     * Calculate data quality score (0-100)
     */
    calculateDataQualityScore(contactData) {
        let score = 0;
        
        // Email presence and validity (25 points)
        if (contactData.email) {
            score += 20;
            if (contactData.email_verified) score += 5;
        }
        
        // Phone presence and validity (25 points)
        if (contactData.phone) {
            score += 20;
            if (contactData.phone_verified) score += 5;
        }
        
        // Name information (20 points)
        if (contactData.first_name) score += 10;
        if (contactData.last_name) score += 10;
        
        // Company information (10 points)
        if (contactData.company) score += 10;
        
        // Geographic information (10 points)
        if (contactData.country) score += 5;
        if (contactData.city) score += 5;
        
        // Engagement (10 points)
        if (contactData.last_activity_date) {
            const daysSinceActivity = (new Date() - new Date(contactData.last_activity_date)) / (1000 * 60 * 60 * 24);
            if (daysSinceActivity <= 30) score += 10;
            else if (daysSinceActivity <= 90) score += 5;
        }
        
        return Math.min(score, 100);
    }

    /**
     * Extract first name from full name
     */
    extractFirstName(fullName) {
        if (!fullName) return null;
        return fullName.trim().split(' ')[0];
    }

    /**
     * Extract last name from full name
     */
    extractLastName(fullName) {
        if (!fullName) return null;
        const parts = fullName.trim().split(' ');
        return parts.length > 1 ? parts.slice(1).join(' ') : null;
    }

    /**
     * Get default lead status for lifecycle stage
     */
    getDefaultLeadStatus(lifecycleStage) {
        const statusMap = {
            'subscriber': 'new',
            'lead': 'open',
            'marketing_qualified_lead': 'open',
            'sales_qualified_lead': 'open_deal',
            'opportunity': 'open_deal',
            'customer': 'connected',
            'evangelist': 'connected'
        };
        
        return statusMap[lifecycleStage] || 'new';
    }
}

module.exports = new ContactService();
