import { ReminderService } from '../services/reminderService';
import { ReminderSchedulerService } from '../services/reminderSchedulerService';
import { EmailService } from '../services/emailService';
import { drunixGateway, Invoice } from '../services/drunixGateway';
import { inMemoryDb } from '../db';

export async function runInvoiceReminderTests(): Promise<{ passed: number; failed: number }> {
  console.log('\n======================================================================');
  console.log('  AUTOMATED INVOICE REMINDER & NOTIFICATION TEST SUITE');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName} - ${detail || ''}`);
      failed++;
    }
  }

  // Clear existing reminders in test environment
  inMemoryDb.invoiceReminders.clear();
  EmailService.clearSentEmailsLog();

  // Reference Date for deterministic evaluation: 2026-10-03
  const refDate = new Date('2026-10-03T12:00:00Z');

  // Seed Controlled Invoices for All 6 Intervals
  // 1. -7 Days Before: Due in 7 days (2026-10-10)
  const invBefore7: Invoice = {
    id: 'INV-TEST-REM-001',
    invoiceNumber: 'TP-REM-7D',
    supplierId: 'ORG-SUPPLIER-01',
    supplierOrg: 'TechParts Manufacturing Pvt. Ltd.',
    buyerId: 'ORG-BUYER-01',
    buyerOrg: 'AutoWorks Industries Ltd.',
    amount: 150000,
    currency: 'INR',
    issueDate: '2026-09-10T00:00:00Z',
    dueDate: '2026-10-10T12:00:00Z',
    description: 'Precision gears due in 7 days',
    status: 'ACCEPTED',
    createdAt: '2026-09-10T00:00:00Z',
    updatedAt: '2026-09-10T00:00:00Z',
    blockNumber: 1050,
    txId: 'tx_rem_test_001',
    endorsementHistory: [],
  };

  // 2. -3 Days Before: Due in 3 days (2026-10-06)
  const invBefore3: Invoice = {
    id: 'INV-TEST-REM-002',
    invoiceNumber: 'TP-REM-3D',
    supplierId: 'ORG-SUPPLIER-01',
    supplierOrg: 'TechParts Manufacturing Pvt. Ltd.',
    buyerId: 'ORG-BUYER-01',
    buyerOrg: 'AutoWorks Industries Ltd.',
    amount: 220000,
    currency: 'INR',
    issueDate: '2026-09-15T00:00:00Z',
    dueDate: '2026-10-06T12:00:00Z',
    description: 'Brake pads due in 3 days',
    status: 'ACCEPTED',
    createdAt: '2026-09-15T00:00:00Z',
    updatedAt: '2026-09-15T00:00:00Z',
    blockNumber: 1051,
    txId: 'tx_rem_test_002',
    endorsementHistory: [],
  };

  // 3. Due Today: Due on 2026-10-03
  const invDueToday: Invoice = {
    id: 'INV-TEST-REM-003',
    invoiceNumber: 'TP-REM-TODAY',
    supplierId: 'ORG-SUPPLIER-01',
    supplierOrg: 'TechParts Manufacturing Pvt. Ltd.',
    buyerId: 'ORG-BUYER-01',
    buyerOrg: 'AutoWorks Industries Ltd.',
    amount: 500000,
    currency: 'INR',
    issueDate: '2026-09-01T00:00:00Z',
    dueDate: '2026-10-03T12:00:00Z',
    description: 'Transmission shafts due today',
    status: 'ACCEPTED',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    blockNumber: 1052,
    txId: 'tx_rem_test_003',
    endorsementHistory: [],
  };

  // 4. +1 Day Overdue: Due on 2026-10-02 (1 day ago)
  const invOverdue1: Invoice = {
    id: 'INV-TEST-REM-004',
    invoiceNumber: 'TP-REM-OVD1',
    supplierId: 'ORG-SUPPLIER-01',
    supplierOrg: 'TechParts Manufacturing Pvt. Ltd.',
    buyerId: 'ORG-BUYER-01',
    buyerOrg: 'AutoWorks Industries Ltd.',
    amount: 310000,
    currency: 'INR',
    issueDate: '2026-08-20T00:00:00Z',
    dueDate: '2026-10-02T12:00:00Z',
    description: 'Hydraulic valves 1 day overdue',
    status: 'ACCEPTED',
    createdAt: '2026-08-20T00:00:00Z',
    updatedAt: '2026-08-20T00:00:00Z',
    blockNumber: 1053,
    txId: 'tx_rem_test_004',
    endorsementHistory: [],
  };

  // 5. +3 Days Overdue: Due on 2026-09-30 (3 days ago)
  const invOverdue3: Invoice = {
    id: 'INV-TEST-REM-005',
    invoiceNumber: 'TP-REM-OVD3',
    supplierId: 'ORG-SUPPLIER-01',
    supplierOrg: 'TechParts Manufacturing Pvt. Ltd.',
    buyerId: 'ORG-BUYER-01',
    buyerOrg: 'AutoWorks Industries Ltd.',
    amount: 450000,
    currency: 'INR',
    issueDate: '2026-08-15T00:00:00Z',
    dueDate: '2026-09-30T12:00:00Z',
    description: 'Sensors 3 days overdue',
    status: 'ACCEPTED',
    createdAt: '2026-08-15T00:00:00Z',
    updatedAt: '2026-08-15T00:00:00Z',
    blockNumber: 1054,
    txId: 'tx_rem_test_005',
    endorsementHistory: [],
  };

  // 6. +7 Days Overdue: Due on 2026-09-26 (7 days ago)
  const invOverdue7: Invoice = {
    id: 'INV-TEST-REM-006',
    invoiceNumber: 'TP-REM-OVD7',
    supplierId: 'ORG-SUPPLIER-01',
    supplierOrg: 'TechParts Manufacturing Pvt. Ltd.',
    buyerId: 'ORG-BUYER-01',
    buyerOrg: 'AutoWorks Industries Ltd.',
    amount: 600000,
    currency: 'INR',
    issueDate: '2026-08-10T00:00:00Z',
    dueDate: '2026-09-26T12:00:00Z',
    description: 'Engine blocks 7 days overdue',
    status: 'ACCEPTED',
    createdAt: '2026-08-10T00:00:00Z',
    updatedAt: '2026-08-10T00:00:00Z',
    blockNumber: 1055,
    txId: 'tx_rem_test_006',
    endorsementHistory: [],
  };

  // 7. Settled Invoice (Should NEVER generate reminders)
  const invSettled: Invoice = {
    id: 'INV-TEST-REM-007',
    invoiceNumber: 'TP-REM-SETTLED',
    supplierId: 'ORG-SUPPLIER-01',
    supplierOrg: 'TechParts Manufacturing Pvt. Ltd.',
    buyerId: 'ORG-BUYER-01',
    buyerOrg: 'AutoWorks Industries Ltd.',
    amount: 800000,
    currency: 'INR',
    issueDate: '2026-08-01T00:00:00Z',
    dueDate: '2026-10-03T12:00:00Z', // due today, but settled!
    settlementDate: '2026-10-02T15:00:00Z',
    description: 'Fully settled invoice',
    status: 'SETTLED',
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-10-02T15:00:00Z',
    blockNumber: 1056,
    txId: 'tx_rem_test_007',
    endorsementHistory: [],
  };

  // Register in drunix gateway
  drunixGateway.setInvoiceForTesting(invBefore7);
  drunixGateway.setInvoiceForTesting(invBefore3);
  drunixGateway.setInvoiceForTesting(invDueToday);
  drunixGateway.setInvoiceForTesting(invOverdue1);
  drunixGateway.setInvoiceForTesting(invOverdue3);
  drunixGateway.setInvoiceForTesting(invOverdue7);
  drunixGateway.setInvoiceForTesting(invSettled);

  // -------------------------------------------------------------
  // Test 1: Interval Matching Calculation
  // -------------------------------------------------------------
  console.log('[TEST 1] Due-Date Boundary & Interval Matching');
  const m1 = ReminderService.getMatchingInterval('2026-10-10T12:00:00Z', refDate);
  assert(m1?.type === 'BEFORE_7_DAYS' && m1?.intervalDays === -7, 'Identifies 7 days before due date (BEFORE_7_DAYS)');

  const m2 = ReminderService.getMatchingInterval('2026-10-06T12:00:00Z', refDate);
  assert(m2?.type === 'BEFORE_3_DAYS' && m2?.intervalDays === -3, 'Identifies 3 days before due date (BEFORE_3_DAYS)');

  const m3 = ReminderService.getMatchingInterval('2026-10-03T12:00:00Z', refDate);
  assert(m3?.type === 'DUE_TODAY' && m3?.intervalDays === 0, 'Identifies due today date (DUE_TODAY)');

  const m4 = ReminderService.getMatchingInterval('2026-10-02T12:00:00Z', refDate);
  assert(m4?.type === 'OVERDUE_1_DAY' && m4?.intervalDays === 1, 'Identifies 1 day overdue (OVERDUE_1_DAY)');

  const m5 = ReminderService.getMatchingInterval('2026-09-30T12:00:00Z', refDate);
  assert(m5?.type === 'OVERDUE_3_DAYS' && m5?.intervalDays === 3, 'Identifies 3 days overdue (OVERDUE_3_DAYS)');

  const m6 = ReminderService.getMatchingInterval('2026-09-26T12:00:00Z', refDate);
  assert(m6?.type === 'OVERDUE_7_DAYS' && m6?.intervalDays === 7, 'Identifies 7 days overdue (OVERDUE_7_DAYS)');

  const mNone = ReminderService.getMatchingInterval('2026-10-25T12:00:00Z', refDate);
  assert(mNone === null, 'Returns null for non-matching date interval (+22 days)');

  // -------------------------------------------------------------
  // Test 2: Automated Reminder Evaluation & Generation
  // -------------------------------------------------------------
  console.log('\n[TEST 2] Automated Reminder Generation Across All Intervals');
  const initialReport = await ReminderService.evaluateAndGenerateReminders(refDate);

  // 6 matching invoices x 2 roles (Buyer + Supplier) = 12 reminders
  assert(initialReport.generatedRemindersCount === 12, `Generated 12 reminders for 6 active invoices across Buyer & Supplier (actual: ${initialReport.generatedRemindersCount})`);
  assert(initialReport.emailDeliverySummary.mocked === 12 || initialReport.emailDeliverySummary.delivered === 12, 'All emails dispatched or simulated without error');

  // Verify reminders in store
  const allReminders = Array.from(inMemoryDb.invoiceReminders.values());
  const before7Rem = allReminders.find((r) => r.invoice_id === invBefore7.id && r.recipient_role === 'BUYER');
  assert(before7Rem !== undefined && before7Rem.reminder_type === 'BEFORE_7_DAYS', 'Stored 7-day upcoming reminder for Buyer');

  const overdue7Rem = allReminders.find((r) => r.invoice_id === invOverdue7.id && r.recipient_role === 'BUYER');
  assert(overdue7Rem !== undefined && overdue7Rem.reminder_type === 'OVERDUE_7_DAYS', 'Stored 7-day overdue reminder for Buyer');

  // -------------------------------------------------------------
  // Test 3: Settled Invoices Suppress Reminders
  // -------------------------------------------------------------
  console.log('\n[TEST 3] Settled & Cancelled Invoices Stop Reminders');
  const settledReminder = allReminders.find((r) => r.invoice_id === invSettled.id);
  assert(settledReminder === undefined, 'No reminders generated for settled invoice INV-TEST-REM-007');
  assert(initialReport.skippedDueToSettlement >= 1, 'Settled invoice explicitly skipped in report');

  // -------------------------------------------------------------
  // Test 4: Duplicate Prevention (Idempotent Execution)
  // -------------------------------------------------------------
  console.log('\n[TEST 4] PostgreSQL & In-Memory Duplicate Prevention');
  const secondReport = await ReminderService.evaluateAndGenerateReminders(refDate);
  assert(secondReport.generatedRemindersCount === 0, 'Second scan generates 0 new reminders');
  assert(secondReport.skippedDueToDeduplication >= 12, `Second scan skipped all 12 duplicate intervals (actual: ${secondReport.skippedDueToDeduplication})`);
  assert(inMemoryDb.invoiceReminders.size === 12, 'Total reminders count in store remains exactly 12');

  // -------------------------------------------------------------
  // Test 5: Email Service Adapter & Graceful Failure Handling
  // -------------------------------------------------------------
  console.log('\n[TEST 5] Email Service Adapter & Failed Delivery Handling');
  // Format check
  const formatted = EmailService.formatReminderEmail({
    invoiceNumber: 'TP-TEST-99',
    amount: 100000,
    dueDate: '2026-10-03',
    reminderType: 'DUE_TODAY',
    intervalDays: 0,
    recipientRole: 'BUYER',
    counterPartyOrg: 'TechParts Manufacturing',
  });
  assert(formatted.subject.includes('Due Today'), 'Email subject formats urgency for DUE_TODAY');
  assert(formatted.bodyHtml.includes('₹1,00,000'), 'Email HTML template formats Indian Rupee amount');

  // Test simulated failure: Simulate downstream gateway error
  EmailService.simulateFailure(true);
  const failResult = await EmailService.sendReminderEmail({
    to: 'buyer@autoworks.com',
    subject: 'Test failure email',
    invoiceNumber: 'TP-FAIL-01',
    amount: 50000,
    dueDate: '2026-10-03',
    reminderType: 'OVERDUE_1_DAY',
    intervalDays: 1,
    bodyText: 'Test body',
  });
  assert(failResult.success === false, 'Handles simulated transport failure');
  assert(failResult.status === 'FAILED', 'Status marked as FAILED');
  assert(failResult.error?.includes('timeout') || failResult.error?.length! > 0, 'Captures error message safely');

  // Verify normal sending recovers immediately
  const normalResult = await EmailService.sendReminderEmail({
    to: 'buyer@autoworks.com',
    subject: 'Normal test email',
    invoiceNumber: 'TP-OK-01',
    amount: 50000,
    dueDate: '2026-10-03',
    reminderType: 'OVERDUE_1_DAY',
    intervalDays: 1,
    bodyText: 'Test body',
  });
  assert(normalResult.success === true, 'Service resumes normal transmission after simulated failure');

  // -------------------------------------------------------------
  // Test 6: Role-Based Access Control & Strict Tenant Isolation
  // -------------------------------------------------------------
  console.log('\n[TEST 6] Role-Based Access Control & Tenant Isolation');
  // Buyer query
  const buyerReminders = await ReminderService.getReminders({
    userRole: 'BUYER',
    userOrgId: 'ORG-BUYER-01',
    userOrgName: 'AutoWorks Industries Ltd.',
  });
  assert(buyerReminders.items.length === 6, `Buyer sees only 6 payable reminders (actual: ${buyerReminders.items.length})`);
  assert(buyerReminders.items.every((r) => r.recipient_role === 'BUYER'), 'All items returned for Buyer have recipient_role = BUYER');

  // Supplier query
  const supplierReminders = await ReminderService.getReminders({
    userRole: 'SUPPLIER',
    userOrgId: 'ORG-SUPPLIER-01',
    userOrgName: 'TechParts Manufacturing Pvt. Ltd.',
  });
  assert(supplierReminders.items.length === 6, `Supplier sees only 6 receivable reminders (actual: ${supplierReminders.items.length})`);
  assert(supplierReminders.items.every((r) => r.recipient_role === 'SUPPLIER'), 'All items returned for Supplier have recipient_role = SUPPLIER');

  // Foreign Organization (e.g. Metro Fleet Mobility Corp) must see ZERO reminders from AutoWorks/TechParts
  const foreignReminders = await ReminderService.getReminders({
    userRole: 'BUYER',
    userOrgId: 'ORG-BUYER-FOREIGN',
    userOrgName: 'Foreign Industries Global Ltd.',
  });
  assert(foreignReminders.items.length === 0, 'Foreign organization receives 0 reminders (Tenant Isolation verified)');

  // Auditor query: Full consortium visibility
  const auditorReminders = await ReminderService.getReminders({
    userRole: 'AUDITOR',
    userOrgId: 'ORG-AUDITOR-01',
  });
  assert(auditorReminders.items.length === 12, 'Consortium Auditor has full visibility across all 12 reminders');

  // -------------------------------------------------------------
  // Test 7: Filters (Upcoming, Due Today, Overdue, Unread)
  // -------------------------------------------------------------
  console.log('\n[TEST 7] Dashboard Filter Tabs (Upcoming, Due Today, Overdue, Unread)');
  const upcomingFilter = await ReminderService.getReminders({
    userRole: 'AUDITOR',
    filter: 'UPCOMING',
  });
  // 2 invoices (7d, 3d) x 2 roles = 4 reminders
  assert(upcomingFilter.items.length === 4, `UPCOMING filter returns 4 reminders (actual: ${upcomingFilter.items.length})`);
  assert(upcomingFilter.items.every((r) => r.interval_days < 0), 'All UPCOMING reminders have interval_days < 0');

  const dueTodayFilter = await ReminderService.getReminders({
    userRole: 'AUDITOR',
    filter: 'DUE_TODAY',
  });
  // 1 invoice x 2 roles = 2 reminders
  assert(dueTodayFilter.items.length === 2, `DUE_TODAY filter returns 2 reminders (actual: ${dueTodayFilter.items.length})`);
  assert(dueTodayFilter.items.every((r) => r.interval_days === 0), 'All DUE_TODAY reminders have interval_days = 0');

  const overdueFilter = await ReminderService.getReminders({
    userRole: 'AUDITOR',
    filter: 'OVERDUE',
  });
  // 3 invoices (1d, 3d, 7d) x 2 roles = 6 reminders
  assert(overdueFilter.items.length === 6, `OVERDUE filter returns 6 reminders (actual: ${overdueFilter.items.length})`);
  assert(overdueFilter.items.every((r) => r.interval_days > 0), 'All OVERDUE reminders have interval_days > 0');

  // -------------------------------------------------------------
  // Test 8: Read Status Mutations & Summary Metrics
  // -------------------------------------------------------------
  console.log('\n[TEST 8] Read Status Mutations & Summary KPIs');
  const targetToRead = buyerReminders.items[0];
  const markReadSuccess = await ReminderService.markAsRead(targetToRead.id);
  assert(markReadSuccess === true, 'Successfully marked individual reminder as read');

  const updatedItem = inMemoryDb.invoiceReminders.get(targetToRead.id);
  assert(updatedItem?.is_read === true, 'Reminder is_read is true in store');

  // Summary Metrics
  const summaryBuyer = await ReminderService.getSummary({
    userRole: 'BUYER',
    userOrgId: 'ORG-BUYER-01',
    userOrgName: 'AutoWorks Industries Ltd.',
  });
  assert(summaryBuyer.totalReminders === 6, 'Summary reports 6 total reminders for Buyer');
  assert(summaryBuyer.unreadCount === 5, 'Summary reports 5 unread reminders after marking 1 read');
  assert(summaryBuyer.overdueCount === 3, 'Summary reports 3 overdue reminders for Buyer');
  assert(summaryBuyer.dueTodayCount === 1, 'Summary reports 1 due today reminder for Buyer');

  // Mark all read
  const markedAllCount = await ReminderService.markAllAsRead({
    userRole: 'BUYER',
    userOrgId: 'ORG-BUYER-01',
  });
  assert(markedAllCount === 5, `markAllAsRead marked remaining 5 unread items for Buyer (actual: ${markedAllCount})`);

  const summaryAfterMarkAll = await ReminderService.getSummary({
    userRole: 'BUYER',
    userOrgId: 'ORG-BUYER-01',
    userOrgName: 'AutoWorks Industries Ltd.',
  });
  assert(summaryAfterMarkAll.unreadCount === 0, 'Unread count is 0 after markAllAsRead');

  // -------------------------------------------------------------
  // Test 9: Reminder Preferences Configuration
  // -------------------------------------------------------------
  console.log('\n[TEST 9] User & Organization Reminder Preferences');
  const prefs = await ReminderService.getPreferences('USR-TEST-01', 'ORG-TEST-01');
  assert(prefs.email_enabled === true, 'Default preferences have email_enabled = true');
  assert(prefs.enabled_intervals.length === 6, 'Default preferences include all 6 standard intervals');

  const updatedPrefs = await ReminderService.updatePreferences('USR-TEST-01', 'ORG-TEST-01', {
    email_enabled: false,
    enabled_intervals: [0, 1, 3, 7], // disabled -7 and -3
    minimum_amount: 200000,
  });
  assert(updatedPrefs.email_enabled === false, 'Updated preference email_enabled = false');
  assert(!updatedPrefs.enabled_intervals.includes(-7), 'Interval -7 is excluded');
  assert(updatedPrefs.minimum_amount === 200000, 'Minimum amount threshold updated to ₹2,00,000');

  // -------------------------------------------------------------
  // Test 10: Background Scheduler Telemetry & Catch-up
  // -------------------------------------------------------------
  console.log('\n[TEST 10] Background Scheduler Telemetry & Restart Catch-up');
  const schedulerStatus = ReminderSchedulerService.getStatus();
  assert(schedulerStatus.intervalMinutes > 0, 'Scheduler reports valid interval minutes');
  assert(schedulerStatus.totalRunsCount >= 0, 'Scheduler tracks total runs count');

  // Trigger manual scheduler run
  const schedulerRunReport = await ReminderSchedulerService.executeScan('UNIT_TEST_TRIGGER', refDate);
  assert(schedulerRunReport !== undefined, 'Scheduler executeScan returns execution report');
  assert(schedulerRunReport.timestamp.length > 0, 'Scan report contains valid ISO timestamp');

  console.log('\n======================================================================');
  console.log(`INVOICE REMINDER TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('======================================================================\n');

  return { passed, failed };
}
