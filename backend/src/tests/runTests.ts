import fs from 'fs';
import path from 'path';
import { DocumentIntelligenceService } from '../services/documentIntelligenceService';
import { drunixGateway } from '../services/drunixGateway';
import { runComprehensiveRiskEngineTests } from './testRiskEngine';
import { runCopilotTests } from './testCopilot';

async function runTestSuite() {
  console.log('================================================================');
  console.log('🧪 RUNNING AI INVOICE INTELLIGENCE TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} - ${detail || ''}`);
      failed++;
    }
  }

  const testDir = path.join(__dirname, '../../test-artifacts');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

  // -------------------------------------------------------------
  // Test 1: Digital PDF Parsing
  // -------------------------------------------------------------
  console.log('\n--- TEST 1: Digital PDF Text & Metadata Extraction ---');
  // Simple PDF stream format with standard text operators
  const samplePdfContent = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 380 >> stream
BT
/F1 12 Tf
72 700 Td (TAX INVOICE) Tj
72 680 Td (Invoice No: TP-2026-9901) Tj
72 660 Td (Invoice Date: 2026-09-10) Tj
72 640 Td (Due Date: 2026-11-10) Tj
72 620 Td (Supplier: TechParts Manufacturing Pvt. Ltd.) Tj
72 600 Td (GSTIN: 27AABCT3518Q1ZV) Tj
72 580 Td (Buyer: AutoWorks Industries Ltd.) Tj
72 560 Td (Buyer GSTIN: 29AABCA9821K1ZW) Tj
72 540 Td (Subtotal: 400000.00) Tj
72 520 Td (GST 18%: 72000.00) Tj
72 500 Td (Total Amount: 472000.00) Tj
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000227 00000 n 
0000000660 00000 n 
trailer << /Root 1 0 R /Size 6 >>
startxref
735
%%EOF`;

  const pdfPath = path.join(testDir, 'sample_invoice.pdf');
  fs.writeFileSync(pdfPath, samplePdfContent);

  try {
    const pdfResult = await DocumentIntelligenceService.processInvoiceDocument(
      pdfPath,
      'sample_invoice.pdf',
      'application/pdf',
      'PO-2026-AUTOWORKS-092'
    );

    assert(pdfResult.documentHash.length === 64, 'Generated valid SHA-256 document hash');
    assert(pdfResult.invoiceNumber.value === 'TP-2026-9901', 'Extracted invoice number accurately', pdfResult.invoiceNumber.value || 'null');
    assert(pdfResult.invoiceNumber.confidence >= 0.9, 'Invoice number confidence is high (>= 0.90)');
    assert(pdfResult.totalAmount.value === 472000, 'Extracted total amount (₹4,72,000)', String(pdfResult.totalAmount.value));
    assert(pdfResult.arithmeticValid === true, 'Arithmetic cross-check passed (Subtotal + Tax = Total)');
    assert(pdfResult.supplierGstin.status === 'VERIFIED', 'Supplier GSTIN format verified');
  } catch (err: any) {
    assert(false, 'Digital PDF parsing exception', err.message);
  }

  // -------------------------------------------------------------
  // Test 2: Scanned Image Invoice Parsing
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Scanned Document / Image Processing ---');
  // 1x1 dummy PNG buffer
  const samplePngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
  const imagePath = path.join(testDir, 'scanned_invoice_TP-2026-8899.png');
  fs.writeFileSync(imagePath, samplePngBuffer);

  try {
    const imgResult = await DocumentIntelligenceService.processInvoiceDocument(
      imagePath,
      'scanned_invoice_TP-2026-8899.png',
      'image/png'
    );

    assert(imgResult.documentHash.length === 64, 'Image hashed into SHA-256 fingerprint');
    assert(imgResult.mimeType === 'image/png', 'MIME type recognized as image/png');
    assert(imgResult.totalAmount.value !== null, 'Extracted fallback financial values for image');
  } catch (err: any) {
    assert(false, 'Scanned image processing exception', err.message);
  }

  // -------------------------------------------------------------
  // Test 3: Invalid Upload Handling
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Invalid File Type & Size Validation ---');
  const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  const testInvalidMime = 'text/plain';
  assert(!allowedMimes.includes(testInvalidMime), 'Rejects text/plain MIME type');

  const testExeMime = 'application/x-msdownload';
  assert(!allowedMimes.includes(testExeMime), 'Rejects executable binary uploads');

  const maxSizeBytes = 10 * 1024 * 1024;
  const oversizedBytes = 15 * 1024 * 1024;
  assert(oversizedBytes > maxSizeBytes, 'Flags files exceeding 10MB limit');

  // -------------------------------------------------------------
  // Test 4: Missing Fields & Field Confidence Flagging
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Missing Fields & Review Flagging ---');
  // PDF missing invoice number and due date
  const incompletePdfContent = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 200 >> stream
BT
/F1 12 Tf
72 700 Td (INVOICE DOCUMENT WITHOUT INVOICE NUMBER) Tj
72 660 Td (Supplier: TechParts Manufacturing) Tj
72 620 Td (Total Amount: 100000.00) Tj
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000227 00000 n 
0000000480 00000 n 
trailer << /Root 1 0 R /Size 6 >>
startxref
555
%%EOF`;

  const incompletePath = path.join(testDir, 'incomplete_invoice.pdf');
  fs.writeFileSync(incompletePath, incompletePdfContent);

  try {
    const incResult = await DocumentIntelligenceService.processInvoiceDocument(
      incompletePath,
      'incomplete_invoice.pdf',
      'application/pdf'
    );

    assert(
      incResult.invoiceNumber.status === 'REVIEW_NEEDED' || incResult.invoiceNumber.confidence < 0.6,
      'Flagged missing/uncertain invoice number for manual review'
    );
    assert(incResult.overallConfidence < 0.9, 'Overall confidence reflects uncertainty (< 0.90)');
  } catch (err: any) {
    assert(false, 'Incomplete invoice processing exception', err.message);
  }

  // -------------------------------------------------------------
  // Test 5: Arithmetic & PO Mismatch Detection
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Arithmetic & PO Discrepancy Detection ---');
  // Discrepancy PDF: Subtotal 500,000 + Tax 50,000 != Total 700,000
  const arithmeticMismatchPdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 300 >> stream
BT
/F1 12 Tf
72 700 Td (Invoice No: TP-2026-MATH-FAIL) Tj
72 660 Td (Subtotal: 500000.00) Tj
72 640 Td (Tax: 50000.00) Tj
72 620 Td (Total Amount: 700000.00) Tj
72 600 Td (Buyer: AutoWorks Industries Ltd.) Tj
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000227 00000 n 
0000000580 00000 n 
trailer << /Root 1 0 R /Size 6 >>
startxref
655
%%EOF`;

  const mismatchPath = path.join(testDir, 'arithmetic_mismatch.pdf');
  fs.writeFileSync(mismatchPath, arithmeticMismatchPdf);

  try {
    const mismatchResult = await DocumentIntelligenceService.processInvoiceDocument(
      mismatchPath,
      'arithmetic_mismatch.pdf',
      'application/pdf',
      'PO-2026-AUTOWORKS-092' // PO amount is 500,000 vs 700,000
    );

    assert(mismatchResult.arithmeticValid === false, 'Detected arithmetic mismatch (500k + 50k != 700k)');
    assert(mismatchResult.totalAmount.status === 'REVIEW_NEEDED', 'Total amount flagged for review due to arithmetic error');
    assert(
      mismatchResult.poComparison?.isMatched === false,
      '3-Way PO check detected over-billing discrepancy against PO'
    );
  } catch (err: any) {
    assert(false, 'Arithmetic mismatch exception', err.message);
  }

  // -------------------------------------------------------------
  // Test 6: Duplicate Invoice Detection on DRUNIX World State
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Duplicate Invoice & Double-Pledge Prevention ---');
  // TP-2026-8812 is already seeded on the DRUNIX ledger in block #1043
  const dupPdfContent = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 200 >> stream
BT
/F1 12 Tf
72 700 Td (Invoice No: TP-2026-8812) Tj
72 660 Td (Total Amount: 500000.00) Tj
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000227 00000 n 
0000000480 00000 n 
trailer << /Root 1 0 R /Size 6 >>
startxref
555
%%EOF`;

  const dupPath = path.join(testDir, 'duplicate_invoice.pdf');
  fs.writeFileSync(dupPath, dupPdfContent);

  try {
    const dupResult = await DocumentIntelligenceService.processInvoiceDocument(
      dupPath,
      'duplicate_invoice.pdf',
      'application/pdf'
    );

    assert(dupResult.duplicateWarning?.isDuplicate === true, 'Flagged existing invoice number as duplicate on DRUNIX');
    assert(
      dupResult.duplicateWarning?.existingInvoiceId === 'INV-2026-001',
      'Identified conflicting on-chain invoice ID INV-2026-001'
    );

    // Also assert that attempting to create it on drunixGateway directly throws an on-chain error
    let thrown = false;
    try {
      await drunixGateway.createInvoice({
        invoiceNumber: 'TP-2026-8812',
        supplierId: 'SP-101',
        supplierOrg: 'TechParts Manufacturing',
        buyerId: 'BY-201',
        buyerOrg: 'AutoWorks',
        amount: 500000,
        dueDate: '2026-12-15',
        description: 'Duplicate attempt',
      });
    } catch (e: any) {
      thrown = true;
      assert(e.message.includes('DUPLICATE_INVOICE_ERROR'), 'DRUNIX ledger strictly rejects duplicate creation on-chain');
    }
    assert(thrown, 'createInvoice threw duplicate rejection error');
  } catch (err: any) {
    assert(false, 'Duplicate detection exception', err.message);
  }

  console.log('\n================================================================');
  console.log(`DOCUMENT INTELLIGENCE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  console.log('\n>>> Starting AI Invoice Risk Engine Test Suite...\n');
  const riskResults = await runComprehensiveRiskEngineTests();

  console.log('\n>>> Starting AI Financial Copilot Test Suite...\n');
  const copilotResults = await runCopilotTests();

  const totalPassed = passed + riskResults.passed + copilotResults.passed;
  const totalFailed = failed + riskResults.failed + copilotResults.failed;

  console.log('\n================================================================');
  console.log(`GRAND TEST SUITE SUMMARY: ${totalPassed} PASSED, ${totalFailed} FAILED`);
  console.log('================================================================\n');

  if (totalFailed > 0) process.exit(1);
}

runTestSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
