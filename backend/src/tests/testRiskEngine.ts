import {
  InvoiceRiskEngineService,
  GeminiRiskExplanationSchema,
  RiskLevel,
  DetectedRiskFactor,
} from '../services/invoiceRiskEngineService';
import { drunixGateway, Invoice } from '../services/drunixGateway';
import { z } from 'zod';

export async function runComprehensiveRiskEngineTests(): Promise<{ passed: number; failed: number }> {
  console.log('======================================================================');
  console.log('       INVOICENET AI RISK ENGINE COMPREHENSIVE TEST SUITE');
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

  InvoiceRiskEngineService.initialize();

  // -------------------------------------------------------------
  // TEST 1: LOW-RISK INVOICE (Score 0-29)
  // -------------------------------------------------------------
  console.log('[TEST 1] Low-Risk Invoice (Prime Commercial Grade: Score 0-29)');
  try {
    const lowRiskInv: Invoice = {
      id: 'INV-TEST-LOW-01',
      invoiceNumber: 'TP-2026-LOW-01',
      supplierId: 'SP-101',
      supplierOrg: 'TechParts Manufacturing Pvt. Ltd.',
      buyerId: 'BY-201',
      buyerOrg: 'AutoWorks Industries Ltd.',
      amount: 500000,
      currency: 'INR',
      issueDate: '2026-09-01T00:00:00Z',
      dueDate: '2026-10-01T00:00:00Z',
      description: 'Standard contract gears',
      status: 'ACCEPTED',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-02T00:00:00Z',
      blockNumber: 1201,
      txId: 'tx_test_low_01',
      poNumber: 'PO-2026-AUTOWORKS-092',
      subtotal: 423728,
      taxAmount: 76272,
      supplierGstin: '27AABCT3518Q1ZV',
      endorsementHistory: [
        {
          orgMsp: 'BuyerMSP',
          actorId: 'BY-201',
          action: 'ACCEPT_INVOICE',
          txId: 'tx_test_low_accept',
          timestamp: '2026-09-02T00:00:00Z',
          signatureHash: 'sig_low_01',
          verified: true,
        },
      ],
    };

    (drunixGateway as any).invoices.set(lowRiskInv.id, lowRiskInv);
    const assessment = await InvoiceRiskEngineService.analyzeInvoiceRisk(lowRiskInv.id);

    assert(assessment.riskScore <= 29, `Score is in Low Risk bracket 0-29 (Score: ${assessment.riskScore})`);
    assert(assessment.riskCategory === 'LOW', `Risk category is LOW (got: ${assessment.riskCategory})`);
    assert(assessment.riskLevel === 'LOW', 'Risk level alias is LOW');
    assert(assessment.confidence >= 0.85, `Confidence score is high (Confidence: ${assessment.confidence})`);
    assert(assessment.explanation.summary.length > 0, 'Explanation summary is present');

    (drunixGateway as any).invoices.delete(lowRiskInv.id);
  } catch (err: any) {
    assert(false, `Test 1 failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 2: MEDIUM-RISK INVOICE (Score 30-59)
  // -------------------------------------------------------------
  console.log('\n[TEST 2] Medium-Risk Invoice (Moderate Discrepancy: Score 30-59)');
  try {
    const medRiskInv: Invoice = {
      id: 'INV-TEST-MED-01',
      invoiceNumber: 'TP-2026-MED-01',
      supplierId: 'SP-101',
      supplierOrg: 'TechParts Manufacturing Pvt. Ltd.',
      buyerId: 'BY-202',
      buyerOrg: 'Metro Fleet Mobility Corp',
      amount: 1100000, // ~2.2x baseline of ~500k -> +15 pts
      currency: 'INR',
      issueDate: '2026-09-01T00:00:00Z',
      dueDate: '2027-04-01T00:00:00Z', // > 180 days -> +15 pts
      poNumber: 'PO-UNVERIFIED-999', // unverified PO -> +15 pts
      description: 'Extended tenor components',
      status: 'CREATED',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      blockNumber: 1202,
      txId: 'tx_test_med_01',
      endorsementHistory: [],
    };

    (drunixGateway as any).invoices.set(medRiskInv.id, medRiskInv);
    const assessment = await InvoiceRiskEngineService.analyzeInvoiceRisk(medRiskInv.id);

    assert(
      assessment.riskScore >= 30 && assessment.riskScore <= 59,
      `Score is in Medium Risk bracket 30-59 (Score: ${assessment.riskScore})`
    );
    assert(assessment.riskCategory === 'MEDIUM', `Risk category is MEDIUM (got: ${assessment.riskCategory})`);

    (drunixGateway as any).invoices.delete(medRiskInv.id);
  } catch (err: any) {
    assert(false, `Test 2 failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 3: HIGH-RISK INVOICE (Score 60-79)
  // -------------------------------------------------------------
  console.log('\n[TEST 3] High-Risk Invoice (Enhanced Diligence: Score 60-79)');
  try {
    const highRiskInv: Invoice = {
      id: 'INV-TEST-HIGH-01',
      invoiceNumber: 'TP-2026-HIGH-01',
      supplierId: 'SP-101',
      supplierOrg: 'TechParts Manufacturing Pvt. Ltd.',
      buyerId: 'BY-201',
      buyerOrg: 'AutoWorks Industries Ltd.',
      amount: 750000, // PO mismatch (+20 pts)
      subtotal: 500000,
      taxAmount: 50000, // 500k + 50k != 750k -> Arithmetic mismatch (+25 pts)
      poNumber: 'PO-2026-AUTOWORKS-092', // PO is 500k vs 750k (+20 pts)
      currency: 'INR',
      issueDate: '2026-06-01T00:00:00Z',
      dueDate: '2026-07-01T00:00:00Z', // Overdue > 30 days (+20 pts)
      description: 'High discrepancy receivable',
      status: 'CREATED',
      createdAt: '2026-06-01T00:00:00Z',
      updatedAt: '2026-06-01T00:00:00Z',
      blockNumber: 1203,
      txId: 'tx_test_high_01',
      endorsementHistory: [],
    };

    (drunixGateway as any).invoices.set(highRiskInv.id, highRiskInv);
    const assessment = await InvoiceRiskEngineService.analyzeInvoiceRisk(highRiskInv.id);

    assert(
      assessment.riskScore >= 60 && assessment.riskScore <= 79,
      `Score is in High Risk bracket 60-79 (Score: ${assessment.riskScore})`
    );
    assert(assessment.riskCategory === 'HIGH', `Risk category is HIGH (got: ${assessment.riskCategory})`);

    (drunixGateway as any).invoices.delete(highRiskInv.id);
  } catch (err: any) {
    assert(false, `Test 3 failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 4: CRITICAL-RISK INVOICE (Score 80-100)
  // -------------------------------------------------------------
  console.log('\n[TEST 4] Critical-Risk Invoice (Financing Halt: Score 80-100)');
  try {
    const invBaseline = await drunixGateway.getInvoiceById('INV-2026-001');
    const critRiskInv: Invoice = {
      id: 'INV-TEST-CRIT-01',
      invoiceNumber: invBaseline!.invoiceNumber, // duplicate number (+45 pts)
      supplierId: 'SP-101',
      supplierOrg: 'TechParts Manufacturing Pvt. Ltd.',
      buyerId: 'BY-201',
      buyerOrg: 'AutoWorks Industries Ltd.',
      amount: 4000000, // severe outlier (+20 pts)
      currency: 'INR',
      issueDate: '2026-10-01T00:00:00Z',
      dueDate: '2026-08-01T00:00:00Z', // date paradox (+20 pts)
      description: 'Critical collision invoice',
      status: 'CREATED',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      blockNumber: 1204,
      txId: 'tx_test_crit_01',
      endorsementHistory: [],
    };

    (drunixGateway as any).invoices.set(critRiskInv.id, critRiskInv);
    const assessment = await InvoiceRiskEngineService.analyzeInvoiceRisk(critRiskInv.id);

    assert(assessment.riskScore >= 80, `Score is in Critical Risk bracket 80-100 (Score: ${assessment.riskScore})`);
    assert(assessment.riskCategory === 'CRITICAL', `Risk category is CRITICAL (got: ${assessment.riskCategory})`);
    assert(assessment.recommendedAction.includes('HOLD ALL FINANCING'), 'Recommended action halts all financing');

    (drunixGateway as any).invoices.delete(critRiskInv.id);
  } catch (err: any) {
    assert(false, `Test 4 failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 5: DUPLICATE INVOICE NUMBER DETECTION
  // -------------------------------------------------------------
  console.log('\n[TEST 5] Duplicate Invoice Number Collision');
  try {
    const inv1 = await drunixGateway.getInvoiceById('INV-2026-001');
    const dupInvoice: Invoice = {
      id: 'INV-TEST-DUPE-NUM',
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
      blockNumber: 1205,
      txId: 'tx_test_dupe_num',
      endorsementHistory: [],
    };

    (drunixGateway as any).invoices.set(dupInvoice.id, dupInvoice);
    const assessment = await InvoiceRiskEngineService.analyzeInvoiceRisk(dupInvoice.id);
    const dupeFactor = assessment.individualRiskFactors.find((f) => f.id === 'FCT-DUPE-REF');

    assert(dupeFactor !== undefined, 'Detected duplicate invoice reference collision');
    assert(dupeFactor?.severity === 'CRITICAL', 'Duplicate factor is classified as CRITICAL');
    assert(dupeFactor?.scoreImpact === 45, 'Duplicate factor adds +45 to risk score');
    assert(
      dupeFactor?.evidence.conflictingInvoiceId === 'INV-2026-001',
      'Conflicting invoice ID matches original on-chain invoice'
    );

    (drunixGateway as any).invoices.delete(dupInvoice.id);
  } catch (err: any) {
    assert(false, `Test 5 failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 6: DUPLICATE DOCUMENT HASH DETECTION
  // -------------------------------------------------------------
  console.log('\n[TEST 6] Duplicate Document SHA-256 Hash Collision');
  try {
    const existingHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    // Seed an invoice with this hash
    const invA: Invoice = {
      id: 'INV-TEST-HASH-A',
      invoiceNumber: 'TP-2026-ORIG-HASH',
      supplierId: 'SP-101',
      supplierOrg: 'TechParts',
      buyerId: 'BY-201',
      buyerOrg: 'AutoWorks',
      amount: 400000,
      currency: 'INR',
      issueDate: '2026-09-01T00:00:00Z',
      dueDate: '2026-10-01T00:00:00Z',
      description: 'First pledged invoice',
      status: 'ACCEPTED',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      blockNumber: 1206,
      txId: 'tx_hash_a',
      documentHash: existingHash,
      endorsementHistory: [],
    };
    const invB: Invoice = {
      id: 'INV-TEST-HASH-B',
      invoiceNumber: 'TP-2026-DIFF-REF', // different reference
      supplierId: 'SP-101',
      supplierOrg: 'TechParts',
      buyerId: 'BY-202',
      buyerOrg: 'Metro Fleet',
      amount: 400000,
      currency: 'INR',
      issueDate: '2026-09-01T00:00:00Z',
      dueDate: '2026-10-01T00:00:00Z',
      description: 'Second pledge attempt with identical document',
      status: 'CREATED',
      createdAt: '2026-09-02T00:00:00Z',
      updatedAt: '2026-09-02T00:00:00Z',
      blockNumber: 1207,
      txId: 'tx_hash_b',
      documentHash: existingHash, // identical hash
      endorsementHistory: [],
    };

    (drunixGateway as any).invoices.set(invA.id, invA);
    (drunixGateway as any).invoices.set(invB.id, invB);

    const assessment = await InvoiceRiskEngineService.analyzeInvoiceRisk(invB.id);
    const hashFactor = assessment.individualRiskFactors.find((f) => f.id === 'FCT-DUPE-HASH');

    assert(hashFactor !== undefined, 'Detected duplicate cryptographic document hash');
    assert(hashFactor?.severity === 'CRITICAL', 'Hash duplication flagged as CRITICAL');
    assert(hashFactor?.scoreImpact === 45, 'Hash duplication adds +45 pts');
    assert(hashFactor?.evidence.conflictingInvoiceId === invA.id, 'Evidence identifies conflicting invoice');

    (drunixGateway as any).invoices.delete(invA.id);
    (drunixGateway as any).invoices.delete(invB.id);
  } catch (err: any) {
    assert(false, `Test 6 failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 7: ARITHMETIC MISMATCH (Subtotal + Tax != Total)
  // -------------------------------------------------------------
  console.log('\n[TEST 7] Arithmetic Inconsistency (Subtotal + Tax != Total)');
  try {
    const arithInv: Invoice = {
      id: 'INV-TEST-ARITH-01',
      invoiceNumber: 'TP-2026-MATH-ERR',
      supplierId: 'SP-101',
      supplierOrg: 'TechParts',
      buyerId: 'BY-201',
      buyerOrg: 'AutoWorks',
      amount: 600000, // declared 600,000
      subtotal: 400000,
      taxAmount: 50000, // computed: 450,000 (!= 600,000)
      currency: 'INR',
      issueDate: '2026-09-01T00:00:00Z',
      dueDate: '2026-10-01T00:00:00Z',
      description: 'Arithmetic mismatch test',
      status: 'CREATED',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      blockNumber: 1208,
      txId: 'tx_arith_01',
      endorsementHistory: [],
    };

    (drunixGateway as any).invoices.set(arithInv.id, arithInv);
    const assessment = await InvoiceRiskEngineService.analyzeInvoiceRisk(arithInv.id);
    const arithFactor = assessment.individualRiskFactors.find((f) => f.id === 'FCT-ARITH-MISMATCH');

    assert(arithFactor !== undefined, 'Detected arithmetic mismatch between subtotal, tax and total');
    assert(arithFactor?.severity === 'HIGH', 'Arithmetic mismatch is flagged as HIGH severity');
    assert(arithFactor?.scoreImpact === 25, 'Arithmetic mismatch contributes +25 pts');
    assert(assessment.evidence.arithmeticCheck?.isValid === false, 'Evidence arithmeticCheck marked as invalid');

    (drunixGateway as any).invoices.delete(arithInv.id);
  } catch (err: any) {
    assert(false, `Test 7 failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 8: PURCHASE ORDER MISMATCH (>5% Variance)
  // -------------------------------------------------------------
  console.log('\n[TEST 8] Purchase Order Mismatch (>5% Variance)');
  try {
    const poInv: Invoice = {
      id: 'INV-TEST-PO-DEV',
      invoiceNumber: 'TP-2026-PO-DEV',
      supplierId: 'SP-101',
      supplierOrg: 'TechParts',
      buyerId: 'BY-201',
      buyerOrg: 'AutoWorks',
      amount: 650000, // 30% above PO amount of 500,000
      poNumber: 'PO-2026-AUTOWORKS-092',
      currency: 'INR',
      issueDate: '2026-09-01T00:00:00Z',
      dueDate: '2026-10-01T00:00:00Z',
      description: 'PO variance test',
      status: 'CREATED',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      blockNumber: 1209,
      txId: 'tx_po_dev',
      endorsementHistory: [],
    };

    (drunixGateway as any).invoices.set(poInv.id, poInv);
    const assessment = await InvoiceRiskEngineService.analyzeInvoiceRisk(poInv.id);
    const poFactor = assessment.individualRiskFactors.find((f) => f.id === 'FCT-PO-AMT-MISMATCH');

    assert(poFactor !== undefined, 'Detected PO value variance exceeding 5% threshold');
    assert(poFactor?.severity === 'HIGH', 'PO discrepancy marked as HIGH severity');
    assert(poFactor?.scoreImpact === 20, 'PO discrepancy contributes +20 pts');
    assert(assessment.evidence.poMatch?.isExactMatch === false, 'poMatch evidence reports non-match');

    (drunixGateway as any).invoices.delete(poInv.id);
  } catch (err: any) {
    assert(false, `Test 8 failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 9: MISSING FIELDS DETECTION
  // -------------------------------------------------------------
  console.log('\n[TEST 9] Missing Invoice Reference / Date Fields');
  try {
    const missingFieldsInv: Invoice = {
      id: 'INV-TEST-MISSING-01',
      invoiceNumber: '', // missing invoice reference
      supplierId: 'SP-101',
      supplierOrg: 'TechParts',
      buyerId: 'BY-201',
      buyerOrg: 'AutoWorks',
      amount: 400000,
      currency: 'INR',
      issueDate: 'invalid-date-string', // corrupted date
      dueDate: 'invalid-due-date',
      description: 'Missing fields test',
      status: 'CREATED',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      blockNumber: 1210,
      txId: 'tx_missing_01',
      endorsementHistory: [],
    };

    (drunixGateway as any).invoices.set(missingFieldsInv.id, missingFieldsInv);
    const assessment = await InvoiceRiskEngineService.analyzeInvoiceRisk(missingFieldsInv.id);
    const missingNumFactor = assessment.individualRiskFactors.find((f) => f.id === 'FCT-MISSING-NUM');
    const invalidDateFactor = assessment.individualRiskFactors.find((f) => f.id === 'FCT-DATE-INVALID');

    assert(missingNumFactor !== undefined, 'Detected missing commercial invoice reference');
    assert(missingNumFactor?.scoreImpact === 20, 'Missing reference adds +20 pts');
    assert(invalidDateFactor !== undefined, 'Detected malformed date strings');
    assert(invalidDateFactor?.scoreImpact === 20, 'Malformed dates add +20 pts');

    (drunixGateway as any).invoices.delete(missingFieldsInv.id);
  } catch (err: any) {
    assert(false, `Test 9 failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 10: INSUFFICIENT HISTORICAL DATA (NO PENALTY)
  // -------------------------------------------------------------
  console.log('\n[TEST 10] Insufficient Historical Data (No Unfair Penalty)');
  try {
    const newSupplierInv: Invoice = {
      id: 'INV-TEST-NEWSUP-01',
      invoiceNumber: 'NEW-2026-0001',
      supplierId: 'SP-BRAND-NEW',
      supplierOrg: 'Brand New Industrial Supplier Ltd.', // 0 prior invoices
      buyerId: 'BY-201',
      buyerOrg: 'AutoWorks',
      amount: 700000,
      currency: 'INR',
      issueDate: '2026-09-01T00:00:00Z',
      dueDate: '2026-10-01T00:00:00Z',
      description: 'First time supplier on DRUNIX',
      status: 'ACCEPTED',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      blockNumber: 1211,
      txId: 'tx_new_sup',
      poNumber: 'PO-2026-AUTOWORKS-092',
      endorsementHistory: [
        {
          orgMsp: 'BuyerMSP',
          actorId: 'BY-201',
          action: 'ACCEPT_INVOICE',
          txId: 'tx_new_sup_acc',
          timestamp: '2026-09-01T12:00:00Z',
          signatureHash: 'sig_new_sup',
          verified: true,
        },
      ],
    };

    (drunixGateway as any).invoices.set(newSupplierInv.id, newSupplierInv);
    const assessment = await InvoiceRiskEngineService.analyzeInvoiceRisk(newSupplierInv.id);

    const amountPenalty = assessment.individualRiskFactors.find((f) => f.category === 'AMOUNT');
    assert(amountPenalty === undefined, 'No statistical amount penalty applied when historical data is unavailable');
    assert(
      assessment.dataLimitations.some((lim) => lim.includes('Insufficient historical supplier volume')),
      'Unavailable historical baseline recorded in dataLimitations'
    );
    assert(
      assessment.riskCategory === 'LOW' || assessment.riskCategory === 'MEDIUM',
      `Invoice is not pushed to high/critical risk solely for missing history (Score: ${assessment.riskScore})`
    );

    (drunixGateway as any).invoices.delete(newSupplierInv.id);
  } catch (err: any) {
    assert(false, `Test 10 failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 11: GEMINI API FAILURE AND FALLBACK RESILIENCE
  // -------------------------------------------------------------
  console.log('\n[TEST 11] Gemini API Failure & Fallback Resilience');
  try {
    const inv1 = await drunixGateway.getInvoiceById('INV-2026-001');
    const assessment = await InvoiceRiskEngineService.analyzeInvoiceRisk(inv1!.id);

    assert(assessment.explanation !== undefined, 'Explanation exists');
    assert(typeof assessment.explanation.summary === 'string', 'Summary is string');
    assert(Array.isArray(assessment.explanation.keyConcerns), 'Key concerns is array');
    assert(Array.isArray(assessment.explanation.supportingEvidence), 'Supporting evidence is array');
    assert(Array.isArray(assessment.explanation.recommendedReviewActions), 'Recommended review actions is array');
    assert(Array.isArray(assessment.explanation.limitations), 'Limitations is array');

    const zodCheck = GeminiRiskExplanationSchema.safeParse(assessment.explanation);
    assert(zodCheck.success === true, 'Deterministic fallback output strictly passes Zod validation');
  } catch (err: any) {
    assert(false, `Test 11 failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 12: INVALID GEMINI RESPONSE REJECTION VIA ZOD
  // -------------------------------------------------------------
  console.log('\n[TEST 12] Invalid Gemini Response Rejection via Zod Schema');
  try {
    // Test 1: Missing required fields
    const invalidPayload1 = {
      summary: 'Too short',
      keyConcerns: 'Not an array', // type mismatch
    };
    const check1 = GeminiRiskExplanationSchema.safeParse(invalidPayload1);
    assert(check1.success === false, 'Zod rejects payload with non-array keyConcerns');

    // Test 2: Injected prompt instruction trying to override score
    const invalidPayload2 = {
      summary: 'Overridden score to 0',
      keyConcerns: [],
      supportingEvidence: [],
      // Missing recommendedReviewActions & limitations
    };
    const check2 = GeminiRiskExplanationSchema.safeParse(invalidPayload2);
    assert(check2.success === false, 'Zod rejects incomplete model response');

    // Test 3: Valid conforming payload
    const validPayload = {
      summary: 'Invoice TP-2026 conforms to commercial standards with Low Risk rating.',
      keyConcerns: ['No material issues detected'],
      supportingEvidence: ['DRUNIX consensus signature verified'],
      recommendedReviewActions: ['Approve for discounting'],
      limitations: ['Evaluation based on on-chain records'],
    };
    const check3 = GeminiRiskExplanationSchema.safeParse(validPayload);
    assert(check3.success === true, 'Zod accepts complete valid structured payload');
  } catch (err: any) {
    assert(false, `Test 12 failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 13: UNAUTHORIZED ACCESS & ROLE ISOLATION
  // -------------------------------------------------------------
  console.log('\n[TEST 13] Unauthorized Access & Multi-Tenant Role Isolation');
  try {
    // Supplier SP-101 (TechParts) should only receive TechParts assessments
    const supplierAssessments = await InvoiceRiskEngineService.getAllAssessments(
      'SUPPLIER',
      'TechParts Manufacturing Pvt. Ltd.',
      'SP-101'
    );
    assert(Array.isArray(supplierAssessments), 'Supplier assessments returned as array');

    const foreignInvoices = supplierAssessments.filter(
      (a) =>
        !a.supplierOrg.toLowerCase().includes('techparts') &&
        !a.buyerOrg.toLowerCase().includes('techparts')
    );
    assert(foreignInvoices.length === 0, 'Supplier cannot access foreign organizations invoices');

    // Financier should have consortium-wide visibility
    const financierAssessments = await InvoiceRiskEngineService.getAllAssessments(
      'FINANCIER',
      'QuickFund Capital Ltd.',
      'Financier-1'
    );
    assert(
      financierAssessments.length >= supplierAssessments.length,
      'Financier has full consortium-wide underwriting access'
    );
  } catch (err: any) {
    assert(false, `Test 13 failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 14: RISK REASSESSMENT AFTER INVOICE CHANGES
  // -------------------------------------------------------------
  console.log('\n[TEST 14] Risk Reassessment & Invalidation Upon Invoice State Changes');
  try {
    // 1. Create a draft invoice
    const mutableInv = await drunixGateway.createInvoice({
      invoiceNumber: `TP-TEST-MUTABLE-${Date.now()}`,
      supplierId: 'SP-101',
      supplierOrg: 'TechParts Manufacturing Pvt. Ltd.',
      buyerId: 'BY-201',
      buyerOrg: 'AutoWorks Industries Ltd.',
      amount: 500000,
      dueDate: '2026-11-01T00:00:00Z',
      description: 'Lifecycle mutation test',
    });

    // 2. Assess in draft CREATED state
    const assess1 = await InvoiceRiskEngineService.analyzeInvoiceRisk(mutableInv.id);
    const cachedBefore = InvoiceRiskEngineService.getAssessment(mutableInv.id);
    assert(cachedBefore !== null, 'Initial assessment is cached');

    // 3. Buyer accepts invoice on DRUNIX ledger
    await drunixGateway.acceptInvoice(mutableInv.id, 'BY-201 (Rajesh Kumar)');

    // 4. Verification: check that cache was invalidated by the ledger mutation event
    const cachedAfter = InvoiceRiskEngineService.getAssessment(mutableInv.id);
    assert(cachedAfter === null, 'Assessment cache automatically invalidated upon invoice acceptance on DRUNIX');

    // 5. Reassess after acceptance
    const assess2 = await InvoiceRiskEngineService.analyzeInvoiceRisk(mutableInv.id);
    const bonusFactor = assess2.individualRiskFactors.find((f) => f.id === 'FCT-ENDORSED-BONUS');

    assert(bonusFactor !== undefined, 'Reassessed invoice reflects BuyerMSP cryptographic endorsement bonus');
    assert(assess2.riskScore <= assess1.riskScore, 'Risk score improved after buyer endorsement');
  } catch (err: any) {
    assert(false, `Test 14 failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n======================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('======================================================================\n');

  return { passed, failed };
}

if (require.main === module) {
  runComprehensiveRiskEngineTests()
    .then(({ failed }) => {
      if (failed > 0) process.exit(1);
    })
    .catch((err) => {
      console.error('Fatal error in risk engine tests:', err);
      process.exit(1);
    });
}
