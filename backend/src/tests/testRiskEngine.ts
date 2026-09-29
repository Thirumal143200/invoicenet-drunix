import {
  InvoiceRiskEngineService,
  GeminiRiskExplanationSchema,
  RiskLevel,
  DetectedRiskFactor,
} from '../services/invoiceRiskEngineService';
import { drunixGateway, Invoice } from '../services/drunixGateway';
import { z } from 'zod';

async function runRiskEngineTests() {
  console.log('======================================================================');
  console.log('       INVOICENET AI RISK ENGINE COMPREHENSIVE TEST SUITE');
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

  InvoiceRiskEngineService.initialize();

  // --- SUITE 1: DUPLICATE INVOICE DETECTION & SCORE IMPACT ---
  console.log('[TEST SUITE 1] Duplicate Invoices (Number & Hash Collision)');
  try {
    const inv1 = await drunixGateway.getInvoiceById('INV-2026-001');
    assert(inv1 !== undefined, 'Retrieved valid baseline invoice INV-2026-001');

    // Create a duplicate invoice with the same invoiceNumber
    const dupInvoice: Invoice = {
      id: 'INV-TEST-DUPE-01',
      invoiceNumber: inv1!.invoiceNumber, // duplicate number
      supplierId: 'SP-101',
      supplierOrg: inv1!.supplierOrg,
      buyerId: 'BY-201',
      buyerOrg: inv1!.buyerOrg,
      amount: 500000,
      currency: 'INR',
      issueDate: '2026-09-01T00:00:00Z',
      dueDate: '2026-10-15T00:00:00Z',
      description: 'Duplicate claim test',
      status: 'CREATED',
      createdAt: '2026-09-02T00:00:00Z',
      updatedAt: '2026-09-02T00:00:00Z',
      blockNumber: 1099,
      txId: 'tx_test_dupe_01',
      endorsementHistory: [],
    };

    // Temporarily add to mock gateway
    (drunixGateway as any).invoices.set(dupInvoice.id, dupInvoice);

    const assessment = await InvoiceRiskEngineService.analyzeInvoiceRisk(dupInvoice.id);
    const dupeFactor = assessment.detectedFactors.find((f) => f.id === 'FCT-DUPE-REF');

    assert(dupeFactor !== undefined, 'Detected duplicate invoice reference collision');
    assert(dupeFactor?.severity === 'CRITICAL', 'Duplicate factor is classified as CRITICAL');
    assert(dupeFactor?.scoreImpact === 45, 'Duplicate factor adds +45 to risk score');
    assert(assessment.riskScore >= 45, `Risk score reflects critical duplicate penalty (score: ${assessment.riskScore})`);
    assert(
      dupeFactor?.evidence.conflictingInvoiceId === 'INV-2026-001',
      'Conflicting invoice ID matches original on-chain invoice'
    );

    // Clean up mock
    (drunixGateway as any).invoices.delete(dupInvoice.id);
  } catch (err: any) {
    assert(false, `Suite 1 failed: ${err.message}`);
  }

  // --- SUITE 2: UNUSUAL INVOICE AMOUNTS & STATISTICAL OUTLIER DETECTION ---
  console.log('\n[TEST SUITE 2] Unusual Invoice Amounts (Statistical Deviation)');
  try {
    // Baseline invoices for TechParts are typically ~500,000 INR
    // Inject an invoice with 5,000,000 INR (10x normal volume)
    const outlierInvoice: Invoice = {
      id: 'INV-TEST-OUTLIER-01',
      invoiceNumber: 'TP-2026-OUTLIER-99',
      supplierId: 'SP-101',
      supplierOrg: 'TechParts Manufacturing Pvt. Ltd.',
      buyerId: 'BY-201',
      buyerOrg: 'AutoWorks Industries Ltd.',
      amount: 5000000, // 10x customary volume
      currency: 'INR',
      issueDate: '2026-09-01T00:00:00Z',
      dueDate: '2026-10-15T00:00:00Z',
      description: 'Outlier volume test',
      status: 'CREATED',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      blockNumber: 1100,
      txId: 'tx_test_outlier_01',
      endorsementHistory: [],
    };

    (drunixGateway as any).invoices.set(outlierInvoice.id, outlierInvoice);

    const assessment = await InvoiceRiskEngineService.analyzeInvoiceRisk(outlierInvoice.id);
    const amountFactor = assessment.detectedFactors.find(
      (f) => f.id === 'FCT-AMT-CRIT' || f.id === 'FCT-AMT-WARN' || f.category === 'AMOUNT'
    );

    assert(amountFactor !== undefined, 'Detected unusual invoice amount outlier');
    assert(amountFactor?.category === 'AMOUNT', 'Factor category is AMOUNT');
    assert((amountFactor?.scoreImpact ?? 0) >= 10, 'Outlier amount adds penalty to risk score');
    assert(
      assessment.evidence.statisticalBaseline !== undefined,
      'Evidence contains statistical baseline with mean and prior count'
    );

    (drunixGateway as any).invoices.delete(outlierInvoice.id);
  } catch (err: any) {
    assert(false, `Suite 2 failed: ${err.message}`);
  }

  // --- SUITE 3: INCONSISTENT DATES & SUSPICIOUS PAYMENT TERMS ---
  console.log('\n[TEST SUITE 3] Inconsistent Commercial Dates & Suspicious Terms');
  try {
    // Due date preceding issue date
    const dateParadoxInvoice: Invoice = {
      id: 'INV-TEST-DATE-01',
      invoiceNumber: 'TP-2026-PARADOX-01',
      supplierId: 'SP-101',
      supplierOrg: 'TechParts Manufacturing Pvt. Ltd.',
      buyerId: 'BY-201',
      buyerOrg: 'AutoWorks Industries Ltd.',
      amount: 450000,
      currency: 'INR',
      issueDate: '2026-10-15T00:00:00Z',
      dueDate: '2026-09-01T00:00:00Z', // due date BEFORE issue date
      description: 'Temporal paradox invoice',
      status: 'CREATED',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      blockNumber: 1101,
      txId: 'tx_test_date_01',
      endorsementHistory: [],
    };

    (drunixGateway as any).invoices.set(dateParadoxInvoice.id, dateParadoxInvoice);

    const assessment = await InvoiceRiskEngineService.analyzeInvoiceRisk(dateParadoxInvoice.id);
    const dateFactor = assessment.detectedFactors.find((f) => f.id === 'FCT-DATE-PARADOX');

    assert(dateFactor !== undefined, 'Detected commercial date paradox (due date < issue date)');
    assert(dateFactor?.severity === 'HIGH', 'Date paradox flagged with HIGH severity');
    assert(dateFactor?.scoreImpact === 20, 'Date paradox contributes +20 risk score impact');

    (drunixGateway as any).invoices.delete(dateParadoxInvoice.id);
  } catch (err: any) {
    assert(false, `Suite 3 failed: ${err.message}`);
  }

  // --- SUITE 4: PURCHASE ORDER RECONCILIATION MISMATCHES ---
  console.log('\n[TEST SUITE 4] Purchase Order Reconciliation & Mismatch Analysis');
  try {
    // PO PO-2026-AUTOWORKS-092 in SAMPLE_PURCHASE_ORDERS has totalAmount: 500,000 INR
    // Let's create an invoice referencing this PO but with amount 750,000 INR (+50% mismatch)
    const poMismatchInvoice: Invoice = {
      id: 'INV-TEST-PO-01',
      invoiceNumber: 'TP-2026-PO-MISMATCH-01',
      supplierId: 'SP-101',
      supplierOrg: 'TechParts Manufacturing Pvt. Ltd.',
      buyerId: 'BY-201',
      buyerOrg: 'AutoWorks Industries Ltd.',
      amount: 750000, // 50% above PO amount of 500,000
      currency: 'INR',
      issueDate: '2026-09-01T00:00:00Z',
      dueDate: '2026-10-15T00:00:00Z',
      description: 'PO Match test',
      poNumber: 'PO-2026-AUTOWORKS-092',
      status: 'CREATED',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      blockNumber: 1102,
      txId: 'tx_test_po_01',
      endorsementHistory: [],
    };

    (drunixGateway as any).invoices.set(poMismatchInvoice.id, poMismatchInvoice);

    const assessment = await InvoiceRiskEngineService.analyzeInvoiceRisk(poMismatchInvoice.id);
    const poFactor = assessment.detectedFactors.find(
      (f) => f.id === 'FCT-PO-AMT-MISMATCH' || f.category === 'PO_RECONCILIATION'
    );

    assert(poFactor !== undefined, 'Detected substantial PO value mismatch (>5% variance)');
    assert(poFactor?.category === 'PO_RECONCILIATION', 'Factor category is PO_RECONCILIATION');
    assert(poFactor?.severity === 'HIGH', 'PO mismatch flagged with HIGH severity');
    assert(poFactor?.scoreImpact === 20, 'PO mismatch adds +20 to risk score');
    assert(assessment.evidence.poMatch?.isExactMatch === false, 'Evidence poMatch correctly indicates non-match');

    (drunixGateway as any).invoices.delete(poMismatchInvoice.id);
  } catch (err: any) {
    assert(false, `Suite 4 failed: ${err.message}`);
  }

  // --- SUITE 5: CREDIT MITIGANTS (BUYER ENDORSEMENT BONUS) ---
  console.log('\n[TEST SUITE 5] Credit Mitigants (Cryptographic Endorsements)');
  try {
    const endorsedInvoice: Invoice = {
      id: 'INV-TEST-MITIGANT-01',
      invoiceNumber: 'TP-2026-ACCEPTED-01',
      supplierId: 'SP-101',
      supplierOrg: 'TechParts Manufacturing Pvt. Ltd.',
      buyerId: 'BY-201',
      buyerOrg: 'AutoWorks Industries Ltd.',
      amount: 500000,
      currency: 'INR',
      issueDate: '2026-09-01T00:00:00Z',
      dueDate: '2026-10-15T00:00:00Z',
      description: 'Ref PO: PO-2026-AUTOWORKS-092',
      status: 'ACCEPTED',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      blockNumber: 1103,
      txId: 'tx_test_mitigant_01',
      endorsementHistory: [
        {
          orgMsp: 'BuyerMSP',
          actorId: 'BuyerMSP-Procurement',
          action: 'ACCEPT',
          timestamp: '2026-09-02T10:00:00Z',
          txId: 'tx_accept_1103',
          signatureHash: 'sig_buyer_accept_01',
          verified: true,
        },
      ],
    };

    (drunixGateway as any).invoices.set(endorsedInvoice.id, endorsedInvoice);

    const assessment = await InvoiceRiskEngineService.analyzeInvoiceRisk(endorsedInvoice.id);
    const bonusFactor = assessment.detectedFactors.find((f) => f.id === 'FCT-ENDORSED-BONUS');

    assert(bonusFactor !== undefined, 'Recognized BuyerMSP endorsement as credit mitigant');
    assert(bonusFactor?.scoreImpact === -10, 'Mitigant provides -10 point risk reduction');
    assert(assessment.riskScore <= 15, `Low overall risk score for clean endorsed invoice (score: ${assessment.riskScore})`);

    (drunixGateway as any).invoices.delete(endorsedInvoice.id);
  } catch (err: any) {
    assert(false, `Suite 5 failed: ${err.message}`);
  }

  // --- SUITE 6: ZOD SCHEMA VALIDATION ON INVALID AI OUTPUT ---
  console.log('\n[TEST SUITE 6] Strict Zod Schema Validation & Guardrails');
  try {
    // Test that valid AI JSON passes Zod validation
    const validAiPayload = {
      executiveSummary: 'This invoice demonstrates standard commercial risk with strong buyer backing.',
      keyObservations: ['PO fully reconciled', 'No duplicate references found'],
      underwritingAssessment: 'Recommended for standard discounting advance.',
      recommendedAction: 'Approve financing request.',
    };
    const validResult = GeminiRiskExplanationSchema.safeParse(validAiPayload);
    assert(validResult.success === true, 'Valid structured AI response passes Zod schema validation');

    // Test that invalid AI JSON (missing required fields or invalid types) fails Zod validation
    const invalidAiPayload1 = {
      executiveSummary: 'Too short', // < 10 characters
      keyObservations: [], // empty array
    };
    const invalidResult1 = GeminiRiskExplanationSchema.safeParse(invalidAiPayload1);
    assert(invalidResult1.success === false, 'Zod rejects invalid AI output with empty keyObservations and short summary');

    // Test that AI output with hallucinated or wrong types is rejected
    const invalidAiPayload2 = {
      executiveSummary: 'Valid summary length here for test.',
      keyObservations: 'Not an array', // type mismatch
      underwritingAssessment: 12345, // type mismatch
      recommendedAction: 'Approve',
    };
    const invalidResult2 = GeminiRiskExplanationSchema.safeParse(invalidAiPayload2);
    assert(invalidResult2.success === false, 'Zod rejects AI output with wrong data types');
  } catch (err: any) {
    assert(false, `Suite 6 failed: ${err.message}`);
  }

  // --- SUITE 7: GEMINI API FAILURE & OFFLINE DETERMINISTIC FALLBACK ---
  console.log('\n[TEST SUITE 7] Gemini API Failure & Fallback Resilience');
  try {
    // When Gemini is offline or fails, the service MUST return a fully compliant explanation matching Zod schema
    const baselineInv = await drunixGateway.getInvoiceById('INV-2026-001');
    assert(baselineInv !== undefined, 'Found baseline invoice');

    const assessment = await InvoiceRiskEngineService.analyzeInvoiceRisk(baselineInv!.id);
    assert(assessment.explanation !== undefined, 'Explanation exists even if Gemini is unconfigured or offline');

    const zodCheck = GeminiRiskExplanationSchema.safeParse(assessment.explanation);
    assert(zodCheck.success === true, 'Fallback explanation strictly conforms to Zod schema specification');
    assert(assessment.explanation.keyObservations.length >= 1, 'Fallback explanation includes key observations');
    assert(
      assessment.explanation.underwritingAssessment.length >= 10,
      'Fallback explanation includes underwriting assessment'
    );
  } catch (err: any) {
    assert(false, `Suite 7 failed: ${err.message}`);
  }

  // --- SUITE 8: EXPLAINABLE SCORING BOUNDS & BRACKETS ---
  console.log('\n[TEST SUITE 8] Explainable Scoring Bounds (0-100) & Level Mapping');
  try {
    // Generate an invoice with multiple compounding risks
    const multiRiskInvoice: Invoice = {
      id: 'INV-TEST-MULTI-01',
      invoiceNumber: 'TP-2026-8812', // duplicate of INV-2026-001 (+45)
      supplierId: 'SP-101',
      supplierOrg: 'TechParts Manufacturing Pvt. Ltd.',
      buyerId: 'BY-201',
      buyerOrg: 'AutoWorks Industries Ltd.',
      amount: 8000000, // extreme amount outlier (+20)
      currency: 'INR',
      issueDate: '2026-10-01T00:00:00Z',
      dueDate: '2026-08-01T00:00:00Z', // date paradox (+20)
      description: 'Ref PO: UNREGISTERED-PO-999', // unverified PO (+15)
      status: 'CREATED', // draft (+10)
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      blockNumber: 1104,
      txId: 'tx_test_multi_01',
      endorsementHistory: [],
    };

    (drunixGateway as any).invoices.set(multiRiskInvoice.id, multiRiskInvoice);

    const assessment = await InvoiceRiskEngineService.analyzeInvoiceRisk(multiRiskInvoice.id);

    assert(assessment.riskScore <= 100, `Score is capped at 100 max (score: ${assessment.riskScore})`);
    assert(assessment.riskScore >= 75, `High compound risk maps to CRITICAL level (score: ${assessment.riskScore})`);
    assert(assessment.riskLevel === 'CRITICAL', 'Risk level is CRITICAL');
    assert(assessment.recommendedAction.includes('HOLD ALL FINANCING'), 'Recommended action halts financing');

    (drunixGateway as any).invoices.delete(multiRiskInvoice.id);
  } catch (err: any) {
    assert(false, `Suite 8 failed: ${err.message}`);
  }

  // --- SUITE 9: ROLE-BASED ACCESS & DATA ISOLATION ---
  console.log('\n[TEST SUITE 9] Role-Based Access Control & Multi-Tenancy Isolation');
  try {
    // Supplier SP-101 should only see TechParts invoices
    const supplierAssessments = await InvoiceRiskEngineService.getAllAssessments(
      'SUPPLIER',
      'TechParts Manufacturing Pvt. Ltd.',
      'SP-101'
    );
    assert(Array.isArray(supplierAssessments), 'Supplier assessments returned as array');
    const nonTechParts = supplierAssessments.filter(
      (a) => !a.supplierOrg.toLowerCase().includes('techparts') && a.supplierOrg !== ''
    );
    assert(nonTechParts.length === 0, 'Supplier cannot see competitors invoices');

    // Financier should see all assessments across the network
    const financierAssessments = await InvoiceRiskEngineService.getAllAssessments(
      'FINANCIER',
      'QuickFund Capital Ltd.',
      'Financier-1'
    );
    assert(financierAssessments.length >= supplierAssessments.length, 'Financier has consortium-wide risk visibility');
  } catch (err: any) {
    assert(false, `Suite 9 failed: ${err.message}`);
  }

  // --- SUMMARY ---
  console.log('\n======================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runRiskEngineTests().catch((err) => {
  console.error('Fatal error in test suite:', err);
  process.exit(1);
});
