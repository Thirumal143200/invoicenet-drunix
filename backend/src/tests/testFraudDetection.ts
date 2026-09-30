import { FraudDetectionService } from '../services/fraudDetectionService';
import { drunixGateway, Invoice } from '../services/drunixGateway';

async function runFraudTests() {
  console.log('======================================================================');
  console.log('       INVOICENET FRAUD & ANOMALY DETECTION TEST SUITE');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${msg}`);
      failed++;
    }
  }

  FraudDetectionService.initialize();

  // --- SUITE 1: REPEATED INVOICE REFERENCES ---
  console.log('[TEST SUITE 1] Repeated Invoice References');
  try {
    const inv1: Invoice = {
      id: 'INV-TEST-001',
      invoiceNumber: 'TP-DUPE-100',
      supplierId: 'SP-101',
      supplierOrg: 'TechParts Manufacturing',
      buyerId: 'BY-201',
      buyerOrg: 'AutoWorks Ltd',
      amount: 500000,
      currency: 'INR',
      issueDate: '2026-09-01T00:00:00Z',
      dueDate: '2026-11-01T00:00:00Z',
      description: 'Test batch 1',
      status: 'ACCEPTED',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      blockNumber: 1042,
      txId: 'tx_test_100',
      endorsementHistory: [],
    };

    const inv2: Invoice = {
      ...inv1,
      id: 'INV-TEST-002',
      txId: 'tx_test_101',
      blockNumber: 1043,
    };

    const alert = FraudDetectionService.checkRepeatedInvoiceReference(inv2, [inv1, inv2]);
    assert(alert !== null, 'Detected duplicate invoice reference collision');
    assert(alert?.anomalyType === 'REPEATED_INVOICE_REFERENCE', 'Anomaly type is REPEATED_INVOICE_REFERENCE');
    assert(alert?.severity === 'CRITICAL', 'Severity is flagged as CRITICAL');
    assert(alert?.evidence.conflictingInvoiceId === 'INV-TEST-001', 'Conflicting invoice ID matches previous record');
  } catch (err: any) {
    assert(false, `Repeated reference test failed: ${err.message}`);
  }

  // --- SUITE 2: STATISTICAL OUTLIER DETECTION & MISSING HISTORICAL DATA ---
  console.log('\n[TEST SUITE 2] Statistical Anomaly Detection & Missing History Handling');
  try {
    // Supplier with baseline invoices: ₹100,000, ₹110,000, ₹105,000 (mean ~₹105,000)
    const history: Invoice[] = [
      {
        id: 'INV-H1',
        invoiceNumber: 'TP-H1',
        supplierId: 'SP-STAT-1',
        supplierOrg: 'Alpha Parts',
        buyerId: 'BY-201',
        buyerOrg: 'AutoWorks Ltd',
        amount: 100000,
        currency: 'INR',
        issueDate: '2026-08-01T00:00:00Z',
        dueDate: '2026-10-01T00:00:00Z',
        description: 'Normal batch',
        status: 'ACCEPTED',
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-01T00:00:00Z',
        blockNumber: 1040,
        txId: 'tx_h1',
        endorsementHistory: [],
      },
      {
        id: 'INV-H2',
        invoiceNumber: 'TP-H2',
        supplierId: 'SP-STAT-1',
        supplierOrg: 'Alpha Parts',
        buyerId: 'BY-201',
        buyerOrg: 'AutoWorks Ltd',
        amount: 110000,
        currency: 'INR',
        issueDate: '2026-08-15T00:00:00Z',
        dueDate: '2026-10-15T00:00:00Z',
        description: 'Normal batch',
        status: 'ACCEPTED',
        createdAt: '2026-08-15T00:00:00Z',
        updatedAt: '2026-08-15T00:00:00Z',
        blockNumber: 1041,
        txId: 'tx_h2',
        endorsementHistory: [],
      },
      {
        id: 'INV-H3',
        invoiceNumber: 'TP-H3',
        supplierId: 'SP-STAT-1',
        supplierOrg: 'Alpha Parts',
        buyerId: 'BY-201',
        buyerOrg: 'AutoWorks Ltd',
        amount: 105000,
        currency: 'INR',
        issueDate: '2026-09-01T00:00:00Z',
        dueDate: '2026-11-01T00:00:00Z',
        description: 'Normal batch',
        status: 'ACCEPTED',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
        blockNumber: 1042,
        txId: 'tx_h3',
        endorsementHistory: [],
      },
    ];

    // Case A: High outlier (₹550,000 -> 5.2x mean)
    const outlierInvoice: Invoice = {
      ...history[0],
      id: 'INV-H-OUTLIER',
      invoiceNumber: 'TP-H-OUTLIER',
      amount: 550000,
    };
    const outlierAlert = FraudDetectionService.checkUnusualInvoiceAmount(outlierInvoice, [...history, outlierInvoice]);
    assert(outlierAlert !== null, 'Detected statistical amount deviation outlier');
    assert(outlierAlert?.anomalyType === 'UNUSUAL_INVOICE_AMOUNT', 'Anomaly type is UNUSUAL_INVOICE_AMOUNT');
    assert(Boolean(outlierAlert?.headline.includes('Requires Review')), 'Uses neutral non-accusatory label (Requires Review)');

    // Case B: Normal invoice (₹108,000) -> should NOT trigger alert (False Positive test)
    const normalInvoice: Invoice = {
      ...history[0],
      id: 'INV-H-NORMAL',
      invoiceNumber: 'TP-H-NORMAL',
      amount: 108000,
    };
    const normalAlert = FraudDetectionService.checkUnusualInvoiceAmount(normalInvoice, [...history, normalInvoice]);
    assert(normalAlert === null, 'Normal invoice did NOT generate a false positive');

    // Case C: Missing historical data (Brand new supplier with 0 prior invoices)
    const brandNewSupplierInvoice: Invoice = {
      ...history[0],
      supplierId: 'SP-NEW-999',
      id: 'INV-NEW-1',
      amount: 300000,
    };
    const missingHistoryAlert = FraudDetectionService.checkUnusualInvoiceAmount(brandNewSupplierInvoice, [brandNewSupplierInvoice]);
    assert(missingHistoryAlert === null, 'Missing historical records handled gracefully without raising false alarms');
  } catch (err: any) {
    assert(false, `Statistical outlier test failed: ${err.message}`);
  }

  // --- SUITE 3: VELOCITY SURGE & TEMPORAL INCONSISTENCY ---
  console.log('\n[TEST SUITE 3] Velocity Surge & Temporal Inconsistency Detection');
  try {
    const baseDate = new Date('2026-09-25T12:00:00Z');

    // Rapid batch of 4 invoices within 20 minutes
    const batchInvoices: Invoice[] = [0, 5, 10, 15].map((mins, idx) => ({
      id: `INV-VEL-${idx}`,
      invoiceNumber: `TP-VEL-${idx}`,
      supplierId: 'SP-VELOCITY-1',
      supplierOrg: 'FastParts Ltd',
      buyerId: 'BY-201',
      buyerOrg: 'AutoWorks Ltd',
      amount: 200000,
      currency: 'INR',
      issueDate: new Date(baseDate.getTime() + mins * 60000).toISOString(),
      dueDate: new Date(baseDate.getTime() + (mins + 60 * 24 * 30) * 60000).toISOString(),
      description: 'Rapid invoice',
      status: 'ACCEPTED',
      createdAt: new Date(baseDate.getTime() + mins * 60000).toISOString(),
      updatedAt: new Date(baseDate.getTime() + mins * 60000).toISOString(),
      blockNumber: 1050 + idx,
      txId: `tx_vel_${idx}`,
      endorsementHistory: [],
    }));

    const velocityAlert = FraudDetectionService.checkTransactionVelocity(batchInvoices[3], batchInvoices);
    assert(velocityAlert !== null, 'Detected rapid invoice creation velocity surge');
    assert(velocityAlert?.anomalyType === 'UNUSUAL_TRANSACTION_FREQUENCY', 'Anomaly type is UNUSUAL_TRANSACTION_FREQUENCY');

    // Temporal Inconsistency: Due Date before Issue Date
    const backwardsDateInvoice: Invoice = {
      ...batchInvoices[0],
      id: 'INV-TIME-PARADOX',
      invoiceNumber: 'TP-TIME-001',
      issueDate: '2026-09-25T12:00:00Z',
      dueDate: '2026-08-25T12:00:00Z', // 1 month prior to issue
    };
    const timeAlert = FraudDetectionService.checkInvoiceHistoryInconsistency(backwardsDateInvoice);
    assert(timeAlert !== null, 'Detected temporal date inconsistency (due date < issue date)');
    assert(timeAlert?.anomalyType === 'INVOICE_HISTORY_INCONSISTENCY', 'Anomaly type is INVOICE_HISTORY_INCONSISTENCY');
  } catch (err: any) {
    assert(false, `Velocity and temporal test failed: ${err.message}`);
  }

  // --- SUITE 4: DEDUPLICATION & CONCURRENCY ---
  console.log('\n[TEST SUITE 4] Alert Deduplication');
  try {
    const inv: Invoice = {
      id: 'INV-DEDUP-001',
      invoiceNumber: 'TP-DEDUP-001',
      supplierId: 'SP-101',
      supplierOrg: 'TechParts',
      buyerId: 'BY-201',
      buyerOrg: 'AutoWorks',
      amount: 100000,
      currency: 'INR',
      issueDate: '2026-09-20T00:00:00Z',
      dueDate: '2026-08-20T00:00:00Z', // Inconsistent date
      description: 'Dedupe test',
      status: 'ACCEPTED',
      createdAt: '2026-09-20T00:00:00Z',
      updatedAt: '2026-09-20T00:00:00Z',
      blockNumber: 1060,
      txId: 'tx_dedup_1',
      endorsementHistory: [],
    };

    const firstRun = FraudDetectionService.checkInvoiceHistoryInconsistency(inv);
    const secondRun = FraudDetectionService.checkInvoiceHistoryInconsistency(inv);

    assert(firstRun !== null, 'First scan generated alert');
    assert(secondRun === null, 'Subsequent scan for identical anomaly returned null (deduplicated)');
  } catch (err: any) {
    assert(false, `Deduplication test failed: ${err.message}`);
  }

  // --- SUITE 5: ROLE-BASED ACCESS CONTROL & DATA ISOLATION ---
  console.log('\n[TEST SUITE 5] Role-Based Access Control on Investigation Cases');
  try {
    const auditorAlerts = FraudDetectionService.getAllAlerts('EXPLORER', 'DRUNIX Consortium Node', 'Auditor-99');
    const financierAlerts = FraudDetectionService.getAllAlerts('FINANCIER', 'QuickFund Capital', 'FN-301');
    const supplierAlerts = FraudDetectionService.getAllAlerts('SUPPLIER', 'TechParts Manufacturing Pvt. Ltd.', 'SP-101');
    const otherSupplierAlerts = FraudDetectionService.getAllAlerts('SUPPLIER', 'Competitor Unrelated Org', 'SP-999');

    assert(auditorAlerts.length >= 3, `Auditor can inspect all alert cases (${auditorAlerts.length})`);
    assert(financierAlerts.length >= 3, `Financier can inspect network risk cases (${financierAlerts.length})`);
    assert(supplierAlerts.length > 0, `Supplier sees alerts involving TechParts (${supplierAlerts.length})`);
    assert(otherSupplierAlerts.length === 0, 'Unrelated supplier cannot see TechParts fraud alerts');

    // Supplier attempt to fetch case belonging to another entity
    const inaccessibleAlert = FraudDetectionService.getAlertById('ALT-2026-001', 'SUPPLIER', 'Competitor Org', 'SP-999');
    assert(inaccessibleAlert === null, 'Access to unauthorized alert detail was denied');
  } catch (err: any) {
    assert(false, `RBAC test failed: ${err.message}`);
  }

  // --- SUITE 6: INVESTIGATION WORKSPACE & AUDIT TRAIL LOGGING ---
  console.log('\n[TEST SUITE 6] Investigation Workspace & Audit Trail Integrity');
  try {
    const alertId = 'ALT-2026-002';
    const noteText = 'Auditor reviewed commercial contract and verified PO-2026-AUTOWORKS-092 delivery challan.';

    const updatedWithNote = FraudDetectionService.addInvestigationNote(
      alertId,
      'Auditor-99',
      'NetworkAuditor',
      noteText
    );

    assert(
      updatedWithNote.investigationNotes.some((n) => n.note === noteText),
      'Investigation note successfully appended to case'
    );
    assert(
      updatedWithNote.auditTrail.some((a) => a.action === 'NOTE_ADDED'),
      'Audit log entry created for NOTE_ADDED event'
    );

    const updatedStatus = FraudDetectionService.updateAlertStatus(
      alertId,
      'UNDER_REVIEW',
      'Auditor-99',
      'DRUNIX Consortium Node',
      'Case escalated to under-review status pending counter-party check.'
    );

    assert(updatedStatus.status === 'UNDER_REVIEW', 'Alert status updated to UNDER_REVIEW');
    const lastAudit = updatedStatus.auditTrail[updatedStatus.auditTrail.length - 1];
    assert(lastAudit.action === 'STATUS_UPDATED', 'Audit trail logged STATUS_UPDATED');
    assert(lastAudit.previousStatus === 'OPEN', 'Audit trail captured previousStatus: OPEN');
    assert(lastAudit.newStatus === 'UNDER_REVIEW', 'Audit trail captured newStatus: UNDER_REVIEW');

    // Verify metrics computation
    const metrics = FraudDetectionService.getMetrics('EXPLORER', 'DRUNIX Consortium Node', 'Auditor-99');
    assert(metrics.totalAlerts >= 3, `Metrics accurately summarize ${metrics.totalAlerts} total alerts`);
    assert(metrics.underReviewCases >= 1, `Metrics accurately count ${metrics.underReviewCases} under-review case`);
  } catch (err: any) {
    assert(false, `Audit trail test failed: ${err.message}`);
  }

  console.log('\n======================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runFraudTests().catch((e) => {
  console.error('Fatal test error in fraud suite:', e);
  process.exit(1);
});
