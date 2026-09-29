import { drunixGateway, Invoice } from './drunixGateway';
import { SAMPLE_PURCHASE_ORDERS } from './documentIntelligenceService';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface DetectedRiskFactor {
  id: string;
  category: 'REFERENCE' | 'AMOUNT' | 'DATE_TERMS' | 'PO_RECONCILIATION' | 'ENDORSEMENT_STATE' | 'CREDIT_MITIGANT';
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  scoreImpact: number;
  description: string;
  evidence: Record<string, any>;
}

export const GeminiRiskExplanationSchema = z.object({
  executiveSummary: z.string().min(10),
  keyObservations: z.array(z.string()).min(1),
  underwritingAssessment: z.string().min(10),
  recommendedAction: z.string().min(5),
});

export type GeminiRiskExplanation = z.infer<typeof GeminiRiskExplanationSchema>;

export interface InvoiceRiskAssessment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  supplierOrg: string;
  buyerOrg: string;
  amount: number;
  currency: string;
  riskScore: number; // 0 to 100
  riskLevel: RiskLevel;
  confidenceScore: number;
  detectedFactors: DetectedRiskFactor[];
  evidence: {
    drunixProof: {
      blockNumber: number;
      txId: string;
      signatureHash?: string;
      documentHash?: string;
    };
    poMatch?: {
      poNumber?: string;
      registered: boolean;
      amountDifference?: number;
      isExactMatch?: boolean;
    };
    statisticalBaseline?: {
      historicalAverage?: number;
      zScore?: number;
      multipleOfMean?: number;
      priorInvoicesCount: number;
    };
  };
  explanation: GeminiRiskExplanation;
  recommendedAction: string;
  analyzedAt: string;
  analyzedBy: string;
}

export class InvoiceRiskEngineService {
  private static assessments: Map<string, InvoiceRiskAssessment> = new Map();
  private static geminiClient: GoogleGenAI | null = null;
  private static isInitialized = false;

  public static initialize() {
    if (this.isInitialized) return;
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim() !== '') {
      try {
        this.geminiClient = new GoogleGenAI({ apiKey: apiKey.trim() });
      } catch (err) {
        console.warn('Could not initialize Gemini for Risk Engine:', err);
      }
    }
    this.seedDemonstrationAssessments();
    this.isInitialized = true;
    console.log('⚡ Invoice Risk Engine Service initialized');
  }

  /**
   * Seed demonstration assessments for initial presentation
   */
  private static seedDemonstrationAssessments() {
    const demo1: InvoiceRiskAssessment = {
      id: 'RSK-2026-001',
      invoiceId: 'INV-2026-001',
      invoiceNumber: 'TP-2026-8812',
      supplierOrg: 'TechParts Manufacturing Pvt. Ltd.',
      buyerOrg: 'AutoWorks Industries Ltd.',
      amount: 500000,
      currency: 'INR',
      riskScore: 12,
      riskLevel: 'LOW',
      confidenceScore: 0.95,
      detectedFactors: [
        {
          id: 'FCT-MITIGANT-1',
          category: 'CREDIT_MITIGANT',
          title: 'BuyerMSP Cryptographic Endorsement Verified',
          severity: 'LOW',
          scoreImpact: -10,
          description: 'Invoice accepted on DRUNIX Block #1043 by AutoWorks Industries Ltd. Goods receipt verified.',
          evidence: { blockNumber: 1043, actor: 'Rajesh Kumar (BuyerMSP)' },
        },
        {
          id: 'FCT-PO-1',
          category: 'PO_RECONCILIATION',
          title: 'Purchase Order Fully Reconciled',
          severity: 'LOW',
          scoreImpact: 0,
          description: 'Matched ERP PO-2026-AUTOWORKS-092. Line items, quantities, and pricing conform to contract terms.',
          evidence: { poNumber: 'PO-2026-AUTOWORKS-092', amountMatch: true },
        },
      ],
      evidence: {
        drunixProof: {
          blockNumber: 1043,
          txId: 'tx_drunix_7f8a92b1c4e0',
          signatureHash: 'sha256:drunix-SupplierMSP-7f8a92b1',
        },
        poMatch: {
          poNumber: 'PO-2026-AUTOWORKS-092',
          registered: true,
          amountDifference: 0,
          isExactMatch: true,
        },
        statisticalBaseline: {
          historicalAverage: 480000,
          zScore: 0.25,
          multipleOfMean: 1.04,
          priorInvoicesCount: 4,
        },
      },
      explanation: {
        executiveSummary: 'Invoice TP-2026-8812 presents an exceptionally clean credit profile with minimal risk (Score: 12/100). All deterministic validations passed with multi-party endorsement on DRUNIX.',
        keyObservations: [
          'Cryptographically accepted by AutoWorks Industries Ltd on DRUNIX Block #1043.',
          'Invoice amount (₹5,00,000) aligns perfectly with the historical supplier baseline of ₹4,80,000.',
          'Zero duplicate reference collisions detected across the consortium network.',
        ],
        underwritingAssessment: 'Prime trade receivable suitable for immediate 89% liquidity advance at prime factoring APR (11.0%).',
        recommendedAction: 'Approve for discount financing upon supplier request.',
      },
      recommendedAction: 'Approve for discount financing upon supplier request.',
      analyzedAt: '2026-09-20T10:00:00Z',
      analyzedBy: 'RiskDesk-Automated-Audit',
    };

    const demo2: InvoiceRiskAssessment = {
      id: 'RSK-2026-002',
      invoiceId: 'INV-2026-002',
      invoiceNumber: 'TP-2026-8815',
      supplierOrg: 'TechParts Manufacturing Pvt. Ltd.',
      buyerOrg: 'Metro Fleet Mobility Corp',
      amount: 1250000,
      currency: 'INR',
      riskScore: 42,
      riskLevel: 'MEDIUM',
      confidenceScore: 0.88,
      detectedFactors: [
        {
          id: 'FCT-AMT-1',
          category: 'AMOUNT',
          title: 'Elevated Invoice Value Relative to Counter-party Baseline',
          severity: 'MEDIUM',
          scoreImpact: 20,
          description: 'Amount ₹12,50,000 represents a 2.4x expansion compared to historical supplier-buyer median (₹5,20,000).',
          evidence: { currentAmount: 1250000, historicalMedian: 520000, multiple: 2.4 },
        },
        {
          id: 'FCT-PO-2',
          category: 'PO_RECONCILIATION',
          title: 'Unlinked Purchase Order Reference',
          severity: 'MEDIUM',
          scoreImpact: 15,
          description: 'No explicit purchase order number referenced in header. Requires manual contract verification.',
          evidence: { poNumber: null },
        },
      ],
      evidence: {
        drunixProof: {
          blockNumber: 1044,
          txId: 'tx_drunix_2e4d6a8b1c90',
          signatureHash: 'sha256:drunix-SupplierMSP-2e4d6a8b',
        },
        statisticalBaseline: {
          historicalAverage: 520000,
          zScore: 2.35,
          multipleOfMean: 2.4,
          priorInvoicesCount: 3,
        },
      },
      explanation: {
        executiveSummary: 'Invoice TP-2026-8815 exhibits a Moderate Risk rating (Score: 42/100) primarily driven by volume expansion and unlinked PO metadata.',
        keyObservations: [
          'Accepted on DRUNIX by Metro Fleet Mobility Corp (Sunil Verma) confirming delivery authenticity.',
          'Invoice amount (₹12,50,000) is 2.4x the historical median for this relationship.',
          'No duplicate collisions found; financing requested at 11.5% discount APR.',
        ],
        underwritingAssessment: 'Financing is permissible given buyer cryptographic endorsement, but underwriting should require delivery challan confirmation.',
        recommendedAction: 'Verify delivery receipt with Metro Fleet Mobility procurement desk before committing funds.',
      },
      recommendedAction: 'Verify delivery receipt with Metro Fleet Mobility procurement desk before committing funds.',
      analyzedAt: '2026-09-22T12:00:00Z',
      analyzedBy: 'QuickFund-RiskDesk',
    };

    this.assessments.set(demo1.invoiceId, demo1);
    this.assessments.set(demo2.invoiceId, demo2);
  }

  /**
   * Run full risk analysis on an invoice
   */
  public static async analyzeInvoiceRisk(
    invoiceId: string,
    actorId: string = 'Automated-Risk-Engine'
  ): Promise<InvoiceRiskAssessment> {
    this.initialize();

    const invoice = await drunixGateway.getInvoiceById(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice '${invoiceId}' was not found on the DRUNIX distributed ledger.`);
    }

    const allInvoices = await drunixGateway.getAllInvoices();
    const detectedFactors: DetectedRiskFactor[] = [];
    let cumulativeScore = 0;

    // 1. RULE 1: DUPLICATE INVOICE NUMBER OR DOCUMENT HASH (Max: +45 pts)
    const cleanNum = invoice.invoiceNumber.trim().toLowerCase();
    const duplicateInvoices = allInvoices.filter(
      (i) => i.id !== invoice.id && i.invoiceNumber.trim().toLowerCase() === cleanNum
    );

    if (duplicateInvoices.length > 0) {
      const dup = duplicateInvoices[0];
      const factor: DetectedRiskFactor = {
        id: 'FCT-DUPE-REF',
        category: 'REFERENCE',
        title: 'Duplicate Invoice Number Collision Detected',
        severity: 'CRITICAL',
        scoreImpact: 45,
        description: `Invoice reference '${invoice.invoiceNumber}' is already registered on DRUNIX under ID ${dup.id} (Block #${dup.blockNumber}).`,
        evidence: { conflictingInvoiceId: dup.id, conflictingTxId: dup.txId, blockNumber: dup.blockNumber },
      };
      detectedFactors.push(factor);
      cumulativeScore += 45;
    }

    if (invoice.documentHash) {
      const hashDupes = allInvoices.filter(
        (i) => i.id !== invoice.id && i.documentHash && i.documentHash === invoice.documentHash
      );
      if (hashDupes.length > 0) {
        const factor: DetectedRiskFactor = {
          id: 'FCT-DUPE-HASH',
          category: 'REFERENCE',
          title: 'Duplicate Cryptographic Document Hash',
          severity: 'CRITICAL',
          scoreImpact: 45,
          description: `Cryptographic SHA-256 fingerprint matches pre-existing on-chain invoice ${hashDupes[0].id}.`,
          evidence: { conflictingInvoiceId: hashDupes[0].id, hash: invoice.documentHash },
        };
        detectedFactors.push(factor);
        cumulativeScore += 45;
      }
    }

    // 2. RULE 2: UNUSUAL INVOICE AMOUNTS (Max: +20 pts)
    const supplierInvoices = allInvoices.filter((i) => i.supplierId === invoice.supplierId && i.id !== invoice.id);
    let statisticalBaseline: any = { priorInvoicesCount: supplierInvoices.length };

    if (supplierInvoices.length >= 2) {
      const amounts = supplierInvoices.map((i) => i.amount);
      const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);
      const zScore = stdDev > 0 ? (invoice.amount - mean) / stdDev : 0;
      const multiple = invoice.amount / mean;

      statisticalBaseline = {
        historicalAverage: Math.round(mean),
        zScore: Number(zScore.toFixed(2)),
        multipleOfMean: Number(multiple.toFixed(2)),
        priorInvoicesCount: supplierInvoices.length,
      };

      if (zScore >= 3.0 || multiple >= 3.5) {
        detectedFactors.push({
          id: 'FCT-AMT-CRIT',
          category: 'AMOUNT',
          title: 'Severe Statistical Amount Outlier (>3.5x baseline)',
          severity: 'HIGH',
          scoreImpact: 20,
          description: `Amount of ₹${invoice.amount.toLocaleString('en-IN')} is ${multiple.toFixed(1)}x greater than historical supplier baseline of ₹${Math.round(mean).toLocaleString('en-IN')}.`,
          evidence: statisticalBaseline,
        });
        cumulativeScore += 20;
      } else if (zScore >= 2.0 || multiple >= 2.0) {
        detectedFactors.push({
          id: 'FCT-AMT-WARN',
          category: 'AMOUNT',
          title: 'Elevated Invoice Value (>2.0x baseline)',
          severity: 'MEDIUM',
          scoreImpact: 15,
          description: `Amount of ₹${invoice.amount.toLocaleString('en-IN')} exceeds typical baseline by ${multiple.toFixed(1)}x.`,
          evidence: statisticalBaseline,
        });
        cumulativeScore += 15;
      }
    } else if (invoice.amount > 5000000) {
      // First-time high-value receivable
      detectedFactors.push({
        id: 'FCT-AMT-FIRST-HIGH',
        category: 'AMOUNT',
        title: 'First-Time High-Value Receivable (> ₹50L)',
        severity: 'MEDIUM',
        scoreImpact: 15,
        description: 'Large transaction value with limited counter-party historical seasoning on DRUNIX.',
        evidence: { amount: invoice.amount },
      });
      cumulativeScore += 15;
    }

    // 3. RULE 3: INCONSISTENT DATES & SUSPICIOUS PAYMENT TERMS (Max: +20 pts)
    const issueTime = new Date(invoice.issueDate).getTime();
    const dueTime = new Date(invoice.dueDate).getTime();
    const nowTime = new Date().getTime();

    if (isNaN(issueTime) || isNaN(dueTime)) {
      detectedFactors.push({
        id: 'FCT-DATE-INVALID',
        category: 'DATE_TERMS',
        title: 'Malformed Commercial Date Format',
        severity: 'HIGH',
        scoreImpact: 20,
        description: 'Invoice metadata contains unparseable or corrupted date strings.',
        evidence: { issueDate: invoice.issueDate, dueDate: invoice.dueDate },
      });
      cumulativeScore += 20;
    } else {
      const termDays = Math.round((dueTime - issueTime) / (1000 * 60 * 60 * 24));

      if (dueTime < issueTime) {
        detectedFactors.push({
          id: 'FCT-DATE-PARADOX',
          category: 'DATE_TERMS',
          title: 'Commercial Date Paradox: Due Date Precedes Issuance Date',
          severity: 'HIGH',
          scoreImpact: 20,
          description: `Maturity due date (${invoice.dueDate.slice(0, 10)}) is earlier than issuance date (${invoice.issueDate.slice(0, 10)}).`,
          evidence: { issueDate: invoice.issueDate, dueDate: invoice.dueDate },
        });
        cumulativeScore += 20;
      } else if (termDays > 180) {
        detectedFactors.push({
          id: 'FCT-TERMS-LONG',
          category: 'DATE_TERMS',
          title: 'Abnormally Extended Credit Period (>180 Days)',
          severity: 'MEDIUM',
          scoreImpact: 15,
          description: `Payment term of ${termDays} days exceeds MSMEDA 45-day statutory guideline and market norms.`,
          evidence: { termDays },
        });
        cumulativeScore += 15;
      } else if (termDays < 3 && termDays >= 0) {
        detectedFactors.push({
          id: 'FCT-TERMS-SHORT',
          category: 'DATE_TERMS',
          title: 'Extremely Short Settlement Term (<3 Days)',
          severity: 'LOW',
          scoreImpact: 10,
          description: `Credit term of ${termDays} days is unusual for industrial B2B trade.`,
          evidence: { termDays },
        });
        cumulativeScore += 10;
      }

      // Check if already overdue
      if (dueTime < nowTime && invoice.status !== 'SETTLED') {
        const daysOverdue = Math.round((nowTime - dueTime) / (1000 * 60 * 60 * 24));
        detectedFactors.push({
          id: 'FCT-OVERDUE',
          category: 'DATE_TERMS',
          title: `Overdue Maturity (${daysOverdue} Days Past Due)`,
          severity: daysOverdue > 30 ? 'HIGH' : 'MEDIUM',
          scoreImpact: daysOverdue > 30 ? 20 : 15,
          description: `Receivable is past its maturity date without verified settlement on DRUNIX.`,
          evidence: { daysOverdue, dueDate: invoice.dueDate },
        });
        cumulativeScore += (daysOverdue > 30 ? 20 : 15);
      }
    }

    // 4. RULE 4: PURCHASE ORDER RECONCILIATION MISMATCHES (Max: +20 pts)
    let poMatchResult: any = { registered: false };

    if (invoice.poNumber) {
      const cleanPo = invoice.poNumber.trim().toLowerCase();
      const matchedPo = SAMPLE_PURCHASE_ORDERS.find(
        (p: any) => p.poNumber.toLowerCase() === cleanPo
      );

      if (!matchedPo) {
        detectedFactors.push({
          id: 'FCT-PO-UNMATCHED',
          category: 'PO_RECONCILIATION',
          title: 'Unverified Purchase Order Reference',
          severity: 'MEDIUM',
          scoreImpact: 15,
          description: `Referenced PO '${invoice.poNumber}' was not found in the verified corporate ERP order catalog.`,
          evidence: { poNumber: invoice.poNumber },
        });
        cumulativeScore += 15;
        poMatchResult = { poNumber: invoice.poNumber, registered: false };
      } else {
        const diff = Math.abs(invoice.amount - matchedPo.amount);
        const diffPercent = (diff / matchedPo.amount) * 100;

        if (diffPercent > 5.0) {
          detectedFactors.push({
            id: 'FCT-PO-AMT-MISMATCH',
            category: 'PO_RECONCILIATION',
            title: `PO Value Discrepancy (${diffPercent.toFixed(1)}% Variance)`,
            severity: 'HIGH',
            scoreImpact: 20,
            description: `Invoice value (₹${invoice.amount.toLocaleString('en-IN')}) deviates from PO approved value (₹${matchedPo.amount.toLocaleString('en-IN')}).`,
            evidence: {
              poNumber: matchedPo.poNumber,
              invoiceAmount: invoice.amount,
              poAmount: matchedPo.amount,
              variance: diff,
            },
          });
          cumulativeScore += 20;
          poMatchResult = { poNumber: matchedPo.poNumber, registered: true, amountDifference: diff, isExactMatch: false };
        } else {
          poMatchResult = { poNumber: matchedPo.poNumber, registered: true, amountDifference: diff, isExactMatch: true };
        }
      }
    } else {
      // Missing PO reference
      detectedFactors.push({
        id: 'FCT-PO-MISSING',
        category: 'PO_RECONCILIATION',
        title: 'Missing Purchase Order Linkage',
        severity: 'LOW',
        scoreImpact: 10,
        description: 'Invoice does not specify an underlying corporate purchase order number.',
        evidence: { poNumber: null },
      });
      cumulativeScore += 10;
    }

    // 5. RULE 5: DRUNIX ENDORSEMENT STATE (Max: +10 pts)
    if (invoice.status === 'CREATED') {
      detectedFactors.push({
        id: 'FCT-UNENDORSED',
        category: 'ENDORSEMENT_STATE',
        title: 'Pending BuyerMSP Goods Acceptance Endorsement',
        severity: 'LOW',
        scoreImpact: 10,
        description: 'Receivable is in draft state; buyer has not yet affixed cryptographic signature on DRUNIX.',
        evidence: { status: invoice.status },
      });
      cumulativeScore += 10;
    } else if (invoice.status === 'ACCEPTED' || invoice.status === 'FINANCED' || invoice.status === 'SETTLED') {
      // Credit Mitigant: verified buyer endorsement on-chain
      detectedFactors.push({
        id: 'FCT-ENDORSED-BONUS',
        category: 'CREDIT_MITIGANT',
        title: 'Cryptographic Multi-Party Endorsement Confirmed',
        severity: 'LOW',
        scoreImpact: -10,
        description: 'BuyerMSP signature verified on DRUNIX ledger. Mitigates commercial acceptance dispute risk.',
        evidence: { endorsementsCount: invoice.endorsementHistory.length },
      });
      cumulativeScore -= 10;
    }

    // Bound final score between 0 and 100
    const finalScore = Math.max(0, Math.min(100, cumulativeScore));

    let riskLevel: RiskLevel = 'LOW';
    if (finalScore >= 75) riskLevel = 'CRITICAL';
    else if (finalScore >= 50) riskLevel = 'HIGH';
    else if (finalScore >= 25) riskLevel = 'MEDIUM';

    let recommendedAction = 'Standard commercial invoice. Approved for discounting under standard terms.';
    if (riskLevel === 'CRITICAL') {
      recommendedAction = 'HOLD ALL FINANCING: Critical duplicate reference or hash collision. Escalate to Consortium Auditor.';
    } else if (riskLevel === 'HIGH') {
      recommendedAction = 'ENHANCED DUE DILIGENCE: Reconcile PO variance and confirm buyer acceptance before advancing funds.';
    } else if (riskLevel === 'MEDIUM') {
      recommendedAction = 'MANUAL RISK REVIEW: Verify delivery challan and confirm payment terms with procurement desk.';
    }

    // Generate Gemini explanation with Zod validation
    const explanation = await this.generateGeminiExplanation(invoice, finalScore, riskLevel, detectedFactors);

    const assessment: InvoiceRiskAssessment = {
      id: `RSK-2026-${String(this.assessments.size + 1).padStart(3, '0')}`,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      supplierOrg: invoice.supplierOrg,
      buyerOrg: invoice.buyerOrg,
      amount: invoice.amount,
      currency: invoice.currency,
      riskScore: finalScore,
      riskLevel,
      confidenceScore: duplicateInvoices.length > 0 ? 0.99 : 0.92,
      detectedFactors,
      evidence: {
        drunixProof: {
          blockNumber: invoice.blockNumber,
          txId: invoice.txId,
          signatureHash: invoice.endorsementHistory[invoice.endorsementHistory.length - 1]?.signatureHash,
          documentHash: invoice.documentHash,
        },
        poMatch: poMatchResult,
        statisticalBaseline,
      },
      explanation,
      recommendedAction,
      analyzedAt: new Date().toISOString(),
      analyzedBy: actorId,
    };

    // Save to persistence cache and attach to invoice record
    this.assessments.set(invoice.id, assessment);
    return assessment;
  }

  /**
   * Gemini Natural Language Synthesis with strict Zod Validation
   */
  private static async generateGeminiExplanation(
    invoice: Invoice,
    score: number,
    level: RiskLevel,
    factors: DetectedRiskFactor[]
  ): Promise<GeminiRiskExplanation> {
    if (this.geminiClient && process.env.GEMINI_API_KEY) {
      try {
        const prompt = `You are the Lead Credit Risk Analyst for InvoiceNet DRUNIX.
Synthesize the deterministic risk findings into structured JSON:
- Invoice: ${invoice.invoiceNumber} (${invoice.id})
- Amount: ₹${invoice.amount.toLocaleString('en-IN')}
- Parties: ${invoice.supplierOrg} → ${invoice.buyerOrg}
- Score: ${score}/100 (${level} Risk)
- Detected Factors: ${JSON.stringify(factors)}

Respond with STRICT JSON matching this schema:
{
  "executiveSummary": "Concise 2-sentence summary of the score and primary drivers.",
  "keyObservations": ["Observation 1", "Observation 2", "Observation 3"],
  "underwritingAssessment": "Professional credit risk analysis.",
  "recommendedAction": "Actionable next step."
}
DO NOT invent facts not present in the input.`;

        const res = await this.geminiClient.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        });

        const rawText = res.text || '{}';
        const parsed = JSON.parse(rawText);
        const validated = GeminiRiskExplanationSchema.safeParse(parsed);

        if (validated.success) {
          return validated.data;
        } else {
          console.warn('Gemini risk explanation failed Zod validation, falling back to deterministic explanation:', validated.error);
        }
      } catch (err: any) {
        console.warn('Gemini risk explanation call failed:', err.message);
      }
    }

    // High quality deterministic FinTech fallback adhering to Zod schema
    const factorSummaries = factors.map((f) => f.title);
    return {
      executiveSummary: `Invoice ${invoice.invoiceNumber} evaluated with a Risk Score of ${score}/100 (${level} Risk level) on the DRUNIX distributed ledger.`,
      keyObservations: factorSummaries.length > 0 ? factorSummaries : ['Invoice conforms to baseline commercial parameters without detected anomalies.'],
      underwritingAssessment:
        level === 'CRITICAL'
          ? 'Severe reference collision or cryptographic anomaly detected on DRUNIX. High probability of operational dispute or duplicate pledge.'
          : level === 'HIGH'
          ? 'Elevated risk parameters identified. Substantial amount variance or PO discrepancy requires underwriting verification.'
          : level === 'MEDIUM'
          ? 'Moderate risk profile with minor deviations. Standard counter-party verification recommended.'
          : 'Low-risk prime trade receivable backed by verified buyer endorsement on the DRUNIX consensus network.',
      recommendedAction:
        level === 'CRITICAL'
          ? 'Hold financing and escalate to Consortium Auditor.'
          : level === 'HIGH'
          ? 'Conduct enhanced PO reconciliation before funding.'
          : 'Proceed with standard financing workflow upon request.',
    };
  }

  /**
   * Get existing assessment for an invoice
   */
  public static getAssessment(invoiceId: string): InvoiceRiskAssessment | null {
    this.initialize();
    return this.assessments.get(invoiceId) || null;
  }

  /**
   * Get all assessments across authorized invoices
   */
  public static async getAllAssessments(
    userRole: string,
    userOrg: string,
    userId: string
  ): Promise<InvoiceRiskAssessment[]> {
    this.initialize();
    const allInvoices = await drunixGateway.getAllInvoices();

    // Filter by role
    let authorized = allInvoices;
    if (userRole === 'SUPPLIER') {
      authorized = allInvoices.filter(
        (i) =>
          i.supplierId.toLowerCase() === userId.toLowerCase() ||
          i.supplierOrg.toLowerCase().includes(userOrg.toLowerCase())
      );
    } else if (userRole === 'BUYER') {
      authorized = allInvoices.filter(
        (i) =>
          i.buyerId.toLowerCase() === userId.toLowerCase() ||
          i.buyerOrg.toLowerCase().includes(userOrg.toLowerCase())
      );
    }

    const authIds = new Set(authorized.map((i) => i.id));
    return Array.from(this.assessments.values())
      .filter((a) => authIds.has(a.invoiceId))
      .sort((a, b) => b.riskScore - a.riskScore);
  }
}
