import { Pool, QueryResult } from 'pg';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

// Global database pool
let pool: Pool | null = null;
let isPostgresConnected = false;

export interface DbOrganization {
  id: string;
  organization_name: string;
  organization_type: string;
  msp_id: string;
  registration_number?: string;
  gstin?: string;
  address?: string;
  contact_email?: string;
  verification_status: string;
  created_at: string;
  updated_at: string;
}

export interface DbUser {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  role: 'SUPPLIER' | 'BUYER' | 'FINANCIER' | 'AUDITOR' | 'ADMIN';
  organization_id: string;
  account_status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  created_at: string;
  updated_at: string;
}

export interface DbInvoice {
  id: string;
  invoice_number: string;
  supplier_organization_id: string;
  buyer_organization_id: string;
  purchase_order_id?: string;
  invoice_amount: number;
  tax_amount?: number;
  subtotal?: number;
  currency: string;
  invoice_date: string;
  due_date: string;
  invoice_status: string;
  document_hash?: string;
  document_storage_key?: string;
  document_file_name?: string;
  description?: string;
  supplier_gstin?: string;
  buyer_gstin?: string;
  line_items?: any;
  ai_verification?: any;
  block_number?: number;
  tx_id?: string;
  endorsement_history?: any;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DbFinancingRequest {
  id: string;
  invoice_id: string;
  supplier_organization_id: string;
  requested_amount: number;
  offered_amount?: number;
  discount_rate_apr?: number;
  tenor_days?: number;
  financing_status: string;
  financier_organization_id?: string;
  decision_reason?: string;
  decision_by?: string;
  disbursed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DbRiskAssessment {
  id: string;
  invoice_id: string;
  risk_score: number;
  risk_category: string;
  risk_factors: any;
  explanation: string;
  confidence: number;
  data_limitations?: any;
  recommended_action?: string;
  assessed_by?: string;
  assessed_at: string;
}

export interface DbPayment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_reference: string;
  payment_status: string;
  payment_date: string;
  recorded_by?: string;
  payment_method?: string;
  notes?: string;
  created_at: string;
}

export interface DbAuditLog {
  id: string;
  user_id?: string;
  user_name?: string;
  organization_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  metadata?: any;
  ip_address?: string;
  created_at: string;
}

export interface DbNotification {
  id: string;
  user_id: string;
  organization_id?: string;
  title: string;
  message: string;
  notification_type: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

// In-Memory store fallback when PostgreSQL is not configured
class InMemoryDatabase {
  public organizations: Map<string, DbOrganization> = new Map();
  public users: Map<string, DbUser> = new Map();
  public invoices: Map<string, DbInvoice> = new Map();
  public financingRequests: Map<string, DbFinancingRequest> = new Map();
  public riskAssessments: Map<string, DbRiskAssessment> = new Map();
  public payments: Map<string, DbPayment> = new Map();
  public auditLogs: DbAuditLog[] = [];
  public notifications: DbNotification[] = [];

  constructor() {
    this.seedDefaultData();
  }

  public seedDefaultData() {
    // 1. Seed Organizations
    const orgSupplier: DbOrganization = {
      id: 'ORG-SUPPLIER-01',
      organization_name: 'TechParts Manufacturing Pvt. Ltd.',
      organization_type: 'SUPPLIER',
      msp_id: 'SupplierMSP',
      registration_number: 'U34100MH2018PTC309871',
      gstin: '27AABCT3518Q1Z8',
      address: 'Plot 42, MIDC Industrial Area, Pune, Maharashtra 411018',
      contact_email: 'finance@techparts.in',
      verification_status: 'VERIFIED',
      created_at: new Date('2026-01-15T09:00:00Z').toISOString(),
      updated_at: new Date().toISOString(),
    };

    const orgBuyer: DbOrganization = {
      id: 'ORG-BUYER-01',
      organization_name: 'AutoWorks Industries Ltd.',
      organization_type: 'BUYER',
      msp_id: 'BuyerMSP',
      registration_number: 'L34102DL1995PLC068412',
      gstin: '07AAACA2104K1ZV',
      address: 'AutoWorks Tower, Sector 29, Gurgaon, Haryana 122002',
      contact_email: 'payables@autoworks.com',
      verification_status: 'VERIFIED',
      created_at: new Date('2026-01-15T09:00:00Z').toISOString(),
      updated_at: new Date().toISOString(),
    };

    const orgFinancier: DbOrganization = {
      id: 'ORG-FINANCIER-01',
      organization_name: 'Apex Supply Chain Capital',
      organization_type: 'FINANCIER',
      msp_id: 'FinancierMSP',
      registration_number: 'U65999MH2020PTC342110',
      gstin: '27AAICA9910P1Z2',
      address: 'Bandra Kurla Complex, Mumbai, Maharashtra 400051',
      contact_email: 'underwriting@apexcap.in',
      verification_status: 'VERIFIED',
      created_at: new Date('2026-01-15T09:00:00Z').toISOString(),
      updated_at: new Date().toISOString(),
    };

    const orgAuditor: DbOrganization = {
      id: 'ORG-AUDITOR-01',
      organization_name: 'DRUNIX Consortium Network Auditor',
      organization_type: 'AUDITOR',
      msp_id: 'NetworkAuditor',
      registration_number: 'AUDIT-DLT-2026-01',
      gstin: '27AAACG0000A1Z5',
      address: 'NPCI Centre of Excellence, BKC, Mumbai',
      contact_email: 'compliance@drunix.org',
      verification_status: 'VERIFIED',
      created_at: new Date('2026-01-15T09:00:00Z').toISOString(),
      updated_at: new Date().toISOString(),
    };

    const orgAdmin: DbOrganization = {
      id: 'ORG-ADMIN-01',
      organization_name: 'InvoiceNet Platform Administration',
      organization_type: 'ADMIN',
      msp_id: 'AdminMSP',
      registration_number: 'ADM-SYS-2026',
      contact_email: 'admin@invoicenet.io',
      verification_status: 'VERIFIED',
      created_at: new Date('2026-01-15T09:00:00Z').toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.organizations.set(orgSupplier.id, orgSupplier);
    this.organizations.set(orgBuyer.id, orgBuyer);
    this.organizations.set(orgFinancier.id, orgFinancier);
    this.organizations.set(orgAuditor.id, orgAuditor);
    this.organizations.set(orgAdmin.id, orgAdmin);

    // Standard demo password hash for "password123"
    const demoPasswordHash = bcrypt.hashSync('password123', 10);

    // 2. Seed Default Persona Users
    const userSupplier: DbUser = {
      id: 'USR-SUPPLIER-01',
      full_name: 'Priya Sharma',
      email: 'priya@techparts.in',
      password_hash: demoPasswordHash,
      role: 'SUPPLIER',
      organization_id: orgSupplier.id,
      account_status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const userBuyer: DbUser = {
      id: 'USR-BUYER-01',
      full_name: 'Rajesh Kumar',
      email: 'rajesh@autoworks.com',
      password_hash: demoPasswordHash,
      role: 'BUYER',
      organization_id: orgBuyer.id,
      account_status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const userFinancier: DbUser = {
      id: 'USR-FINANCIER-01',
      full_name: 'Vikram Malhotra',
      email: 'vikram@apexcap.in',
      password_hash: demoPasswordHash,
      role: 'FINANCIER',
      organization_id: orgFinancier.id,
      account_status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const userAuditor: DbUser = {
      id: 'USR-AUDITOR-01',
      full_name: 'Ananya Roy',
      email: 'ananya@drunix.org',
      password_hash: demoPasswordHash,
      role: 'AUDITOR',
      organization_id: orgAuditor.id,
      account_status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const userAdmin: DbUser = {
      id: 'USR-ADMIN-01',
      full_name: 'System Administrator',
      email: 'admin@invoicenet.io',
      password_hash: demoPasswordHash,
      role: 'ADMIN',
      organization_id: orgAdmin.id,
      account_status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.users.set(userSupplier.id, userSupplier);
    this.users.set(userBuyer.id, userBuyer);
    this.users.set(userFinancier.id, userFinancier);
    this.users.set(userAuditor.id, userAuditor);
    this.users.set(userAdmin.id, userAdmin);

    // Initial audit log
    this.auditLogs.push({
      id: 'AUDIT-GENESIS-01',
      user_id: userAdmin.id,
      user_name: 'System Administrator',
      organization_id: orgAdmin.id,
      action: 'SYSTEM_INITIALIZATION',
      entity_type: 'PLATFORM',
      entity_id: 'INVOICENET-CORE',
      metadata: { genesisBlock: 1042, defaultOrganizations: 5 },
      created_at: new Date().toISOString(),
    });
  }
}

export const inMemoryDb = new InMemoryDatabase();

/**
 * Initialize Database Connection (PostgreSQL with In-Memory fallback)
 */
export async function initializeDatabase(): Promise<boolean> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString || connectionString.trim() === '') {
    console.log('ℹ️ DATABASE_URL not set; running in High-Performance Transactional In-Memory Storage Mode.');
    isPostgresConnected = false;
    return false;
  }

  try {
    const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    pool = new Pool({
      connectionString,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    // Test connection
    const client = await pool.connect();
    console.log('🐘 Connected successfully to PostgreSQL (Supabase / Render Database)');
    client.release();

    // Run schema migrations
    await runMigrations();
    isPostgresConnected = true;
    return true;
  } catch (err: any) {
    console.warn('⚠️ PostgreSQL connection failed:', err.message);
    console.warn('ℹ️ Falling back to In-Memory Transactional Storage.');
    isPostgresConnected = false;
    return false;
  }
}

/**
 * Run Initial Schema Migrations on PostgreSQL
 */
async function runMigrations() {
  if (!pool) return;
  try {
    const migrationFile = path.join(__dirname, 'migrations/001_initial_schema.sql');
    if (fs.existsSync(migrationFile)) {
      const sql = fs.readFileSync(migrationFile, 'utf-8');
      await pool.query(sql);
      console.log('✅ PostgreSQL Schema migrations applied successfully.');

      // Check if organizations need seeding
      const checkOrgs = await pool.query('SELECT COUNT(*) FROM organizations');
      if (parseInt(checkOrgs.rows[0].count, 10) === 0) {
        console.log('🌱 Seeding initial consortium organizations and users in PostgreSQL...');
        for (const org of inMemoryDb.organizations.values()) {
          await pool.query(
            `INSERT INTO organizations (id, organization_name, organization_type, msp_id, registration_number, gstin, address, contact_email, verification_status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (id) DO NOTHING`,
            [org.id, org.organization_name, org.organization_type, org.msp_id, org.registration_number, org.gstin, org.address, org.contact_email, org.verification_status]
          );
        }

        for (const user of inMemoryDb.users.values()) {
          await pool.query(
            `INSERT INTO users (id, full_name, email, password_hash, role, organization_id, account_status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (email) DO NOTHING`,
            [user.id, user.full_name, user.email, user.password_hash, user.role, user.organization_id, user.account_status]
          );
        }
        console.log('✅ PostgreSQL seed complete.');
      }
    }
  } catch (err: any) {
    console.error('Error applying migrations:', err.message);
  }
}

/**
 * Execute a SQL query (PostgreSQL if connected, otherwise handled via repository)
 */
export async function query(text: string, params?: any[]): Promise<QueryResult<any> | null> {
  if (pool && isPostgresConnected) {
    return pool.query(text, params);
  }
  return null;
}

export function isDatabasePostgres(): boolean {
  return isPostgresConnected;
}

export function getPool(): Pool | null {
  return pool;
}
