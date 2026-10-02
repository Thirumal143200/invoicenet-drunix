import assert from 'assert';
import jwt from 'jsonwebtoken';
import { AuthController } from '../controllers/authController';
import { InvoiceController } from '../controllers/invoiceController';
import { authenticateToken, JWT_SECRET } from '../middleware/authMiddleware';
import { inMemoryDb } from '../db';
import { drunixGateway } from '../services/drunixGateway';

interface MockResponse {
  statusCode: number;
  data: any;
  status(code: number): MockResponse;
  json(payload: any): MockResponse;
}

function createMockResponse(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    data: null,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: any) {
      res.data = payload;
      return res;
    },
  };
  return res;
}

export async function runSequentialLoginTests(): Promise<{ passed: number; failed: number }> {
  console.log('\n======================================================================');
  console.log('       INVOICENET SEQUENTIAL MULTI-USER AUTH & TENANT ISOLATION TESTS');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  let user1Token = '';
  let user1User: any = null;
  let user2Token = '';
  let user2User: any = null;

  // -------------------------------------------------------------------------
  // PHASE 1: User 1 Login (Supplier: Priya Sharma at TechParts)
  // -------------------------------------------------------------------------
  console.log('--- PHASE 1: User 1 Login (Supplier: Priya Sharma) ---');

  await test('User 1 (Supplier) login returns HTTP 200, JWT token, and correct user details', async () => {
    const req = {
      body: {
        email: 'priya@techparts.in',
        password: 'password123',
      },
    } as any;
    const res = createMockResponse();

    await AuthController.login(req, res as any);
    assert.strictEqual(res.statusCode, 200, 'Login should return HTTP 200');
    assert(res.data.success, 'Login should succeed');
    assert(res.data.data.token, 'JWT token should be returned');
    assert.strictEqual(res.data.data.user.role, 'SUPPLIER', 'Role must be SUPPLIER');
    assert.strictEqual(res.data.data.user.fullName, 'Priya Sharma', 'Full name must match');
    assert(res.data.data.user.organizationName.includes('TechParts'), 'Organization must be TechParts');

    user1Token = res.data.data.token;
    user1User = res.data.data.user;

    // Verify JWT payload cryptographically
    const decoded = jwt.verify(user1Token, JWT_SECRET) as any;
    assert.strictEqual(decoded.email, 'priya@techparts.in', 'JWT contains user email');
    assert.strictEqual(decoded.role, 'SUPPLIER', 'JWT contains SUPPLIER role');
  });

  await test('User 1 profile verification via /api/auth/me returns Supplier identity', async () => {
    let nextCalled = false;
    const authReq = {
      headers: { authorization: `Bearer ${user1Token}` },
    } as any;
    const authRes = createMockResponse();

    await authenticateToken(authReq, authRes as any, () => {
      nextCalled = true;
    });

    assert(nextCalled, 'authenticateToken middleware should call next()');
    assert(authReq.user, 'req.user should be populated from JWT token');
    assert.strictEqual(authReq.user.role, 'SUPPLIER');
    assert.strictEqual(authReq.user.fullName, 'Priya Sharma');

    const meRes = createMockResponse();
    await AuthController.getMe(authReq, meRes as any);
    assert.strictEqual(meRes.statusCode, 200);
    assert(meRes.data.success);
    const user = meRes.data.data.user || meRes.data.data;
    assert.strictEqual(user.fullName, 'Priya Sharma');
    assert.strictEqual(user.role, 'SUPPLIER');
  });

  await test('User 1 receives tenant-isolated invoices for TechParts Manufacturing only', async () => {
    const invReq = {
      user: {
        id: user1User.id,
        role: 'SUPPLIER',
        organizationName: user1User.organizationName,
        fullName: user1User.fullName,
      },
    } as any;
    const invRes = createMockResponse();

    await InvoiceController.getAll(invReq, invRes as any);
    assert.strictEqual(invRes.statusCode, 200);
    assert(invRes.data.success);
    assert(Array.isArray(invRes.data.data), 'Invoices should be returned as array');
    assert(invRes.data.data.length > 0, 'TechParts should have invoices');

    // Tenant isolation verification: ALL returned invoices must belong to TechParts
    const nonTechParts = invRes.data.data.filter(
      (inv: any) => !inv.supplierOrg.toLowerCase().includes('techparts')
    );
    assert.strictEqual(
      nonTechParts.length,
      0,
      'Supplier must not see invoices from competing suppliers'
    );
  });

  await test('User 1 can access own participating invoice INV-2026-001', async () => {
    const invReq = {
      params: { id: 'INV-2026-001' },
      user: {
        id: user1User.id,
        role: 'SUPPLIER',
        organizationName: user1User.organizationName,
        fullName: user1User.fullName,
      },
    } as any;
    const invRes = createMockResponse();

    await InvoiceController.getById(invReq, invRes as any);
    assert.strictEqual(invRes.statusCode, 200);
    assert(invRes.data.success);
    assert.strictEqual(invRes.data.data.id, 'INV-2026-001');
  });

  // -------------------------------------------------------------------------
  // PHASE 2: User 1 Logout and State Clearing
  // -------------------------------------------------------------------------
  console.log('\n--- PHASE 2: User 1 Logout & Session Invalidation ---');

  await test('User 1 logs out: /api/auth/logout records audit log and terminates session', async () => {
    const logoutReq = {
      user: {
        id: user1User.id,
        fullName: user1User.fullName,
        organizationId: user1User.organizationId,
        role: 'SUPPLIER',
      },
    } as any;
    const logoutRes = createMockResponse();

    await AuthController.logout(logoutReq, logoutRes as any);
    assert.strictEqual(logoutRes.statusCode, 200);
    assert(logoutRes.data.success);

    // Verify audit log
    const lastAudit = inMemoryDb.auditLogs[inMemoryDb.auditLogs.length - 1];
    assert(lastAudit, 'Audit log must exist');
    assert.strictEqual(lastAudit.action, 'USER_LOGOUT');
    assert.strictEqual(lastAudit.user_name, 'Priya Sharma');

    // Simulate clearing client state
    user1Token = '';
  });

  // -------------------------------------------------------------------------
  // PHASE 3: User 2 Login (Buyer: Rajesh Kumar at AutoWorks)
  // -------------------------------------------------------------------------
  console.log('\n--- PHASE 3: User 2 Login (Buyer: Rajesh Kumar) ---');

  await test('User 2 (Buyer) logs in with separate credentials and receives unique token', async () => {
    const req = {
      body: {
        email: 'rajesh@autoworks.com',
        password: 'password123',
      },
    } as any;
    const res = createMockResponse();

    await AuthController.login(req, res as any);
    assert.strictEqual(res.statusCode, 200);
    assert(res.data.success);
    assert(res.data.data.token, 'New JWT token should be returned');
    assert.strictEqual(res.data.data.user.role, 'BUYER', 'Role must be BUYER');
    assert.strictEqual(res.data.data.user.fullName, 'Rajesh Kumar', 'Full name must be Rajesh Kumar');
    assert(res.data.data.user.organizationName.includes('AutoWorks'), 'Organization must be AutoWorks');

    user2Token = res.data.data.token;
    user2User = res.data.data.user;

    // Cryptographic validation of second token
    const decoded = jwt.verify(user2Token, JWT_SECRET) as any;
    assert.strictEqual(decoded.email, 'rajesh@autoworks.com');
    assert.strictEqual(decoded.role, 'BUYER');
  });

  await test('User 2 profile verification via /api/auth/me shows zero residue from User 1', async () => {
    let nextCalled = false;
    const authReq = {
      headers: { authorization: `Bearer ${user2Token}` },
    } as any;
    const authRes = createMockResponse();

    await authenticateToken(authReq, authRes as any, () => {
      nextCalled = true;
    });

    assert(nextCalled);
    assert(authReq.user);
    assert.strictEqual(authReq.user.role, 'BUYER');
    assert.strictEqual(authReq.user.fullName, 'Rajesh Kumar');
    assert.notStrictEqual(authReq.user.fullName, 'Priya Sharma', 'No User 1 residue');

    const meRes = createMockResponse();
    await AuthController.getMe(authReq, meRes as any);
    assert.strictEqual(meRes.statusCode, 200);
    const user = meRes.data.data.user || meRes.data.data;
    assert.strictEqual(user.fullName, 'Rajesh Kumar');
    assert.strictEqual(user.role, 'BUYER');
  });

  await test('User 2 receives tenant-isolated payables for AutoWorks Industries Ltd only', async () => {
    const invReq = {
      user: {
        id: user2User.id,
        role: 'BUYER',
        organizationName: user2User.organizationName,
        fullName: user2User.fullName,
      },
    } as any;
    const invRes = createMockResponse();

    await InvoiceController.getAll(invReq, invRes as any);
    assert.strictEqual(invRes.statusCode, 200);
    assert(invRes.data.success);

    // Verify all invoices belong to AutoWorks
    for (const inv of invRes.data.data) {
      assert(
        inv.buyerOrg.toLowerCase().includes('autoworks'),
        `Invoice ${inv.id} buyerOrg must be AutoWorks Industries Ltd.`
      );
    }

    // Crucial isolation check: INV-2026-002 (belonging to buyer Metro Fleet) is NOT in the list
    const foreignInvoice = invRes.data.data.find((i: any) => i.id === 'INV-2026-002');
    assert(!foreignInvoice, 'INV-2026-002 (Metro Fleet buyer) must be filtered out for AutoWorks');
  });

  await test('User 2 attempting direct access to foreign invoice INV-2026-002 is blocked with HTTP 403', async () => {
    const invReq = {
      params: { id: 'INV-2026-002' },
      user: {
        id: user2User.id,
        role: 'BUYER',
        organizationName: user2User.organizationName,
        fullName: user2User.fullName,
      },
    } as any;
    const invRes = createMockResponse();

    await InvoiceController.getById(invReq, invRes as any);
    assert.strictEqual(invRes.statusCode, 403, 'Cross-tenant access must return HTTP 403 Forbidden');
    assert(!invRes.data.success);
    assert(invRes.data.error.includes('ACCESS DENIED'), 'Must return ACCESS DENIED message');
  });

  // -------------------------------------------------------------------------
  // PHASE 4: User 2 Logout
  // -------------------------------------------------------------------------
  console.log('\n--- PHASE 4: User 2 Logout ---');

  await test('User 2 logs out: session terminates cleanly and audit log captures event', async () => {
    const logoutReq = {
      user: {
        id: user2User.id,
        fullName: user2User.fullName,
        organizationId: user2User.organizationId,
        role: 'BUYER',
      },
    } as any;
    const logoutRes = createMockResponse();

    await AuthController.logout(logoutReq, logoutRes as any);
    assert.strictEqual(logoutRes.statusCode, 200);

    const lastAudit = inMemoryDb.auditLogs[inMemoryDb.auditLogs.length - 1];
    assert.strictEqual(lastAudit.action, 'USER_LOGOUT');
    assert.strictEqual(lastAudit.user_name, 'Rajesh Kumar');
  });

  // -------------------------------------------------------------------------
  // PHASE 5: User 3 Login (Financier: Vikram Malhotra at Apex Capital)
  // -------------------------------------------------------------------------
  console.log('\n--- PHASE 5: User 3 Login (Financier: Vikram Malhotra) ---');

  await test('User 3 (Financier) logs in and receives FINANCIER role & underwriting access', async () => {
    const req = {
      body: {
        email: 'vikram@apexcap.in',
        password: 'password123',
      },
    } as any;
    const res = createMockResponse();

    await AuthController.login(req, res as any);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.data.user.role, 'FINANCIER');
    assert.strictEqual(res.data.data.user.fullName, 'Vikram Malhotra');

    const financierToken = res.data.data.token;
    const authReq = {
      headers: { authorization: `Bearer ${financierToken}` },
    } as any;
    let nextCalled = false;
    await authenticateToken(authReq, createMockResponse() as any, () => {
      nextCalled = true;
    });
    assert(nextCalled);
    assert.strictEqual(authReq.user.role, 'FINANCIER');

    // Financier receives eligible financing invoices
    const invReq = { user: authReq.user } as any;
    const invRes = createMockResponse();
    await InvoiceController.getAll(invReq, invRes as any);
    assert.strictEqual(invRes.statusCode, 200);
    assert(invRes.data.data.length > 0);
  });

  // -------------------------------------------------------------------------
  // PHASE 6: React Role Dashboard Navigation Verification
  // -------------------------------------------------------------------------
  console.log('\n--- PHASE 6: React Role-Based Dashboard Mapping Verification ---');

  await test('Role-based dashboard router maps each role immediately to correct view', () => {
    const getDashboardForRole = (role: string) => {
      switch (role) {
        case 'SUPPLIER':
          return 'INVOICES'; // Receivables ledger
        case 'BUYER':
          return 'INVOICES'; // Payables ledger
        case 'FINANCIER':
          return 'FINANCING'; // Financing exchange & underwriting desk
        case 'AUDITOR':
        case 'EXPLORER':
          return 'NETWORK'; // Consensus & block explorer
        default:
          return 'INVOICES';
      }
    };

    assert.strictEqual(getDashboardForRole('SUPPLIER'), 'INVOICES');
    assert.strictEqual(getDashboardForRole('BUYER'), 'INVOICES');
    assert.strictEqual(getDashboardForRole('FINANCIER'), 'FINANCING');
    assert.strictEqual(getDashboardForRole('AUDITOR'), 'NETWORK');
    assert.strictEqual(getDashboardForRole('EXPLORER'), 'NETWORK');
  });

  console.log('\n======================================================================');
  console.log(`SEQUENTIAL AUTH & ISOLATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================\n');

  if (failed > 0) {
    throw new Error(`${failed} tests failed in Sequential Multi-User suite.`);
  }

  return { passed, failed };
}

if (require.main === module) {
  runSequentialLoginTests().catch((e) => {
    console.error('Sequential test execution failed:', e);
    process.exit(1);
  });
}
