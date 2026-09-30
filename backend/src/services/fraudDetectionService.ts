import { drunixGateway, Invoice } from './drunixGateway';
import { GoogleGenAI } from '@google/genai';
import { v4 as uuidv4 } from 'uuid';

export type AnomalyType =
  | 'REPEATED_INVOICE_REFERENCE'
  | 'REPEATED_FINANCING_ATTEMPT'
  | 'UNUSUAL_INVOICE_AMOUNT'
  | 'PAYMENT_DETAILS_MODIFICATION'
  | 'UNUSUAL_TRANSACTION_FREQUENCY'
  | 'INVOICE_HISTORY_INCONSISTENCY';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type InvestigationStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'FALSE_POSITIVE';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorOrg: string;
  action: string;
  notes?: string;
  previousStatus?: InvestigationStatus;
  newStatus?: InvestigationStatus;
}

export interface InvestigationNote {
  id: string;
  author: string;
  role: string;
  timestamp: string;
  note: string;
}

export interface FraudAlert {
  id: string;
  anomalyType: AnomalyType;
  severity: AlertSeverity;
  status: InvestigationStatus;
  invoiceId: string;
  invoiceNumber: string;
  supplierId: string;
  supplierOrg: string;
  buyerId: string;
  buyerOrg: string;
  amount: number;
  detectedAt: string;
  headline: string;
  evidence: {
    description: string;
    metrics?: Record<string, any>;
    conflictingInvoiceId?: string;
    conflictingTxId?: string;
    expectedValue?: string | number;
    observedValue?: string | number;
    drunixProof?: {
      blockNumber: number;
      txId: string;
      signatureHash: string;
      documentHash?: string;
    };
  };
  geminiExplanation?: string;
  investigationNotes: InvestigationNote[];
  auditTrail: AuditLogEntry[];
}

export interface FraudEngineConfig {
  amountZScoreThreshold: number;
  amountMultipleThreshold: number;
  velocityWindowMinutes: number;
  velocityMaxInvoices: number;
  minHistoricalRecordsForStats: number;
  deduplicationWindowHours: number;
}

export class FraudDetectionService {
  private static alerts: Map<string, FraudAlert> = new Map();
  private static deduplicationCache: Set<string> = new Set();
  private static geminiClient: GoogleGenAI | null = null;
  private static isInitialized = false;

  private static config: FraudEngineConfig = {
    amountZScoreThreshold: 2.5,
    amountMultipleThreshold: 3.0,
    velocityWindowMinutes: 60,
    velocityMaxInvoices: 3,
    minHistoricalRecordsForStats: 2,
    deduplicationWindowHours: 24,
  };

  public static initialize() {
    if (this.isInitialized) return;
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim() !== '') {
      try {
        this.geminiClient = new GoogleGenAI({ apiKey: apiKey.trim() });
      } catch (err) {
        console.warn('Could not initialize Gemini for Fraud Service:', err);
      }
    }

    this.seedDemonstrationAlerts();
    this.isInitialized = true;
    console.log('🛡️ Fraud & Anomaly Detection Center initialized');
  }

  public static getConfig(): FraudEngineConfig {
    return { ...this.config };
  }

  public static updateConfig(newConfig: Partial<FraudEngineConfig>): FraudEngineConfig {
    this.config = { ...this.config, ...newConfig };
    return { ...this.config };
  }

  /**
   * Seed realistic demonstration alerts for the hackathon jury
   */
  private static seedDemonstrationAlerts() {
    const alert1: FraudAlert = {
      id: 'ALT-2026-001',
      anomalyType: 'REPEATED_FINANCING_ATTEMPT',
      severity: 'HIGH',
      status: 'UNDER_REVIEW',
      invoiceId: 'INV-2026-003',
      invoiceNumber: 'TP-2026-8799',
      supplierId: 'SP-101',
      supplierOrg: 'TechParts Manufacturing Pvt. Ltd.',
      buyerId: 'BY-201',
      buyerOrg: 'AutoWorks Industries Ltd.',
      amount: 780000,
      detectedAt: '2026-09-23T14:20:00Z',
      headline: 'Requires Review: Secondary financing inquiry on financed receivable',
      evidence: {
        description: 'Invoice TP-2026-8799 is already registered as FINANCED by QuickFund Capital on DRUNIX Block #1045. A secondary discount quote request was received.',
        metrics: {
          originalFinancier: 'QuickFund Capital',
          originalBlockNumber: 1045,
          originalDiscountRate: 11.0,
        },
        conflictingInvoiceId: 'INV-2026-003',
        conflictingTxId: 'tx_drunix_8b1c902e4d6a',
        drunixProof: {
          blockNumber: 1045,
          txId: 'tx_drunix_8b1c902e4d6a',
          signatureHash: 'sha256:drunix-FinancierMSP-0e1a3f4b',
          documentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        },
      },
      geminiExplanation: 'Objective Analysis: On DRUNIX Block #1045, invoice TP-2026-8799 was endorsed as FINANCED. A subsequent financing query was logged. Under DRUNIX double-pledge prevention protocols, receivables cannot be pledged to multiple financiers concurrently. Recommended action: Verify whether this is an accidental duplicate quote request from the supplier ERP before closing the review.',
      investigationNotes: [
        {
          id: 'note-1',
          author: 'Ananya Patel',
          role: 'FINANCIER',
          timestamp: '2026-09-23T15:10:00Z',
          note: 'Confirmed existing facility with TechParts. We funded 89% (₹6,94,200) on 2026-08-05. Flagged to supplier finance desk for confirmation.',
        },
      ],
      auditTrail: [
        {
          id: 'aud-1',
          timestamp: '2026-09-23T14:20:00Z',
          actorId: 'DRUNIX-Sentinel-Engine',
          actorOrg: 'NetworkAuditor',
          action: 'ALERT_GENERATED',
          newStatus: 'OPEN',
        },
        {
          id: 'aud-2',
          timestamp: '2026-09-23T15:10:00Z',
          actorId: 'Ananya Patel',
          actorOrg: 'FinancierMSP',
          action: 'STATUS_UPDATED',
          previousStatus: 'OPEN',
          newStatus: 'UNDER_REVIEW',
          notes: 'Case taken under active review by QuickFund risk desk.',
        },
      ],
    };

    const alert2: FraudAlert = {
      id: 'ALT-2026-002',
      anomalyType: 'UNUSUAL_INVOICE_AMOUNT',
      severity: 'MEDIUM',
      status: 'OPEN',
      invoiceId: 'INV-2026-002',
      invoiceNumber: 'TP-2026-8815',
      supplierId: 'SP-101',
      supplierOrg: 'TechParts Manufacturing Pvt. Ltd.',
      buyerId: 'BY-202',
      buyerOrg: 'Metro Fleet Mobility Corp',
      amount: 1250000,
      detectedAt: '2026-09-20T08:15:00Z',
      headline: 'Requires Review: Statistical amount deviation (>2.3x supplier median volume)',
      evidence: {
        description: 'Invoice amount of ₹12,50,000 exceeds historical average of ₹5,20,000 for this supplier counter-party pair.',
        metrics: {
          invoiceAmount: 1250000,
          historicalMedian: 520000,
          ratioToMedian: 2.4,
          zScore: 2.35,
        },
        expectedValue: '₹5,20,000 (historical benchmark)',
        observedValue: '₹12,50,000',
        drunixProof: {
          blockNumber: 1044,
          txId: 'tx_drunix_2e4d6a8b1c90',
          signatureHash: 'sha256:drunix-SupplierMSP-2e4d6a8b',
        },
      },
      geminiExplanation: 'Objective Analysis: The requested invoice amount (₹12,50,000) represents a 2.4x volume expansion compared to historical invoices for this supplier-buyer relationship. This pattern is consistent with new high-volume purchase order fulfillment (heavy duty telemetry IoT batch), but warrants commercial confirmation with Metro Fleet Mobility before funding.',
      investigationNotes: [],
      auditTrail: [
        {
          id: 'aud-3',
          timestamp: '2026-09-20T08:15:00Z',
          actorId: 'DRUNIX-Sentinel-Engine',
          actorOrg: 'NetworkAuditor',
          action: 'ALERT_GENERATED',
          newStatus: 'OPEN',
        },
      ],
    };

    const alert3: FraudAlert = {
      id: 'ALT-2026-003',
      anomalyType: 'PAYMENT_DETAILS_MODIFICATION',
      severity: 'HIGH',
      status: 'RESOLVED',
      invoiceId: 'INV-2026-001',
      invoiceNumber: 'TP-2026-8812',
      supplierId: 'SP-101',
      supplierOrg: 'TechParts Manufacturing Pvt. Ltd.',
      buyerId: 'BY-201',
      buyerOrg: 'AutoWorks Industries Ltd.',
      amount: 500000,
      detectedAt: '2026-09-15T10:05:00Z',
      headline: 'Suspicious Activity: Counter-party GSTIN State Code Revision',
      evidence: {
        description: 'Supplier submitted updated GSTIN ending in Q1ZV (State 27 - Maharashtra) whereas earlier contract reference indicated State 29 (Karnataka).',
        metrics: {
          previousGstinState: '29 (Karnataka)',
          newGstinState: '27 (Maharashtra)',
        },
        expectedValue: '29AABCT3518Q1ZV',
        observedValue: '27AABCT3518Q1ZV',
        drunixProof: {
          blockNumber: 1043,
          txId: 'tx_drunix_7f8a92b1c4e0',
          signatureHash: 'sha256:drunix-SupplierMSP-7f8a92b1',
        },
      },
      geminiExplanation: 'Objective Analysis: A change in the first two digits of the GSTIN denotes a different state tax registration branch (Pune plant vs Bangalore headquarters). The auditor verified the active corporate GST portal registration for the Maharashtra manufacturing unit and resolved the case.',
      investigationNotes: [
        {
          id: 'note-2',
          author: 'Jury Auditor',
          role: 'EXPLORER',
          timestamp: '2026-09-16T11:00:00Z',
          note: 'Verified with TechParts finance controller. The Pune precision transmission unit holds valid GSTIN 27AABCT3518Q1ZV. Verified legitimate branch invoicing.',
        },
      ],
      auditTrail: [
        {
          id: 'aud-4',
          timestamp: '2026-09-15T10:05:00Z',
          actorId: 'DRUNIX-Sentinel-Engine',
          actorOrg: 'NetworkAuditor',
          action: 'ALERT_GENERATED',
          newStatus: 'OPEN',
        },
        {
          id: 'aud-5',
          timestamp: '2026-09-16T11:00:00Z',
          actorId: 'Jury Auditor',
          actorOrg: 'NetworkAuditor',
          action: 'STATUS_UPDATED',
          previousStatus: 'OPEN',
          newStatus: 'RESOLVED',
          notes: 'Verified branch registration on GST portal. Marked resolved.',
        },
      ],
    };

    this.alerts.set(alert1.id, alert1);
    this.alerts.set(alert2.id, alert2);
    this.alerts.set(alert3.id, alert3);
  }

  /**
   * Run the full detection engine against on-chain invoices
   */
  public static async scanLedgerForAnomalies(): Promise<FraudAlert[]> {
    this.initialize();
    const allInvoices = await drunixGateway.getAllInvoices();
    const generatedAlerts: FraudAlert[] = [];

    // Group invoices by supplier to compute statistical baselines
    const supplierMap = new Map<string, Invoice[]>();
    for (const inv of allInvoices) {
      const list = supplierMap.get(inv.supplierId) || [];
      list.push(inv);
      supplierMap.set(inv.supplierId, list);
    }

    for (const inv of allInvoices) {
      // RULE 1: Repeated Invoice References / Similar Numbers
      const duplicateAlert = this.checkRepeatedInvoiceReference(inv, allInvoices);
      if (duplicateAlert) generatedAlerts.push(duplicateAlert);

      // RULE 2: Repeated Financing Attempts (Double-Financing)
      const doubleFinanceAlert = this.checkRepeatedFinancingAttempt(inv);
      if (doubleFinanceAlert) generatedAlerts.push(doubleFinanceAlert);

      // RULE 3: Statistical Outlier in Invoice Amount
      const supplierInvoices = supplierMap.get(inv.supplierId) || [];
      const amountAlert = this.checkUnusualInvoiceAmount(inv, supplierInvoices);
      if (amountAlert) generatedAlerts.push(amountAlert);

      // RULE 4: Transaction Frequency / Velocity Surge
      const velocityAlert = this.checkTransactionVelocity(inv, supplierInvoices);
      if (velocityAlert) generatedAlerts.push(velocityAlert);

      // RULE 5: Temporal or Arithmetic Inconsistencies
      const inconsistencyAlert = this.checkInvoiceHistoryInconsistency(inv);
      if (inconsistencyAlert) generatedAlerts.push(inconsistencyAlert);
    }

    // Save non-duplicate alerts to store
    for (const alert of generatedAlerts) {
      if (!this.alerts.has(alert.id)) {
        this.alerts.set(alert.id, alert);
      }
    }

    return Array.from(this.alerts.values()).sort(
      (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
    );
  }

  /**
   * Rule 1: Check Repeated Invoice References
   */
  public static checkRepeatedInvoiceReference(current: Invoice, allInvoices: Invoice[]): FraudAlert | null {
    const cleanNum = current.invoiceNumber.trim().toLowerCase();
    const duplicates = allInvoices.filter(
      (i) => i.id !== current.id && i.invoiceNumber.trim().toLowerCase() === cleanNum
    );

    if (duplicates.length === 0) return null;

    const dup = duplicates[0];
    const dedupeKey = `REPEATED_REF_${current.id}_${dup.id}`;
    if (this.deduplicationCache.has(dedupeKey)) return null;
    this.deduplicationCache.add(dedupeKey);

    const alertId = `ALT-2026-${String(this.alerts.size + 1).padStart(3, '0')}`;
    const alert: FraudAlert = {
      id: alertId,
      anomalyType: 'REPEATED_INVOICE_REFERENCE',
      severity: 'CRITICAL',
      status: 'OPEN',
      invoiceId: current.id,
      invoiceNumber: current.invoiceNumber,
      supplierId: current.supplierId,
      supplierOrg: current.supplierOrg,
      buyerId: current.buyerId,
      buyerOrg: current.buyerOrg,
      amount: current.amount,
      detectedAt: new Date().toISOString(),
      headline: `Suspicious Activity: Identical invoice reference '${current.invoiceNumber}' registered twice on DRUNIX`,
      evidence: {
        description: `Invoice reference '${current.invoiceNumber}' matches pre-existing on-chain record ${dup.id} (Block #${dup.blockNumber}).`,
        conflictingInvoiceId: dup.id,
        conflictingTxId: dup.txId,
        observedValue: current.invoiceNumber,
        expectedValue: `Unique reference (collides with ${dup.id})`,
        drunixProof: {
          blockNumber: current.blockNumber,
          txId: current.txId,
          signatureHash: `sha256:drunix-${current.txId.slice(-8)}`,
          documentHash: current.documentHash,
        },
      },
      geminiExplanation: `Objective Analysis: Invoice number '${current.invoiceNumber}' is already registered on DRUNIX under ID ${dup.id}. DRUNIX consensus enforces reference uniqueness. Recommended action: Verify whether this is an inadvertent resubmission of an already-registered trade receivable or an amendment.`,
      investigationNotes: [],
      auditTrail: [
        {
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          actorId: 'DRUNIX-Sentinel-Engine',
          actorOrg: 'NetworkAuditor',
          action: 'ALERT_GENERATED',
          newStatus: 'OPEN',
        },
      ],
    };

    return alert;
  }

  /**
   * Rule 2: Check Repeated Financing Attempts (Double Financing)
   */
  public static checkRepeatedFinancingAttempt(current: Invoice): FraudAlert | null {
    // If invoice is already FINANCED, check if another FINANCING_REQUESTED or FINANCE endorsement exists
    const financingEndorsements = current.endorsementHistory.filter(
      (e) => e.action === 'FINANCE_INVOICE' || e.action === 'REQUEST_FINANCING'
    );

    if (current.status === 'FINANCED' && financingEndorsements.length > 2) {
      const dedupeKey = `DOUBLE_FIN_${current.id}`;
      if (this.deduplicationCache.has(dedupeKey)) return null;
      this.deduplicationCache.add(dedupeKey);

      const alertId = `ALT-2026-${String(this.alerts.size + 1).padStart(3, '0')}`;
      return {
        id: alertId,
        anomalyType: 'REPEATED_FINANCING_ATTEMPT',
        severity: 'HIGH',
        status: 'OPEN',
        invoiceId: current.id,
        invoiceNumber: current.invoiceNumber,
        supplierId: current.supplierId,
        supplierOrg: current.supplierOrg,
        buyerId: current.buyerId,
        buyerOrg: current.buyerOrg,
        amount: current.amount,
        detectedAt: new Date().toISOString(),
        headline: 'Requires Review: Multiple financing endorsement events on active receivable',
        evidence: {
          description: `Receivable ${current.invoiceNumber} has ${financingEndorsements.length} financing actions recorded. DRUNIX prevents multiple concurrent pledges.`,
          metrics: {
            endorsementsCount: financingEndorsements.length,
            currentFinancier: current.financierOrg,
          },
          drunixProof: {
            blockNumber: current.blockNumber,
            txId: current.txId,
            signatureHash: current.endorsementHistory[current.endorsementHistory.length - 1]?.signatureHash || 'sha256:drunix',
          },
        },
        geminiExplanation: 'Objective Analysis: Multiple financing requests or endorsements have been recorded for this receivable. DRUNIX multi-org endorsement protocol strictly prevents double-pledging. Auditor should confirm if earlier financing was repaid or if this represents an accidental re-request.',
        investigationNotes: [],
        auditTrail: [
          {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            actorId: 'DRUNIX-Sentinel-Engine',
            actorOrg: 'NetworkAuditor',
            action: 'ALERT_GENERATED',
            newStatus: 'OPEN',
          },
        ],
      };
    }

    return null;
  }

  /**
   * Rule 3: Statistical Outlier in Invoice Amount
   */
  public static checkUnusualInvoiceAmount(current: Invoice, supplierHistory: Invoice[]): FraudAlert | null {
    const priorInvoices = supplierHistory.filter((i) => i.id !== current.id);
    if (priorInvoices.length < this.config.minHistoricalRecordsForStats) {
      // Insufficient historical records for statistical deviation; skip to avoid false alarms
      return null;
    }

    const amounts = priorInvoices.map((i) => i.amount);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    const multiple = current.amount / mean;
    const zScore = stdDev > 0 ? (current.amount - mean) / stdDev : 0;

    if (zScore >= this.config.amountZScoreThreshold || multiple >= this.config.amountMultipleThreshold) {
      const dedupeKey = `UNUSUAL_AMT_${current.id}`;
      if (this.deduplicationCache.has(dedupeKey)) return null;
      this.deduplicationCache.add(dedupeKey);

      const alertId = `ALT-2026-${String(this.alerts.size + 1).padStart(3, '0')}`;
      return {
        id: alertId,
        anomalyType: 'UNUSUAL_INVOICE_AMOUNT',
        severity: zScore > 3.5 ? 'HIGH' : 'MEDIUM',
        status: 'OPEN',
        invoiceId: current.id,
        invoiceNumber: current.invoiceNumber,
        supplierId: current.supplierId,
        supplierOrg: current.supplierOrg,
        buyerId: current.buyerId,
        buyerOrg: current.buyerOrg,
        amount: current.amount,
        detectedAt: new Date().toISOString(),
        headline: `Requires Review: Invoice amount is ${multiple.toFixed(1)}x historical average (Z-score: ${zScore.toFixed(2)})`,
        evidence: {
          description: `Invoice value ₹${current.amount.toLocaleString('en-IN')} substantially exceeds historical average (₹${Math.round(mean).toLocaleString('en-IN')}) for ${current.supplierOrg}.`,
          metrics: {
            currentAmount: current.amount,
            historicalMean: Math.round(mean),
            zScore: Number(zScore.toFixed(2)),
            multipleOfMean: Number(multiple.toFixed(2)),
            sampleSize: priorInvoices.length,
          },
          expectedValue: `₹${Math.round(mean).toLocaleString('en-IN')} (historical baseline)`,
          observedValue: `₹${current.amount.toLocaleString('en-IN')}`,
          drunixProof: {
            blockNumber: current.blockNumber,
            txId: current.txId,
            signatureHash: `sha256:drunix-${current.txId.slice(-8)}`,
          },
        },
        geminiExplanation: `Objective Analysis: The invoice amount of ₹${current.amount.toLocaleString('en-IN')} is statistically elevated (${multiple.toFixed(1)}x baseline) relative to ${current.supplierOrg}'s past transactions. This may correspond to a major quarterly order delivery. Recommended action: Corroborate matching Purchase Order and Delivery Challan on DRUNIX.`,
        investigationNotes: [],
        auditTrail: [
          {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            actorId: 'DRUNIX-Sentinel-Engine',
            actorOrg: 'NetworkAuditor',
            action: 'ALERT_GENERATED',
            newStatus: 'OPEN',
          },
        ],
      };
    }

    return null;
  }

  /**
   * Rule 4: Transaction Frequency / Velocity Surge
   */
  public static checkTransactionVelocity(current: Invoice, supplierHistory: Invoice[]): FraudAlert | null {
    const currentTime = new Date(current.createdAt).getTime();
    const windowMs = this.config.velocityWindowMinutes * 60 * 1000;

    const recentInvoices = supplierHistory.filter((i) => {
      const t = new Date(i.createdAt).getTime();
      return Math.abs(currentTime - t) <= windowMs;
    });

    if (recentInvoices.length >= this.config.velocityMaxInvoices) {
      const dedupeKey = `VELOCITY_${current.supplierId}_${Math.floor(currentTime / windowMs)}`;
      if (this.deduplicationCache.has(dedupeKey)) return null;
      this.deduplicationCache.add(dedupeKey);

      const alertId = `ALT-2026-${String(this.alerts.size + 1).padStart(3, '0')}`;
      return {
        id: alertId,
        anomalyType: 'UNUSUAL_TRANSACTION_FREQUENCY',
        severity: 'MEDIUM',
        status: 'OPEN',
        invoiceId: current.id,
        invoiceNumber: current.invoiceNumber,
        supplierId: current.supplierId,
        supplierOrg: current.supplierOrg,
        buyerId: current.buyerId,
        buyerOrg: current.buyerOrg,
        amount: current.amount,
        detectedAt: new Date().toISOString(),
        headline: `Requires Review: Velocity surge — ${recentInvoices.length} invoices registered within ${this.config.velocityWindowMinutes} minutes`,
        evidence: {
          description: `Supplier ${current.supplierOrg} submitted ${recentInvoices.length} trade receivables within a rapid window, exceeding threshold of ${this.config.velocityMaxInvoices}.`,
          metrics: {
            invoicesInWindow: recentInvoices.length,
            windowMinutes: this.config.velocityWindowMinutes,
            aggregateVolume: recentInvoices.reduce((s, i) => s + i.amount, 0),
          },
          drunixProof: {
            blockNumber: current.blockNumber,
            txId: current.txId,
            signatureHash: `sha256:drunix-${current.txId.slice(-8)}`,
          },
        },
        geminiExplanation: `Objective Analysis: A clustering of ${recentInvoices.length} invoices occurred within a short duration. While automated ERP batch uploads can cause velocity spikes, the auditor should verify whether these represent individual delivery dispatches or duplicate batch retries.`,
        investigationNotes: [],
        auditTrail: [
          {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            actorId: 'DRUNIX-Sentinel-Engine',
            actorOrg: 'NetworkAuditor',
            action: 'ALERT_GENERATED',
            newStatus: 'OPEN',
          },
        ],
      };
    }

    return null;
  }

  /**
   * Rule 5: Check Temporal & History Inconsistencies
   */
  public static checkInvoiceHistoryInconsistency(current: Invoice): FraudAlert | null {
    // Check if due date is prior to issue date
    const issueTime = new Date(current.issueDate).getTime();
    const dueTime = new Date(current.dueDate).getTime();

    if (dueTime < issueTime) {
      const dedupeKey = `DUE_DATE_INCONSISTENCY_${current.id}`;
      if (this.deduplicationCache.has(dedupeKey)) return null;
      this.deduplicationCache.add(dedupeKey);

      const alertId = `ALT-2026-${String(this.alerts.size + 1).padStart(3, '0')}`;
      return {
        id: alertId,
        anomalyType: 'INVOICE_HISTORY_INCONSISTENCY',
        severity: 'MEDIUM',
        status: 'OPEN',
        invoiceId: current.id,
        invoiceNumber: current.invoiceNumber,
        supplierId: current.supplierId,
        supplierOrg: current.supplierOrg,
        buyerId: current.buyerId,
        buyerOrg: current.buyerOrg,
        amount: current.amount,
        detectedAt: new Date().toISOString(),
        headline: 'Requires Review: Due date is prior to invoice issue date',
        evidence: {
          description: `Invoice specifies issue date ${current.issueDate.slice(0, 10)} but due date ${current.dueDate.slice(0, 10)}.`,
          expectedValue: 'Due Date >= Issue Date',
          observedValue: `Due Date (${current.dueDate.slice(0, 10)}) < Issue Date (${current.issueDate.slice(0, 10)})`,
          drunixProof: {
            blockNumber: current.blockNumber,
            txId: current.txId,
            signatureHash: `sha256:drunix-${current.txId.slice(-8)}`,
          },
        },
        geminiExplanation: 'Objective Analysis: The commercial payment maturity date is logged prior to the issuance date. This is typically a date transposition error in supplier billing software rather than an adverse event. Recommended action: Request corrected date amendment from supplier.',
        investigationNotes: [],
        auditTrail: [
          {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            actorId: 'DRUNIX-Sentinel-Engine',
            actorOrg: 'NetworkAuditor',
            action: 'ALERT_GENERATED',
            newStatus: 'OPEN',
          },
        ],
      };
    }

    return null;
  }

  /**
   * Get all alerts with role-based filtering
   */
  public static getAllAlerts(userRole: string, userOrg: string, userId: string): FraudAlert[] {
    this.initialize();
    const all = Array.from(this.alerts.values()).sort(
      (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
    );

    // Auditor & Financier can see all alerts
    if (userRole === 'EXPLORER' || userRole === 'FINANCIER') {
      return all;
    }

    // Supplier only sees alerts involving their organization
    if (userRole === 'SUPPLIER') {
      return all.filter(
        (a) =>
          a.supplierOrg.toLowerCase().includes(userOrg.toLowerCase()) ||
          userOrg.toLowerCase().includes(a.supplierOrg.toLowerCase()) ||
          a.supplierId === userId
      );
    }

    // Buyer only sees alerts involving their organization
    if (userRole === 'BUYER') {
      return all.filter(
        (a) =>
          a.buyerOrg.toLowerCase().includes(userOrg.toLowerCase()) ||
          userOrg.toLowerCase().includes(a.buyerOrg.toLowerCase()) ||
          a.buyerId === userId
      );
    }

    return all;
  }

  /**
   * Get alert by ID with authorization check
   */
  public static getAlertById(id: string, userRole: string, userOrg: string, userId: string): FraudAlert | null {
    this.initialize();
    const alert = this.alerts.get(id);
    if (!alert) return null;

    if (userRole === 'EXPLORER' || userRole === 'FINANCIER') return alert;
    if (userRole === 'SUPPLIER' && (alert.supplierOrg.toLowerCase().includes(userOrg.toLowerCase()) || alert.supplierId === userId)) return alert;
    if (userRole === 'BUYER' && (alert.buyerOrg.toLowerCase().includes(userOrg.toLowerCase()) || alert.buyerId === userId)) return alert;

    return null;
  }

  /**
   * Add investigation note to case
   */
  public static addInvestigationNote(
    alertId: string,
    author: string,
    role: string,
    note: string
  ): FraudAlert {
    const alert = this.alerts.get(alertId);
    if (!alert) throw new Error(`Alert '${alertId}' not found`);

    const newNote: InvestigationNote = {
      id: uuidv4(),
      author,
      role,
      timestamp: new Date().toISOString(),
      note: note.trim(),
    };

    alert.investigationNotes.push(newNote);

    alert.auditTrail.push({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      actorId: author,
      actorOrg: role,
      action: 'NOTE_ADDED',
      notes: note.trim().slice(0, 100),
    });

    this.alerts.set(alertId, alert);
    return alert;
  }

  /**
   * Update investigation case status
   */
  public static updateAlertStatus(
    alertId: string,
    newStatus: InvestigationStatus,
    actorId: string,
    actorOrg: string,
    notes?: string
  ): FraudAlert {
    const alert = this.alerts.get(alertId);
    if (!alert) throw new Error(`Alert '${alertId}' not found`);

    const prev = alert.status;
    alert.status = newStatus;

    alert.auditTrail.push({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      actorId,
      actorOrg,
      action: 'STATUS_UPDATED',
      previousStatus: prev,
      newStatus,
      notes,
    });

    this.alerts.set(alertId, alert);
    return alert;
  }

  /**
   * Aggregate metrics for summary cards
   */
  public static getMetrics(userRole: string, userOrg: string, userId: string) {
    const alerts = this.getAllAlerts(userRole, userOrg, userId);

    const totalAlerts = alerts.length;
    const highSeverityCount = alerts.filter((a) => a.severity === 'HIGH' || a.severity === 'CRITICAL').length;
    const openCases = alerts.filter((a) => a.status === 'OPEN').length;
    const underReviewCases = alerts.filter((a) => a.status === 'UNDER_REVIEW').length;
    const resolvedCases = alerts.filter((a) => a.status === 'RESOLVED').length;
    const falsePositives = alerts.filter((a) => a.status === 'FALSE_POSITIVE').length;

    return {
      totalAlerts,
      highSeverityCount,
      openCases,
      underReviewCases,
      resolvedCases,
      falsePositives,
      severityBreakdown: {
        critical: alerts.filter((a) => a.severity === 'CRITICAL').length,
        high: alerts.filter((a) => a.severity === 'HIGH').length,
        medium: alerts.filter((a) => a.severity === 'MEDIUM').length,
        low: alerts.filter((a) => a.severity === 'LOW').length,
      },
      statusBreakdown: {
        open: openCases,
        underReview: underReviewCases,
        resolved: resolvedCases,
        falsePositive: falsePositives,
      },
    };
  }
}
