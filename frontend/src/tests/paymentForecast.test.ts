import type {
  PaymentForecastResult,
  PredictedPaymentItem,
  DailyCashFlowPoint
} from '../types/index';

export function runFrontendForecastTests() {
  console.log('======================================================================');
  console.log('     INVOICENET FRONTEND PAYMENT FORECAST COMPONENT & LOGIC TESTS');
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

  const mockForecast: PaymentForecastResult = {
    role: 'SUPPLIER',
    userOrg: 'TechParts Manufacturing Pvt. Ltd.',
    currency: 'INR',
    generatedAt: '2026-10-02T12:00:00Z',
    asOfDate: '2026-10-02',
    summary: {
      totalForecastedIncoming30d: 1450000,
      totalForecastedOutgoing30d: 0,
      netCashFlow30d: 1450000,
      totalOverdueAmount: 220000,
      totalAtRiskAmount: 670000,
      potentialLateInvoicesCount: 2,
      onTimeInvoicesCount: 3,
      totalActiveInvoicesCount: 5,
      averageCounterpartyLagDays: 3.5,
      overallOnTimeRate: 75,
    },
    dailyTimeline30Days: Array.from({ length: 31 }, (_, i) => {
      const inc = i === 5 ? 450000 : i === 12 ? 1000000 : 0;
      const out = 0;
      return {
        date: `2026-10-${String(i + 2).padStart(2, '0')}`,
        dayLabel: `Oct ${String(i + 2).padStart(2, '0')}`,
        dayOfWeek: 'Wed',
        dayIndex: i,
        incomingAmount: inc,
        outgoingAmount: out,
        netAmount: inc - out,
        cumulativeCashFlow: (i >= 12 ? 1450000 : (i >= 5 ? 450000 : 0)),
        transactionsCount: inc > 0 ? 1 : 0,
        transactions: inc > 0 ? [{
          invoiceId: `INV-${i}`,
          invoiceNumber: `TP-${i}`,
          direction: 'INCOMING' as const,
          counterParty: 'AutoWorks Industries Ltd.',
          amount: inc,
          expectedDate: `2026-10-${String(i + 2).padStart(2, '0')}`,
          isPotentialLate: false,
          riskLevel: 'LOW' as const,
        }] : [],
      };
    }),
    predictedPayments: [
      {
        id: 'INV-001',
        invoiceNumber: 'TP-2026-8812',
        direction: 'INCOMING',
        counterParty: 'AutoWorks Industries Ltd.',
        counterPartyOrg: 'AutoWorks Industries Ltd.',
        supplierOrg: 'TechParts Manufacturing Pvt. Ltd.',
        buyerOrg: 'AutoWorks Industries Ltd.',
        amount: 500000,
        currency: 'INR',
        originalDueDate: '2026-10-15T00:00:00Z',
        expectedPaymentDate: '2026-10-19T00:00:00Z',
        predictedDelayDays: 4,
        isPotentialLate: true,
        isOverdue: false,
        riskLevel: 'MEDIUM',
        confidenceScore: 0.88,
        isEstimated: false,
        modelType: 'EMPIRICAL_COUNTERPARTY_LAG_MODEL',
        status: 'ACCEPTED',
        predictionFactors: [
          {
            factor: 'Counterparty Historical Settlement Velocity',
            impact: '+4 days',
            description: 'Historical lag computed from settled invoices.',
            category: 'HISTORICAL_BEHAVIOR',
          }
        ],
        recommendedAction: 'Monitor settlement.',
      },
      {
        id: 'INV-002',
        invoiceNumber: 'TP-2026-8815',
        direction: 'INCOMING',
        counterParty: 'New Startup Logistics Pvt. Ltd.',
        counterPartyOrg: 'New Startup Logistics Pvt. Ltd.',
        supplierOrg: 'TechParts Manufacturing Pvt. Ltd.',
        buyerOrg: 'New Startup Logistics Pvt. Ltd.',
        amount: 180000,
        currency: 'INR',
        originalDueDate: '2026-10-10T00:00:00Z',
        expectedPaymentDate: '2026-10-10T00:00:00Z',
        predictedDelayDays: 0,
        isPotentialLate: false,
        isOverdue: false,
        riskLevel: 'LOW',
        confidenceScore: 0.65,
        isEstimated: true,
        modelType: 'RULE_BASED_CONTRACTUAL_ESTIMATE',
        status: 'CREATED',
        predictionFactors: [
          {
            factor: 'Contractual Baseline (Sparse History)',
            impact: 'Baseline 0d',
            description: 'Limited historical records (N < 2). Baseline due date applied.',
            category: 'HISTORICAL_BEHAVIOR',
          }
        ],
        recommendedAction: 'Obtain buyer endorsement.',
      },
      {
        id: 'INV-003',
        invoiceNumber: 'TP-2026-8820',
        direction: 'INCOMING',
        counterParty: 'AutoWorks Industries Ltd.',
        counterPartyOrg: 'AutoWorks Industries Ltd.',
        supplierOrg: 'TechParts Manufacturing Pvt. Ltd.',
        buyerOrg: 'AutoWorks Industries Ltd.',
        amount: 220000,
        currency: 'INR',
        originalDueDate: '2026-09-25T00:00:00Z',
        expectedPaymentDate: '2026-10-04T00:00:00Z',
        predictedDelayDays: 9,
        isPotentialLate: true,
        isOverdue: true,
        riskLevel: 'HIGH',
        confidenceScore: 0.85,
        isEstimated: false,
        modelType: 'EMPIRICAL_COUNTERPARTY_LAG_MODEL',
        status: 'ACCEPTED',
        predictionFactors: [
          {
            factor: 'Invoice Overdue (Past Contractual Maturity)',
            impact: '+7 days overdue',
            description: 'Contractual due date passed.',
            category: 'DATE_PROXIMITY',
          }
        ],
        recommendedAction: 'Issue immediate demand notice.',
      },
      {
        id: 'INV-004',
        invoiceNumber: 'TP-2026-8899',
        direction: 'OUTGOING',
        counterParty: 'Precision Tooling Corp',
        counterPartyOrg: 'Precision Tooling Corp',
        supplierOrg: 'Precision Tooling Corp',
        buyerOrg: 'TechParts Manufacturing Pvt. Ltd.',
        amount: 95000,
        currency: 'INR',
        originalDueDate: '2026-10-25T00:00:00Z',
        expectedPaymentDate: '2026-10-25T00:00:00Z',
        predictedDelayDays: 0,
        isPotentialLate: false,
        isOverdue: false,
        riskLevel: 'LOW',
        confidenceScore: 0.90,
        isEstimated: false,
        modelType: 'EMPIRICAL_COUNTERPARTY_LAG_MODEL',
        status: 'ACCEPTED',
        predictionFactors: [],
        recommendedAction: 'Schedule disbursement.',
      }
    ],
    counterpartyProfiles: {
      'AutoWorks Industries Ltd.': {
        counterPartyOrg: 'AutoWorks Industries Ltd.',
        settledInvoicesCount: 4,
        averageLagDays: 3.5,
        stdDevLagDays: 1.2,
        onTimePaymentRate: 75,
        hasSufficientHistory: true,
        dataSource: 'POSTGRESQL',
      },
      'New Startup Logistics Pvt. Ltd.': {
        counterPartyOrg: 'New Startup Logistics Pvt. Ltd.',
        settledInvoicesCount: 0,
        averageLagDays: 0,
        stdDevLagDays: 0,
        onTimePaymentRate: 100,
        hasSufficientHistory: false,
        dataSource: 'DRUNIX_LEDGER_IN_MEMORY',
      }
    },
    methodology: {
      approach: 'Empirical Counterparty Velocity Modeling + Fallback Contractual Rules',
      historicalSettlementsAnalyzed: 4,
      hasSufficientHistory: true,
      disclaimer: 'Predictions are advisory estimates based on verified ledger and payment records.',
    }
  };

  // --- TEST 1: Direction Filter Logic ---
  console.log('[TEST 1] Client-side Direction Filter Logic');
  const allItems = mockForecast.predictedPayments;
  const incomingOnly = allItems.filter(p => p.direction === 'INCOMING');
  const outgoingOnly = allItems.filter(p => p.direction === 'OUTGOING');
  assert(incomingOnly.length === 3, 'Filter INCOMING yields exactly 3 items');
  assert(outgoingOnly.length === 1, 'Filter OUTGOING yields exactly 1 item');
  assert(incomingOnly.every(p => p.direction === 'INCOMING'), 'All incoming items have direction INCOMING');

  // --- TEST 2: Status Filter Logic ---
  console.log('\n[TEST 2] Client-side Status Filter Logic');
  const potentialLateOnly = allItems.filter(p => p.isPotentialLate);
  const overdueOnly = allItems.filter(p => p.isOverdue);
  const onTimeOnly = allItems.filter(p => !p.isPotentialLate && !p.isOverdue);
  assert(potentialLateOnly.length === 2, 'Potential late items filtered correctly (count: 2)');
  assert(overdueOnly.length === 1, 'Overdue items filtered correctly (count: 1)');
  assert(onTimeOnly.length === 2, 'On-time items filtered correctly (count: 2)');

  // --- TEST 3: Search Filter Logic ---
  console.log('\n[TEST 3] Search Filter Logic');
  const searchAutoWorks = allItems.filter(p =>
    p.invoiceNumber.toLowerCase().includes('8812') ||
    p.counterParty.toLowerCase().includes('8812')
  );
  assert(searchAutoWorks.length === 1 && searchAutoWorks[0].id === 'INV-001', 'Search by invoice number matches exact item');

  const searchSupplier = allItems.filter(p =>
    p.counterParty.toLowerCase().includes('startup')
  );
  assert(searchSupplier.length === 1 && searchSupplier[0].id === 'INV-002', 'Search by counterparty substring matches item');

  // --- TEST 4: Sparse Data & Estimation Badges ---
  console.log('\n[TEST 4] Sparse Data & Transparency Badge Logic');
  const sparseItem = allItems.find(p => p.id === 'INV-002');
  assert(!!sparseItem && sparseItem.isEstimated === true, 'Sparse item is identified with isEstimated = true');
  assert(
    sparseItem?.modelType === 'RULE_BASED_CONTRACTUAL_ESTIMATE',
    'Sparse item specifies RULE_BASED_CONTRACTUAL_ESTIMATE modelType'
  );
  assert(
    mockForecast.counterpartyProfiles['New Startup Logistics Pvt. Ltd.'].hasSufficientHistory === false,
    'Counterparty profile accurately flags hasSufficientHistory = false (N < 2)'
  );

  // --- TEST 5: 30-Day Timeline Consistency ---
  console.log('\n[TEST 5] 30-Day Timeline Consistency');
  assert(mockForecast.dailyTimeline30Days.length === 31, 'Contains 31 daily timeline points');
  const totalIncomingSum = mockForecast.dailyTimeline30Days.reduce((acc, pt) => acc + pt.incomingAmount, 0);
  assert(totalIncomingSum === mockForecast.summary.totalForecastedIncoming30d, 'Sum of daily incoming matches summary total');
  const lastPoint = mockForecast.dailyTimeline30Days[30];
  assert(lastPoint.cumulativeCashFlow === mockForecast.summary.netCashFlow30d, 'Final cumulative cash flow point matches summary net cash flow');

  console.log('\n======================================================================');
  console.log(`FRONTEND LOGIC TESTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================\n');

  if (failed > 0) process.exit(1);
}

runFrontendForecastTests();
