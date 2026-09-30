-- ==============================================================================
-- InvoiceNet Multi-Tenant Relational Schema (PostgreSQL / Supabase)
-- DRUNIX × Citi FinTech Hackathon 2026
-- ==============================================================================

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ORGANIZATIONS
CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(64) PRIMARY KEY,
    organization_name VARCHAR(255) NOT NULL,
    organization_type VARCHAR(64) NOT NULL, -- 'SUPPLIER', 'BUYER', 'FINANCIER', 'AUDITOR', 'ADMIN'
    msp_id VARCHAR(64) NOT NULL, -- 'SupplierMSP', 'BuyerMSP', 'FinancierMSP', 'NetworkAuditor', 'AdminMSP'
    registration_number VARCHAR(128),
    gstin VARCHAR(32),
    address TEXT,
    contact_email VARCHAR(255),
    verification_status VARCHAR(64) NOT NULL DEFAULT 'VERIFIED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. USERS
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(64) NOT NULL, -- 'SUPPLIER', 'BUYER', 'FINANCIER', 'AUDITOR', 'ADMIN'
    organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE SET NULL,
    account_status VARCHAR(64) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'SUSPENDED', 'PENDING'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 3. INVOICES
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(64) PRIMARY KEY,
    invoice_number VARCHAR(128) NOT NULL UNIQUE,
    supplier_organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE RESTRICT,
    buyer_organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE RESTRICT,
    purchase_order_id VARCHAR(128),
    invoice_amount NUMERIC(15, 2) NOT NULL,
    tax_amount NUMERIC(15, 2) DEFAULT 0,
    subtotal NUMERIC(15, 2),
    currency VARCHAR(16) DEFAULT 'INR',
    invoice_date TIMESTAMP WITH TIME ZONE NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    invoice_status VARCHAR(64) NOT NULL DEFAULT 'CREATED', 
    -- 'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'DISPUTED', 'FINANCING_REQUESTED', 'FINANCING_APPROVED', 'FINANCING_REJECTED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'CREATED', 'ACCEPTED', 'FINANCED', 'SETTLED'
    document_hash VARCHAR(128),
    document_storage_key VARCHAR(255),
    document_file_name VARCHAR(255),
    description TEXT,
    supplier_gstin VARCHAR(32),
    buyer_gstin VARCHAR(32),
    line_items JSONB DEFAULT '[]'::jsonb,
    ai_verification JSONB DEFAULT '{}'::jsonb,
    block_number INTEGER DEFAULT 0,
    tx_id VARCHAR(128),
    endorsement_history JSONB DEFAULT '[]'::jsonb,
    created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(invoice_status);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier ON invoices(supplier_organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_buyer ON invoices(buyer_organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_doc_hash ON invoices(document_hash);
CREATE INDEX IF NOT EXISTS idx_invoices_po ON invoices(purchase_order_id);

-- 4. FINANCING REQUESTS
CREATE TABLE IF NOT EXISTS financing_requests (
    id VARCHAR(64) PRIMARY KEY,
    invoice_id VARCHAR(64) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    supplier_organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    requested_amount NUMERIC(15, 2) NOT NULL,
    offered_amount NUMERIC(15, 2),
    discount_rate_apr NUMERIC(5, 2) DEFAULT 8.5,
    tenor_days INTEGER DEFAULT 45,
    financing_status VARCHAR(64) NOT NULL DEFAULT 'PENDING',
    -- 'PENDING', 'APPROVED', 'REJECTED', 'DISBURSED', 'SETTLED', 'CANCELLED'
    financier_organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE SET NULL,
    decision_reason TEXT,
    decision_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    disbursed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financing_invoice ON financing_requests(invoice_id);
CREATE INDEX IF NOT EXISTS idx_financing_supplier ON financing_requests(supplier_organization_id);
CREATE INDEX IF NOT EXISTS idx_financing_financier ON financing_requests(financier_organization_id);
CREATE INDEX IF NOT EXISTS idx_financing_status ON financing_requests(financing_status);

-- 5. RISK ASSESSMENTS
CREATE TABLE IF NOT EXISTS risk_assessments (
    id VARCHAR(64) PRIMARY KEY,
    invoice_id VARCHAR(64) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    risk_score INTEGER NOT NULL,
    risk_category VARCHAR(64) NOT NULL, -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    risk_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
    explanation TEXT,
    confidence NUMERIC(4, 2) DEFAULT 0.90,
    data_limitations JSONB DEFAULT '[]'::jsonb,
    recommended_action VARCHAR(255),
    assessed_by VARCHAR(64),
    assessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_invoice ON risk_assessments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_risk_category ON risk_assessments(risk_category);

-- 6. PAYMENTS & SETTLEMENTS
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(64) PRIMARY KEY,
    invoice_id VARCHAR(64) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    payment_reference VARCHAR(128) NOT NULL,
    payment_status VARCHAR(64) NOT NULL DEFAULT 'COMPLETED', -- 'INITIATED', 'COMPLETED', 'FAILED', 'RECONCILED'
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    recorded_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    payment_method VARCHAR(64) DEFAULT 'RTGS/NEFT',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_ref ON payments(payment_reference);

-- 7. AUDIT LOGS (Immutable Operations History)
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64),
    user_name VARCHAR(255),
    organization_id VARCHAR(64),
    action VARCHAR(128) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(128),
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);

-- 8. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id VARCHAR(64),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(64) NOT NULL DEFAULT 'INFO',
    link VARCHAR(255),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);
