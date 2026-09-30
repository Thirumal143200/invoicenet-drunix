import { CashFlowForecastService } from '../services/cashFlowForecastService';
import { drunixGateway, Invoice } from '../services/drunixGateway';

async function runCashFlowTests() {
  console.log('======================================================================');
  console.log('    INVOICENET AI CASH-FLOW FORECASTING & INSIGHTS TEST SUITE');
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

  CashFlowForecastService.initialize();

  // --- SUITE 1: 7, 30, AND 90-DAY FORECAST HORIZONS ---
  console.log('[TEST SUITE 1] Cash-Flow Forecast Horizons (7d, 30d, 90d)');
  try {
    const forecast = await CashFlowForecastService.generateForecast(
      'SUPPLIER',
      'TechParts Manufacturing Pvt. Ltd.',
      'SP-101',
      'BASELINE'
    );

    assert(forecast.metrics.totalOutstanding > 0, `Computed total outstanding receivables: ₹${forecast.metrics.totalOutstanding.toLocaleString('en-IN')}`);
    assert(forecast.horizonSummary.next7Days >= 0, `Computed Next 7 Days horizon: ₹${forecast.horizonSummary.next7Days.toLocaleString('en-IN')}`);
    assert(forecast.horizonSummary.next30Days >= forecast.horizonSummary.next7Days, `Next 30 Days (₹${forecast.horizonSummary.next30Days.toLocaleString('en-IN')}) >= Next 7 Days`);
    assert(forecast.horizonSummary.next90Days >= forecast.horizonSummary.next30Days, `Next 90 Days (₹${forecast.horizonSummary.next90Days.toLocaleString('en-IN')}) >= Next 30 Days`);
    assert(forecast.timelineBuckets.length === 5, `Generated 5 standardized periodic buckets (0-7d, 8-15d, 16-30d, 31-60d, 61-90d)`);
  } catch (err: any) {
    assert(false, `Forecast horizon test failed: ${err.message}`);
  }

  // --- SUITE 2: UNCERTAINTY & MISSING HISTORICAL DATA HANDLING ---
  console.log('\n[TEST SUITE 2] Uncertainty Modeling & Missing Historical Data Handling');
  try {
    const forecast = await CashFlowForecastService.generateForecast(
      'SUPPLIER',
      'TechParts Manufacturing Pvt. Ltd.',
      'SP-101',
      'BASELINE'
    );

    // Verify confidence bands
    for (const bucket of forecast.timelineBuckets) {
      if (bucket.invoicesCount > 0) {
        assert(
          bucket.optimisticAmount >= bucket.expectedAmount,
          `${bucket.periodLabel}: Optimistic amount >= Expected amount`
        );
        assert(
          bucket.conservativeAmount <= bucket.expectedAmount,
          `${bucket.periodLabel}: Conservative amount <= Expected amount`
        );
        assert(
          bucket.confidenceScore >= 0.70 && bucket.confidenceScore <= 1.0,
          `${bucket.periodLabel}: Valid confidence score (${bucket.confidenceScore})`
        );
      }
    }

    // Verify methodology transparency
    assert(
      forecast.methodologyExplanation.approach.length > 0,
      'Methodology approach clearly disclosed'
    );
    assert(
      forecast.methodologyExplanation.notes.length > 0,
      'Transparent rule-based and DRUNIX endorsement notes included'
    );
  } catch (err: any) {
    assert(false, `Uncertainty test failed: ${err.message}`);
  }

  // --- SUITE 3: SCENARIO ANALYSIS SIMULATION ---
  console.log('\n[TEST SUITE 3] Scenario Analysis (Early, Delayed, DRUNIX Factoring)');
  try {
    const baseline = await CashFlowForecastService.generateForecast(
      'SUPPLIER',
      'TechParts Manufacturing Pvt. Ltd.',
      'SP-101',
      'BASELINE'
    );

    const earlyPayment = await CashFlowForecastService.generateForecast(
      'SUPPLIER',
      'TechParts Manufacturing Pvt. Ltd.',
      'SP-101',
      'EARLY_PAYMENT'
    );

    const delayedPayment = await CashFlowForecastService.generateForecast(
      'SUPPLIER',
      'TechParts Manufacturing Pvt. Ltd.',
      'SP-101',
      'DELAYED_PAYMENT'
    );

    const drunixFactoring = await CashFlowForecastService.generateForecast(
      'SUPPLIER',
      'TechParts Manufacturing Pvt. Ltd.',
      'SP-101',
      'DRUNIX_FINANCING'
    );

    // Under DRUNIX financing, accepted invoices accelerate into next 7 days!
    assert(
      drunixFactoring.horizonSummary.next7Days >= baseline.horizonSummary.next7Days,
      `DRUNIX Factoring accelerates immediate 7-day liquidity: ₹${drunixFactoring.horizonSummary.next7Days.toLocaleString('en-IN')} vs Baseline ₹${baseline.horizonSummary.next7Days.toLocaleString('en-IN')}`
    );

    // Under delayed payment, 30-day realization is stressed / lower
    assert(
      delayedPayment.horizonSummary.next30Days <= baseline.horizonSummary.next30Days,
      `Delayed payment stress test shows working capital postponement`
    );

    // Verify natural language explanations
    assert(
      Boolean(drunixFactoring.geminiInsightsBrief.includes('DRUNIX') || drunixFactoring.geminiInsightsBrief.includes('Accelerated')),
      'DRUNIX financing insights brief generated'
    );
  } catch (err: any) {
    assert(false, `Scenario analysis test failed: ${err.message}`);
  }

  // --- SUITE 4: OVERDUE INVOICES & AGING DETECTION ---
  console.log('\n[TEST SUITE 4] Overdue Receivables Detection & Aging');
  try {
    const forecast = await CashFlowForecastService.generateForecast(
      'SUPPLIER',
      'TechParts Manufacturing Pvt. Ltd.',
      'SP-101',
      'BASELINE'
    );

    // Verify overdue structure
    if (forecast.overdueInvoices.length > 0) {
      const topOverdue = forecast.overdueInvoices[0];
      assert(topOverdue.daysOverdue >= 0, `Accurately calculated days overdue (${topOverdue.daysOverdue} days)`);
      assert(topOverdue.amount > 0, `Captured overdue value: ₹${topOverdue.amount.toLocaleString('en-IN')}`);
      assert(topOverdue.drunixTxId.startsWith('tx_drunix_'), `Linked on-chain transaction ID: ${topOverdue.drunixTxId}`);
    } else {
      assert(forecast.metrics.totalOverdue === 0, 'No overdue invoices; totalOverdue correctly 0');
    }
  } catch (err: any) {
    assert(false, `Overdue detection test failed: ${err.message}`);
  }

  // --- SUITE 5: INCONSISTENT SETTLEMENT RECORDS HANDLING ---
  console.log('\n[TEST SUITE 5] Inconsistent Settlement Records Handling');
  try {
    // Test with missing dates, malformed timestamps, or zero amount
    const malformedInvoices: Invoice[] = [
      {
        id: 'INV-MAL-1',
        invoiceNumber: 'TP-MAL-1',
        supplierId: 'SP-101',
        supplierOrg: 'TechParts',
        buyerId: 'BY-201',
        buyerOrg: 'AutoWorks',
        amount: 0,
        currency: 'INR',
        issueDate: 'invalid-date',
        dueDate: 'invalid-date',
        description: 'Corrupted record',
        status: 'SETTLED',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
        blockNumber: 1040,
        txId: 'tx_mal_1',
        endorsementHistory: [],
      },
    ];

    // Filter authorization function should handle this safely without throwing
    const filtered = CashFlowForecastService.getAuthorizedInvoices(malformedInvoices, 'SUPPLIER', 'TechParts', 'SP-101');
    assert(filtered.length === 1, 'Handled corrupted invoice records without throwing errors');
  } catch (err: any) {
    assert(false, `Inconsistent record handling test failed: ${err.message}`);
  }

  // --- SUITE 6: CROSS-ORGANIZATION ROLE AUTHORIZATION & DATA ISOLATION ---
  console.log('\n[TEST SUITE 6] Role-Based Data Isolation');
  try {
    const supplierForecast = await CashFlowForecastService.generateForecast(
      'SUPPLIER',
      'TechParts Manufacturing Pvt. Ltd.',
      'SP-101',
      'BASELINE'
    );

    const buyerForecast = await CashFlowForecastService.generateForecast(
      'BUYER',
      'AutoWorks Industries Ltd.',
      'BY-201',
      'BASELINE'
    );

    const competitorForecast = await CashFlowForecastService.generateForecast(
      'SUPPLIER',
      'Competitor Parts Pvt. Ltd.',
      'SP-999',
      'BASELINE'
    );

    assert(supplierForecast.metrics.totalOutstanding > 0, 'Supplier sees their receivables');
    assert(buyerForecast.metrics.totalOutstanding > 0, 'Buyer sees their payable cash obligations');
    assert(competitorForecast.metrics.totalOutstanding === 0, 'Competitor supplier receives zero access to TechParts receivables');
  } catch (err: any) {
    assert(false, `Role isolation test failed: ${err.message}`);
  }

  console.log('\n======================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runCashFlowTests().catch((e) => {
  console.error('Fatal test error in cash flow suite:', e);
  process.exit(1);
});
