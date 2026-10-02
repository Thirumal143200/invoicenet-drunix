import { PaymentPredictionService, PredictedPaymentItem, PredictionFactor } from '../services/paymentPredictionService';
import { drunixGateway, Invoice } from '../services/drunixGateway';

export async function runPaymentPredictionTests(): Promise<{ passed: number; failed: number }> {
  console.log('======================================================================');
  console.log('  AI PAYMENT PREDICTION & 30-DAY CASH FLOW FORECASTING TEST SUITE');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${msg} ${detail ? `- ${detail}` : ''}`);
      failed++;
    }
  }

  // Anchor date for predictable testing
  const asOfDate = new Date('2026-10-02T12:00:00Z');
  const formatDate = (daysOffset: number) => {
    const d = new Date(asOfDate.getTime() + daysOffset * 24 * 60 * 60 * 1000);
    return d.toISOString();
  };

  const testSupplierOrg = 'TechParts Manufacturing Pvt. Ltd.';
  const testSupplierId = 'SP-101';
  const testBuyerOrg = 'AutoWorks Industries Ltd.';
  const testBuyerId = 'BY-201';
  const sparseBuyerOrg = 'New Startup Logistics Pvt. Ltd.';
  const sparseBuyerId = 'BY-999';
  const foreignSupplierOrg = 'Global Offshore Electronics Ltd.';
  const foreignSupplierId = 'SP-888';

  // 1. Two settled historical invoices for testBuyerOrg to establish empirical lag (+4 days lag)
  const paidInvoice1: Invoice = {
    id: 'INV-TEST-HIST-001',
    invoiceNumber: 'TP-2026-9001',
    supplierId: testSupplierId,
    supplierOrg: testSupplierOrg,
    buyerId: testBuyerId,
    buyerOrg: testBuyerOrg,
    amount: 250000,
    currency: 'INR',
    issueDate: formatDate(-60),
    dueDate: formatDate(-30),
    settlementDate: formatDate(-26), // 4 days after due date
    paymentReference: 'RTGS-TEST-001',
    description: 'Precision CNC parts batch 1',
    status: 'SETTLED',
    createdAt: formatDate(-60),
    updatedAt: formatDate(-26),
    blockNumber: 101,
    txId: 'tx_drunix_hist_001',
    endorsementHistory: [],
  };

  const paidInvoice2: Invoice = {
    id: 'INV-TEST-HIST-002',
    invoiceNumber: 'TP-2026-9002',
    supplierId: testSupplierId,
    supplierOrg: testSupplierOrg,
    buyerId: testBuyerId,
    buyerOrg: testBuyerOrg,
    amount: 300000,
    currency: 'INR',
    issueDate: formatDate(-45),
    dueDate: formatDate(-15),
    settlementDate: formatDate(-11), // 4 days after due date
    paymentReference: 'RTGS-TEST-002',
    description: 'Precision CNC parts batch 2',
    status: 'SETTLED',
    createdAt: formatDate(-45),
    updatedAt: formatDate(-11),
    blockNumber: 102,
    txId: 'tx_drunix_hist_002',
    endorsementHistory: [],
  };

  // 2. Active unpaid invoice for buyer with history (should have empirical prediction + behavioral factors)
  const activeInvoiceWithHistory: Invoice = {
    id: 'INV-TEST-ACTIVE-001',
    invoiceNumber: 'TP-2026-9003',
    supplierId: testSupplierId,
    supplierOrg: testSupplierOrg,
    buyerId: testBuyerId,
    buyerOrg: testBuyerOrg,
    amount: 450000,
    currency: 'INR',
    issueDate: formatDate(-10),
    dueDate: formatDate(6), // Due in 6 days
    description: 'Active chassis transmission components',
    status: 'ACCEPTED',
    createdAt: formatDate(-10),
    updatedAt: formatDate(-5),
    blockNumber: 103,
    txId: 'tx_drunix_active_001',
    endorsementHistory: [],
  };

  // 3. Unpaid invoice for brand new buyer with NO historical payments (sparse data fallback test)
  const sparseInvoice: Invoice = {
    id: 'INV-TEST-SPARSE-001',
    invoiceNumber: 'TP-2026-9004',
    supplierId: testSupplierId,
    supplierOrg: testSupplierOrg,
    buyerId: sparseBuyerId,
    buyerOrg: sparseBuyerOrg,
    amount: 180000,
    currency: 'INR',
    issueDate: formatDate(-5),
    dueDate: formatDate(14), // Due in 14 days
    description: 'First order with new logistics startup',
    status: 'CREATED',
    createdAt: formatDate(-5),
    updatedAt: formatDate(-5),
    blockNumber: 104,
    txId: 'tx_drunix_sparse_001',
    endorsementHistory: [],
  };

  // 4. Overdue invoice for late payment detection test
  const overdueInvoice: Invoice = {
    id: 'INV-TEST-OVERDUE-001',
    invoiceNumber: 'TP-2026-9005',
    supplierId: testSupplierId,
    supplierOrg: testSupplierOrg,
    buyerId: testBuyerId,
    buyerOrg: testBuyerOrg,
    amount: 220000,
    currency: 'INR',
    issueDate: formatDate(-35),
    dueDate: formatDate(-5), // 5 days overdue as of asOfDate
    description: 'Overdue sensor package',
    status: 'ACCEPTED',
    createdAt: formatDate(-35),
    updatedAt: formatDate(-35),
    blockNumber: 105,
    txId: 'tx_drunix_overdue_001',
    endorsementHistory: [],
  };

  // 5. Foreign supplier invoice for testing tenant isolation
  const foreignInvoice: Invoice = {
    id: 'INV-TEST-FOREIGN-001',
    invoiceNumber: 'GLOB-2026-9006',
    supplierId: foreignSupplierId,
    supplierOrg: foreignSupplierOrg,
    buyerId: 'BY-998',
    buyerOrg: 'Offshore Partner Inc.',
    amount: 850000,
    currency: 'INR',
    issueDate: formatDate(-10),
    dueDate: formatDate(12),
    description: 'Confidential foreign semiconductor batch',
    status: 'ACCEPTED',
    createdAt: formatDate(-10),
    updatedAt: formatDate(-10),
    blockNumber: 106,
    txId: 'tx_drunix_foreign_001',
    endorsementHistory: [],
  };

  // Register in drunixGateway
  drunixGateway.setInvoiceForTesting(paidInvoice1);
  drunixGateway.setInvoiceForTesting(paidInvoice2);
  drunixGateway.setInvoiceForTesting(activeInvoiceWithHistory);
  drunixGateway.setInvoiceForTesting(sparseInvoice);
  drunixGateway.setInvoiceForTesting(overdueInvoice);
  drunixGateway.setInvoiceForTesting(foreignInvoice);

  // ======================================================================
  // TEST SUITE 1: Counterparty Payment Profiling & Empirical Prediction
  // ======================================================================
  console.log('[TEST SUITE 1] Counterparty Profiling & Payment Prediction');
  try {
    const forecast = await PaymentPredictionService.generatePaymentForecast(
      'SUPPLIER',
      testSupplierOrg,
      testSupplierId,
      { asOfDate }
    );

    assert(forecast !== null, 'Payment forecast successfully returned result object');
    assert(forecast.predictedPayments.length >= 3, `Forecast contains at least 3 active predictions (actual: ${forecast.predictedPayments.length})`);

    const predictedActive = forecast.predictedPayments.find((p: PredictedPaymentItem) => p.id === activeInvoiceWithHistory.id);
    assert(!!predictedActive, 'Identified prediction for active invoice with payment history');

    if (predictedActive) {
      assert(
        predictedActive.modelType === 'EMPIRICAL_COUNTERPARTY_LAG_MODEL',
        `Model type uses EMPIRICAL_COUNTERPARTY_LAG_MODEL (got: ${predictedActive.modelType})`
      );
      assert(
        predictedActive.isEstimated === false,
        'isEstimated is false when sufficient historical data (N >= 2) exists'
      );
      assert(
        predictedActive.predictedDelayDays >= 2 && predictedActive.predictedDelayDays <= 5,
        `Predicted delay incorporates historical delay (+4 days avg lag, got: ${predictedActive.predictedDelayDays})`
      );
      assert(
        predictedActive.direction === 'INCOMING',
        'Direction is correctly labeled INCOMING for Supplier accounts receivable'
      );
      assert(
        predictedActive.predictionFactors.length >= 2,
        `Prediction generates transparent explainability factors (count: ${predictedActive.predictionFactors.length})`
      );
      assert(
        Boolean(predictedActive.recommendedAction),
        `Includes actionable recommendation: "${predictedActive.recommendedAction}"`
      );
    }

    // Verify counterparty profile calculation
    const profile = forecast.counterpartyProfiles[testBuyerOrg];
    assert(!!profile, `Generated counterparty profile for ${testBuyerOrg}`);
    if (profile) {
      assert(profile.settledInvoicesCount >= 2, `Settled invoices count >= 2 (got: ${profile.settledInvoicesCount})`);
      assert(profile.hasSufficientHistory === true, 'hasSufficientHistory is true');
      assert(profile.averageLagDays >= 2, `Computed average lag days >= 2 (got: ${profile.averageLagDays})`);
    }
  } catch (err: any) {
    assert(false, 'Counterparty profiling test failed', err.message);
  }

  // ======================================================================
  // TEST SUITE 2: Sparse Historical Data & Transparent Rule-Based Fallback
  // ======================================================================
  console.log('\n[TEST SUITE 2] Sparse Data Handling & Transparent Rule-Based Fallback');
  try {
    const forecast = await PaymentPredictionService.generatePaymentForecast(
      'SUPPLIER',
      testSupplierOrg,
      testSupplierId,
      { asOfDate }
    );

    const sparseItem = forecast.predictedPayments.find((p: PredictedPaymentItem) => p.id === sparseInvoice.id);
    assert(!!sparseItem, 'Found predicted item for buyer with sparse history');

    if (sparseItem) {
      assert(
        sparseItem.isEstimated === true,
        'isEstimated is strictly true when historical data is insufficient'
      );
      assert(
        sparseItem.modelType === 'RULE_BASED_CONTRACTUAL_ESTIMATE',
        `Model type is explicitly RULE_BASED_CONTRACTUAL_ESTIMATE (got: ${sparseItem.modelType})`
      );
      assert(
        sparseItem.confidenceScore <= 0.75,
        `Confidence score is appropriately constrained for unproven buyer (got: ${sparseItem.confidenceScore})`
      );

      const fallbackFactor = sparseItem.predictionFactors.find((f: PredictionFactor) =>
        f.description.includes('insufficient') || f.factor.includes('Baseline') || f.factor.includes('History')
      );
      assert(
        !!fallbackFactor,
        'Includes explicit transparency factor explaining fallback to contractual baseline'
      );
    }
  } catch (err: any) {
    assert(false, 'Sparse data handling test failed', err.message);
  }

  // ======================================================================
  // TEST SUITE 3: Late Payment Risk Identification & Explainability Factors
  // ======================================================================
  console.log('\n[TEST SUITE 3] Potential Late Payment Identification & Explainability Factors');
  try {
    const forecast = await PaymentPredictionService.generatePaymentForecast(
      'SUPPLIER',
      testSupplierOrg,
      testSupplierId,
      { asOfDate }
    );

    const overdueItem = forecast.predictedPayments.find((p: PredictedPaymentItem) => p.id === overdueInvoice.id);
    assert(!!overdueItem, 'Identified overdue invoice item');

    if (overdueItem) {
      assert(
        overdueItem.isOverdue === true,
        'Flagged isOverdue = true for past-due invoice'
      );
      assert(
        overdueItem.isPotentialLate === true,
        'Flagged isPotentialLate = true'
      );
      assert(
        overdueItem.riskLevel === 'HIGH' || overdueItem.riskLevel === 'CRITICAL',
        `Risk level is elevated to HIGH/CRITICAL (got: ${overdueItem.riskLevel})`
      );
      assert(
        overdueItem.predictedDelayDays >= 5,
        `Calculated predicted delay >= 5 days (got: ${overdueItem.predictedDelayDays})`
      );

      const overdueFactor = overdueItem.predictionFactors.find((f: PredictionFactor) =>
        f.factor.toLowerCase().includes('overdue') ||
        f.factor.toLowerCase().includes('maturity') ||
        f.impact.toLowerCase().includes('overdue') ||
        f.description.toLowerCase().includes('overdue')
      );
      assert(
        !!overdueFactor,
        'Generated overdue explanation factor specifying days past maturity'
      );
    }

    assert(
      forecast.summary.potentialLateInvoicesCount >= 1,
      `Summary counts potential late invoices >= 1 (got: ${forecast.summary.potentialLateInvoicesCount})`
    );
    assert(
      forecast.summary.totalOverdueAmount >= overdueInvoice.amount,
      `Summary calculates overdue amount accurately >= ₹${overdueInvoice.amount.toLocaleString('en-IN')} (got: ₹${forecast.summary.totalOverdueAmount})`
    );
  } catch (err: any) {
    assert(false, 'Late payment identification test failed', err.message);
  }

  // ======================================================================
  // TEST SUITE 4: 30-Day Cash Flow Timeline & Date Boundary Horizons
  // ======================================================================
  console.log('\n[TEST SUITE 4] 30-Day Cash Flow Timeline & Date Boundaries');
  try {
    const forecast = await PaymentPredictionService.generatePaymentForecast(
      'SUPPLIER',
      testSupplierOrg,
      testSupplierId,
      { asOfDate }
    );

    assert(
      forecast.dailyTimeline30Days.length === 31,
      `Generated exact 31-day daily timeline points (0 to 30) (got: ${forecast.dailyTimeline30Days.length})`
    );

    const day0 = forecast.dailyTimeline30Days[0];
    const day30 = forecast.dailyTimeline30Days[30];
    assert(day0.dayIndex === 0, 'First timeline point corresponds to Day 0 (today)');
    assert(day30.dayIndex === 30, 'Last timeline point corresponds to Day 30');

    // Verify mathematical integrity of cumulative cash flow
    let runningSum = 0;
    let sumMatches = true;
    for (const pt of forecast.dailyTimeline30Days) {
      runningSum += (pt.incomingAmount - pt.outgoingAmount);
      if (Math.abs(pt.cumulativeCashFlow - runningSum) > 0.01) {
        sumMatches = false;
      }
    }
    assert(sumMatches, 'Cumulative cash flow curve perfectly matches the cumulative sum of daily net flows');

    // Test Date Range Filter Options (NEXT_7_DAYS, NEXT_14_DAYS, NEXT_30_DAYS)
    const forecast7d = await PaymentPredictionService.generatePaymentForecast(
      'SUPPLIER',
      testSupplierOrg,
      testSupplierId,
      { asOfDate, dateRangePreset: 'NEXT_7_DAYS' }
    );
    assert(
      forecast7d.predictedPayments.every((p: PredictedPaymentItem) => {
        const diffDays = Math.ceil((new Date(p.expectedPaymentDate).getTime() - asOfDate.getTime()) / 86400000);
        return diffDays <= 7;
      }),
      'Date range preset NEXT_7_DAYS strictly filters predicted items to horizon <= 7 days'
    );
  } catch (err: any) {
    assert(false, 'Timeline test failed', err.message);
  }

  // ======================================================================
  // TEST SUITE 5: Role-Based Payment Direction (Supplier vs Buyer)
  // ======================================================================
  console.log('\n[TEST SUITE 5] Role-Based Direction Filtering (Supplier vs Buyer)');
  try {
    const buyerForecast = await PaymentPredictionService.generatePaymentForecast(
      'BUYER',
      testBuyerOrg,
      testBuyerId,
      { asOfDate }
    );

    assert(buyerForecast !== null, 'Buyer forecast generated successfully');
    const buyerPayments = buyerForecast.predictedPayments;
    assert(buyerPayments.length >= 2, `Buyer forecast shows active payables (count: ${buyerPayments.length})`);

    const allAreOutgoing = buyerPayments.every((p: PredictedPaymentItem) => p.direction === 'OUTGOING');
    assert(allAreOutgoing, 'All invoices under Buyer role are strictly categorized as OUTGOING payables');

    assert(
      buyerForecast.summary.totalForecastedOutgoing30d > 0,
      `Buyer summary shows totalForecastedOutgoing30d > 0 (₹${buyerForecast.summary.totalForecastedOutgoing30d.toLocaleString('en-IN')})`
    );
    assert(
      buyerForecast.summary.totalForecastedIncoming30d === 0,
      'Buyer summary totalForecastedIncoming30d is 0 (Accounts Payable flow)'
    );
  } catch (err: any) {
    assert(false, 'Role direction test failed', err.message);
  }

  // ======================================================================
  // TEST SUITE 6: Multi-Tenant Isolation & Zero Data Leakage
  // ======================================================================
  console.log('\n[TEST SUITE 6] Strict Tenant Isolation & Zero Data Leakage');
  try {
    // 1. Supplier only sees invoices where they are supplier
    const supplierForecast = await PaymentPredictionService.generatePaymentForecast(
      'SUPPLIER',
      testSupplierOrg,
      testSupplierId,
      { asOfDate }
    );
    const leakedForeignInSupplier = supplierForecast.predictedPayments.find((p: PredictedPaymentItem) => p.id === foreignInvoice.id);
    assert(!leakedForeignInSupplier, 'Tenant isolation blocks foreign supplier invoice from appearing in Supplier forecast');

    // 2. Buyer only sees invoices where they are buyer
    const buyerForecast = await PaymentPredictionService.generatePaymentForecast(
      'BUYER',
      testBuyerOrg,
      testBuyerId,
      { asOfDate }
    );
    const leakedForeignInBuyer = buyerForecast.predictedPayments.find((p: PredictedPaymentItem) => p.id === foreignInvoice.id);
    assert(!leakedForeignInBuyer, 'Tenant isolation blocks foreign invoice from appearing in Buyer forecast');

    // 3. Auditor / Admin role has ecosystem-wide governance access
    const auditorForecast = await PaymentPredictionService.generatePaymentForecast(
      'AUDITOR',
      'AuditAgencyMSP',
      'AU-401',
      { asOfDate }
    );
    const foundInAuditor = auditorForecast.predictedPayments.some((p: PredictedPaymentItem) => p.id === foreignInvoice.id);
    assert(foundInAuditor, 'Auditor role with governance clearance can inspect cross-tenant cash flow');
  } catch (err: any) {
    assert(false, 'Tenant isolation test failed', err.message);
  }

  console.log('\n======================================================================');
  console.log(`AI PAYMENT PREDICTION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================\n');

  return { passed, failed };
}
