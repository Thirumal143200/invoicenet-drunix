-- ==============================================================================
-- InvoiceNet Automated Invoice Reminders & Preferences Schema
-- Migration 002: DRUNIX × Citi FinTech Hackathon 2026
-- ==============================================================================

-- 1. INVOICE REMINDERS TABLE
CREATE TABLE IF NOT EXISTS invoice_reminders (
    id VARCHAR(64) PRIMARY KEY,
    invoice_id VARCHAR(64) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    invoice_number VARCHAR(128) NOT NULL,
    recipient_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    recipient_organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255),
    recipient_role VARCHAR(64) NOT NULL, -- 'BUYER', 'SUPPLIER', 'FINANCIER'
    reminder_type VARCHAR(64) NOT NULL,  -- 'BEFORE_7_DAYS', 'BEFORE_3_DAYS', 'DUE_TODAY', 'OVERDUE_1_DAY', 'OVERDUE_3_DAYS', 'OVERDUE_7_DAYS'
    interval_days INTEGER NOT NULL,      -- -7, -3, 0, 1, 3, 7
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    currency VARCHAR(16) DEFAULT 'INR',
    status VARCHAR(32) NOT NULL DEFAULT 'SENT', -- 'PENDING', 'SENT', 'FAILED', 'DISMISSED'
    channel VARCHAR(32) NOT NULL DEFAULT 'IN_APP', -- 'IN_APP', 'EMAIL', 'BOTH'
    email_delivery_status VARCHAR(32) DEFAULT 'SKIPPED', -- 'DELIVERED', 'FAILED', 'SKIPPED', 'MOCKED'
    email_message_id VARCHAR(128),
    error_message TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_invoice_reminder_interval UNIQUE (invoice_id, reminder_type, recipient_role)
);

CREATE INDEX IF NOT EXISTS idx_reminders_invoice ON invoice_reminders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_reminders_org ON invoice_reminders(recipient_organization_id);
CREATE INDEX IF NOT EXISTS idx_reminders_role ON invoice_reminders(recipient_role);
CREATE INDEX IF NOT EXISTS idx_reminders_type ON invoice_reminders(reminder_type);
CREATE INDEX IF NOT EXISTS idx_reminders_is_read ON invoice_reminders(recipient_organization_id, is_read);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON invoice_reminders(status);

-- 2. USER & ORG REMINDER PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS reminder_preferences (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    enabled_intervals JSONB NOT NULL DEFAULT '[-7, -3, 0, 1, 3, 7]'::jsonb,
    overdue_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    minimum_amount NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_reminder_preferences_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_reminder_prefs_org ON reminder_preferences(organization_id);
