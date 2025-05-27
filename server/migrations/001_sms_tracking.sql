-- 📱 SMS TRACKING TABLES FOR MAIN DATABASE
-- Production-ready SMS tracking that works with existing drop signups

-- SMS Messages Table (tracks all SMS sent)
CREATE TABLE IF NOT EXISTS sms_messages (
    id SERIAL PRIMARY KEY,
    
    -- Link to drop signup
    drop_signup_id INTEGER REFERENCES drop_signups(id) ON DELETE CASCADE,
    
    -- Message details
    phone VARCHAR(20) NOT NULL,
    message_body TEXT,
    message_type VARCHAR(50) DEFAULT 'confirmation' CHECK (message_type IN ('confirmation', 'announcement', 'reminder', 'welcome')),
    
    -- Twilio tracking
    message_sid VARCHAR(100) UNIQUE,
    status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'undelivered')),
    error_code VARCHAR(20),
    error_message TEXT,
    
    -- Timestamps
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP,
    failed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_sms_messages_signup_id (drop_signup_id),
    INDEX idx_sms_messages_phone (phone),
    INDEX idx_sms_messages_status (status),
    INDEX idx_sms_messages_sid (message_sid),
    INDEX idx_sms_messages_type (message_type),
    INDEX idx_sms_messages_sent_at (sent_at)
);

-- SMS Opt-outs Table (compliance tracking)
CREATE TABLE IF NOT EXISTS sms_opt_outs (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL UNIQUE,
    
    -- Opt-out details
    opted_out_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    opt_out_method VARCHAR(50) DEFAULT 'sms_reply' CHECK (opt_out_method IN ('sms_reply', 'web_form', 'admin')),
    opt_out_message TEXT,
    
    -- Compliance
    confirmation_sent BOOLEAN DEFAULT FALSE,
    confirmation_sid VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_sms_opt_outs_phone (phone),
    INDEX idx_sms_opt_outs_date (opted_out_at)
);

-- SMS Campaign Logs (simple campaign tracking)
CREATE TABLE IF NOT EXISTS sms_campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    drop_id INTEGER REFERENCES drops(id) ON DELETE CASCADE,
    
    -- Campaign metrics
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    
    -- Timestamps
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_sms_campaigns_drop_id (drop_id),
    INDEX idx_sms_campaigns_type (type),
    INDEX idx_sms_campaigns_started_at (started_at)
);

-- Add SMS preferences to drop_signups table
ALTER TABLE drop_signups ADD COLUMN IF NOT EXISTS sms_opt_in BOOLEAN DEFAULT TRUE;
ALTER TABLE drop_signups ADD COLUMN IF NOT EXISTS sms_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE drop_signups ADD COLUMN IF NOT EXISTS sms_sent_at TIMESTAMP;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_drop_signups_sms_opt_in ON drop_signups(sms_opt_in);
CREATE INDEX IF NOT EXISTS idx_drop_signups_sms_sent ON drop_signups(sms_sent);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_sms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for sms_messages updated_at
CREATE TRIGGER update_sms_messages_updated_at 
    BEFORE UPDATE ON sms_messages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_sms_updated_at();
