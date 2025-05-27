-- 🚀 ENTERPRISE SMS CAMPAIGN MANAGEMENT SCHEMA
-- Research-based database design following CRM industry standards

-- SMS Campaigns Table
CREATE TABLE IF NOT EXISTS sms_campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('transactional', 'promotional', 'notification', 'reminder', 'welcome', 'abandoned_cart', 'drop_announcement')),
    template VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled', 'failed')),
    
    -- Campaign targeting
    drop_id INTEGER,
    segment_id INTEGER,
    
    -- Scheduling
    scheduled_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Metrics
    total_sent INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    
    -- Metadata
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_campaigns_status (status),
    INDEX idx_campaigns_type (type),
    INDEX idx_campaigns_drop_id (drop_id),
    INDEX idx_campaigns_scheduled (scheduled_at)
);

-- SMS Messages Table (Message-level tracking)
CREATE TABLE IF NOT EXISTS sms_messages (
    id SERIAL PRIMARY KEY,
    campaign_id VARCHAR(100), -- Can be numeric ID or transaction ID
    contact_id INTEGER,
    drop_id INTEGER,
    
    -- Message details
    phone VARCHAR(20) NOT NULL,
    message_sid VARCHAR(100), -- Twilio message SID
    message_body TEXT,
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'undelivered', 'queued')),
    error_code VARCHAR(20),
    error_message TEXT,
    
    -- Timestamps
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP,
    failed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_messages_campaign (campaign_id),
    INDEX idx_messages_contact (contact_id),
    INDEX idx_messages_phone (phone),
    INDEX idx_messages_status (status),
    INDEX idx_messages_sid (message_sid)
);

-- SMS Opt-outs Table (Compliance tracking)
CREATE TABLE IF NOT EXISTS sms_opt_outs (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER,
    phone VARCHAR(20) NOT NULL,
    
    -- Opt-out details
    opted_out_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    opt_out_method VARCHAR(50) DEFAULT 'sms_reply' CHECK (opt_out_method IN ('sms_reply', 'web_form', 'admin', 'api')),
    opt_out_message TEXT,
    
    -- Compliance
    confirmation_sent BOOLEAN DEFAULT FALSE,
    confirmation_sid VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint to prevent duplicates
    UNIQUE(phone),
    
    -- Indexes
    INDEX idx_opt_outs_phone (phone),
    INDEX idx_opt_outs_contact (contact_id),
    INDEX idx_opt_outs_date (opted_out_at)
);

-- SMS Templates Table (Message templates)
CREATE TABLE IF NOT EXISTS sms_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,
    
    -- Template content
    subject VARCHAR(255),
    body TEXT NOT NULL,
    variables JSON, -- Template variables like {name}, {dropTitle}
    
    -- Settings
    is_active BOOLEAN DEFAULT TRUE,
    compliance_footer TEXT DEFAULT 'Reply STOP to opt out.',
    
    -- Metadata
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_templates_type (type),
    INDEX idx_templates_active (is_active)
);

-- SMS Segments Table (Audience segmentation)
CREATE TABLE IF NOT EXISTS sms_segments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Segment criteria (stored as JSON for flexibility)
    criteria JSON,
    
    -- Metrics
    contact_count INTEGER DEFAULT 0,
    last_calculated_at TIMESTAMP,
    
    -- Settings
    is_active BOOLEAN DEFAULT TRUE,
    auto_update BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_segments_active (is_active)
);

-- SMS Analytics Summary Table (Performance metrics)
CREATE TABLE IF NOT EXISTS sms_analytics_summary (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    campaign_id VARCHAR(100),
    
    -- Daily metrics
    messages_sent INTEGER DEFAULT 0,
    messages_delivered INTEGER DEFAULT 0,
    messages_failed INTEGER DEFAULT 0,
    opt_outs INTEGER DEFAULT 0,
    
    -- Calculated metrics
    delivery_rate DECIMAL(5,2),
    failure_rate DECIMAL(5,2),
    opt_out_rate DECIMAL(5,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint for daily summaries
    UNIQUE(date, campaign_id),
    
    INDEX idx_analytics_date (date),
    INDEX idx_analytics_campaign (campaign_id)
);

-- Update contacts table to include SMS preferences
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS sms_opt_in BOOLEAN DEFAULT TRUE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS do_not_sms BOOLEAN DEFAULT FALSE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS sms_opt_in_date TIMESTAMP;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS sms_opt_out_date TIMESTAMP;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS preferred_sms_time VARCHAR(20) DEFAULT 'any';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'America/New_York';

-- Create indexes for SMS preferences
CREATE INDEX IF NOT EXISTS idx_contacts_sms_opt_in ON contacts(sms_opt_in);
CREATE INDEX IF NOT EXISTS idx_contacts_do_not_sms ON contacts(do_not_sms);

-- Insert default SMS templates
INSERT INTO sms_templates (name, type, body, variables) VALUES 
('drop_signup_confirmation', 'transactional', 
 '🎉 Hey {name}! You''re confirmed for {dropTitle}. We''ll text you when it goes live. Thanks for joining BOUNCE2BOUNCE!',
 '{"name": "User first name", "dropTitle": "Drop title"}'),
 
('drop_announcement', 'promotional',
 '🚀 {name}, {dropTitle} is LIVE! Check it out now: {dropUrl}',
 '{"name": "User first name", "dropTitle": "Drop title", "dropUrl": "Drop URL"}'),
 
('welcome_series', 'welcome',
 'Welcome to BOUNCE2BOUNCE, {name}! 🎉 You''ll be the first to know about exclusive drops and events.',
 '{"name": "User first name"}')
ON CONFLICT (name) DO NOTHING;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_sms_campaigns_updated_at BEFORE UPDATE ON sms_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sms_templates_updated_at BEFORE UPDATE ON sms_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sms_segments_updated_at BEFORE UPDATE ON sms_segments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
