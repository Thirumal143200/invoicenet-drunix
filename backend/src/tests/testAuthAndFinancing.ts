import assert from 'assert';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { inMemoryDb } from '../db';
import { AuthController } from '../controllers/authController';
import { JWT_SECRET } from '../middleware/authMiddleware';
import { FinancingWorkflowService } from '../services/financingWorkflowService';
import { AuditNotificationService } from '../services/auditNotificationService';
import { drunixGateway } from '../services/drunixGateway';

async function runAuthAndFinancingTests() {
  console.log('\n======================================================================');
  console.log('       INVOICENET MULTI-USER & FINANCING PLATFORM TEST SUITE');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    return Promise.resolve()
      .then(fn)
      .then(() => {
        console.log(`  [PASS] ${name}`);
        passed++;
      })
      .catch((err) => {
        console.error(`  [FAIL] ${name}:`, err.message);
        failed++;
      });
  }

  // 1. Password Hashing and Seed Users
  await test('Default seed users are securely hashed with bcrypt', () => {
    const supplier = inMemoryDb.users.get('USR-SUPPLIER-01');
    assert(supplier, 'Supplier user should exist');
    assert(supplier.password_hash.startsWith('$2'), 'Password should be bcrypt hash');
    const isMatch = bcrypt.compareSync('password123', supplier.password_hash);
    assert(isMatch, 'Password should match default password');
  });

  // 2. User Registration
  let newUserId = '';
  await test('User registration creates account, hashes password, and issues JWT', async () => {
    const req = {
      body: {
        fullName: 'Vikash Singhania',
        email: 'vikash@newsupplier.com',
        password: 'securePassword2026!',
        role: 'SUPPLIER',
        organizationName: 'Singhania Logistics Pvt Ltd',
        gstin: '27AABCS1234F1Z1',
      },
    } as any;

    let resData: any = null;
    let statusCode = 200;
    const res = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (data: any) => {
        resData = data;
        return res;
      },
    } as any;

    await AuthController.register(req, res);
    assert.strictEqual(statusCode, 201);
    assert(resData.success);
    assert(resData.data.token, 'JWT token should be returned');
    assert.strictEqual(resData.data.user.email, 'vikash@newsupplier.com');
    newUserId = resData.data.user.id;

    // Verify JWT payload
    const decoded = jwt.verify(resData.data.token, JWT_SECRET) as any;
    assert.strictEqual(decoded.email, 'vikash@newsupplier.com');
    assert.strictEqual(decoded.role, 'SUPPLIER');
  });

  // 3. User Login (Valid Credentials)
  await test('User login succeeds with correct credentials and returns JWT', async () => {
    const req = {
      body: {
        email: 'priya@techparts.in',
        password: 'password123',
      },
    } as any;

    let resData: any = null;
    let statusCode = 200;
    const res = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (data: any) => {
        resData = data;
        return res;
      },
    } as any;

    await AuthController.login(req, res);
    assert.strictEqual(statusCode, 200);
    assert(resData.success);
    assert(resData.data.token);
    assert.strictEqual(resData.data.user.role, 'SUPPLIER');
  });

  // 4. User Login (Invalid Credentials Rejected)
  await test('User login fails on invalid password with HTTP 401', async () => {
    const req = {
      body: {
        email: 'priya@techparts.in',
        password: 'wrongPassword!',
      },
    } as any;

    let statusCode = 200;
    const res = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (data: any) => res,
    } as any;

    await AuthController.login(req, res);
    assert.strictEqual(statusCode, 401);
  });

  // 5. Financing Request Submission
  let createdReqId = '';
  await test('Supplier can submit financing request on accepted invoice', async () => {
    const invoice = await drunixGateway.getInvoiceById('INV-2026-001');
    assert(invoice, 'Invoice INV-2026-001 should exist');

    const result = await FinancingWorkflowService.requestFinancing({
      invoiceId: invoice.id,
      supplierOrgId: 'ORG-SUPPLIER-01',
      supplierUserId: 'USR-SUPPLIER-01',
      requestedAmount: 450000,
      requestedRate: 9.5,
      tenorDays: 30,
    });

    assert(result.id.startsWith('FIN-REQ-'));
    assert.strictEqual(result.requested_amount, 450000);
    assert.strictEqual(result.financing_status, 'PENDING');
    createdReqId = result.id;
  });

  // 6. Duplicate Financing Request Prevention
  await test('Duplicate active financing request is blocked', async () => {
    let threw = false;
    try {
      await FinancingWorkflowService.requestFinancing({
        invoiceId: 'INV-2026-001',
        supplierOrgId: 'ORG-SUPPLIER-01',
        supplierUserId: 'USR-SUPPLIER-01',
      });
    } catch (e: any) {
      threw = true;
      assert(e.message.includes('already exists'));
    }
    assert(threw, 'Should have thrown duplicate request error');
  });

  // 7. Financier Review & Approval with Mandatory Reason
  await test('Financier can approve financing request with underwriting reason', async () => {
    const approval = await FinancingWorkflowService.approveFinancing({
      requestId: createdReqId,
      financierUserId: 'USR-FINANCIER-01',
      financierOrgId: 'ORG-FINANCIER-01',
      financierOrgName: 'Apex Supply Chain Capital',
      decisionReason: 'Verified buyer acceptance, prime score 15, valid PO reconciliation.',
    });

    assert.strictEqual(approval.request.financing_status, 'APPROVED');
    assert.strictEqual(approval.request.decision_reason, 'Verified buyer acceptance, prime score 15, valid PO reconciliation.');
    assert.strictEqual(approval.invoice.status, 'FINANCED');
  });

  // 8. Audit Logging Verification
  await test('Audit logs record critical financing mutations with actor and metadata', async () => {
    const logs = await AuditNotificationService.getAuditLogs({
      userRole: 'AUDITOR',
      userOrgId: 'ORG-AUDITOR-01',
    });

    assert(logs.length > 0, 'Audit logs should be recorded');
    const financingLog = logs.find((l) => l.action === 'FINANCING_APPROVED');
    assert(financingLog, 'FINANCING_APPROVED audit log should exist');
    assert.strictEqual(financingLog.entity_type, 'FINANCING_REQUEST');
  });

  // 9. In-App Notifications
  await test('Notifications are generated for workflow events and marked as read', async () => {
    const notifs = await AuditNotificationService.getUserNotifications('USR-SUPPLIER-01');
    assert(notifs.length > 0, 'Supplier should have notifications');

    const firstNotif = notifs[0];
    assert(!firstNotif.is_read, 'Notification should initially be unread');

    const marked = await AuditNotificationService.markAsRead(firstNotif.id, 'USR-SUPPLIER-01');
    assert(marked, 'markAsRead should return true');
  });

  console.log(`\n======================================================================`);
  console.log(`PHASE 2/4/5/8 RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log(`======================================================================\n`);

  if (failed > 0) {
    throw new Error(`${failed} tests failed in Phase 2 test suite.`);
  }
}

if (require.main === module) {
  runAuthAndFinancingTests().catch((e) => {
    console.error('Test execution failed:', e);
    process.exit(1);
  });
}

export { runAuthAndFinancingTests };
