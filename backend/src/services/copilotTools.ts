import { z } from 'zod';
import { drunixGateway, Invoice } from './drunixGateway';
import { SAMPLE_PURCHASE_ORDERS } from './documentIntelligenceService';
import { InvoiceRiskEngineService, InvoiceRiskAssessment } from './invoiceRiskEngineService';

export interface UserPersonaContext {
  role: 'SUPPLIER' | 'BUYER' | 'FINANCIER' | 'EXPLORER';
  userId: string;
  orgName: string;
  orgMsp: string;
}

export type EvidenceSource =
  | 'DRUNIX ledger data'
  | 'InvoiceNet application data'
  | 'AI-generated explanation'
  | 'Forecast or estimate';

export interface CopilotEvidenceItem {
  type: 'INVOICE' | 'BLOCKCHAIN_TX' | 'RISK_ALERT' | 'NETWORK_METRIC' | 'PURCHASE_ORDER' | 'LIFECYCLE';
  title: string;
  source: EvidenceSource;
  sourceTimestamp?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  amount?: number;
  currency?: string;
  status?: string;
  txId?: string;
  blockNumber?: number;
  documentHash?: string;
  riskFindings?: string;
  poMatchStatus?: string;
  details?: string;
}

// ============================================================================
// ZOD SCHEMAS FOR SECURE TOOL ARGUMENT VALIDATION
// ============================================================================
export const GetInvoiceDetailsSchema = z.object({
  invoiceIdOrNumber: z.string().min(1, 'Invoice ID or number is required'),
});

export const ListInvoicesSchema = z.object({
  status: z
    .enum(['ALL', 'CREATED', 'ACCEPTED', 'FINANCING_REQUESTED', 'FINANCED', 'SETTLED', 'REJECTED', 'CANCELLED'])
    .optional(),
  limit: z.number().int().positive().max(50).optional(),
});

export const GetInvoiceRiskAssessmentSchema = z.object({
  invoiceIdOrNumber: z.string().min(1, 'Invoice ID or number is required'),
});

export const GetPurchaseOrderMatchSchema = z.object({
  invoiceIdOrNumber: z.string().min(1, 'Invoice ID or number is required'),
  poNumber: z.string().optional(),
});

export const GetInvoiceLifecycleSchema = z.object({
  invoiceIdOrNumber: z.string().min(1, 'Invoice ID or number is required'),
});

export const GetPaymentStatusSchema = z.object({
  invoiceIdOrNumber: z.string().min(1, 'Invoice ID or number is required'),
});

export const GetLedgerProofSchema = z.object({
  invoiceIdOrNumber: z.string().min(1, 'Invoice ID or number is required'),
});

export const GetFinancingRequestsSchema = z.object({
  status: z.enum(['ALL', 'ACCEPTED', 'FINANCING_REQUESTED', 'FINANCED']).optional(),
  limit: z.number().int().positive().max(50).optional(),
});

export const GetReceivablesSummarySchema = z.object({
  periodDays: z.number().int().positive().max(365).optional(),
});

// ============================================================================
// COPILOT TOOLS SERVICE IMPLEMENTATION
// ============================================================================
export class CopilotTools {
  /**
   * Check if a persona is authorized to view a specific invoice
   */
  public static isAuthorizedForInvoice(invoice: Invoice, persona: UserPersonaContext): boolean {
    if (persona.role === 'EXPLORER') {
      return true; // Consortium auditor can inspect all ledger records
    }

    if (persona.role === 'SUPPLIER') {
      // Must match supplier ID or organization name
      return (
        invoice.supplierId.toLowerCase() === persona.userId.toLowerCase() ||
        invoice.supplierOrg.toLowerCase().includes(persona.orgName.toLowerCase()) ||
        persona.orgName.toLowerCase().includes(invoice.supplierOrg.toLowerCase())
      );
    }

    if (persona.role === 'BUYER') {
      // Must match buyer ID or organization name
      return (
        invoice.buyerId.toLowerCase() === persona.userId.toLowerCase() ||
        invoice.buyerOrg.toLowerCase().includes(persona.orgName.toLowerCase()) ||
        persona.orgName.toLowerCase().includes(invoice.buyerOrg.toLowerCase())
      );
    }

    if (persona.role === 'FINANCIER') {
      // Financier can view invoices that are ACCEPTED, FINANCING_REQUESTED, FINANCED, or SETTLED.
      // Unendorsed draft invoices (CREATED) or REJECTED invoices from other parties are not accessible.
      if (invoice.status === 'CREATED' || invoice.status === 'REJECTED') {
        return invoice.financierId === persona.userId;
      }
      return true;
    }

    return false;
  }

  /**
   * Helper to locate an invoice by ID or invoice reference
   */
  private static async findInvoice(idOrNumber: string): Promise<Invoice | null> {
    const query = idOrNumber.trim().toLowerCase();
    const allInvoices = await drunixGateway.getAllInvoices();
    return (
      allInvoices.find(
        (inv) => inv.id.toLowerCase() === query || inv.invoiceNumber.toLowerCase() === query
      ) || null
    );
  }

  /**
   * Tool 1: listInvoices(filters)
   */
  public static async listInvoices(
    persona: UserPersonaContext,
    rawParams: unknown = {}
  ): Promise<{
    count: number;
    invoices: Array<{
      id: string;
      invoiceNumber: string;
      amount: number;
      currency: string;
      dueDate: string;
      status: string;
      supplierOrg: string;
      buyerOrg: string;
      discountRate?: number;
      txId: string;
      blockNumber: number;
    }>;
    evidence: CopilotEvidenceItem[];
  }> {
    const parsed = ListInvoicesSchema.safeParse(rawParams);
    const params = parsed.success ? parsed.data : {};

    const allInvoices = await drunixGateway.getAllInvoices();
    const authorized = allInvoices.filter((inv) => this.isAuthorizedForInvoice(inv, persona));

    let filtered = authorized;
    if (params.status && params.status !== 'ALL') {
      filtered = filtered.filter((i) => i.status.toUpperCase() === params.status?.toUpperCase());
    }

    const limit = params.limit || 15;
    const sliced = filtered.slice(0, limit);

    const evidence: CopilotEvidenceItem[] = sliced.map((inv) => ({
      type: 'INVOICE',
      title: `Invoice ${inv.invoiceNumber} (${inv.id})`,
      source: 'DRUNIX ledger data',
      sourceTimestamp: inv.createdAt,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      amount: inv.amount,
      currency: inv.currency,
      status: inv.status,
      txId: inv.txId,
      blockNumber: inv.blockNumber,
      details: `${inv.supplierOrg} → ${inv.buyerOrg} | Due: ${inv.dueDate.slice(0, 10)}`,
    }));

    return {
      count: filtered.length,
      invoices: sliced.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amount: inv.amount,
        currency: inv.currency,
        dueDate: inv.dueDate,
        status: inv.status,
        supplierOrg: inv.supplierOrg,
        buyerOrg: inv.buyerOrg,
        discountRate: inv.discountRate,
        txId: inv.txId,
        blockNumber: inv.blockNumber,
      })),
      evidence,
    };
  }

  // Alias for backward compatibility
  public static async getAuthorizedInvoices(persona: UserPersonaContext, params: any = {}) {
    return this.listInvoices(persona, params);
  }

  /**
   * Tool 2: getInvoiceDetails(invoiceId)
   */
  public static async getInvoiceDetails(
    persona: UserPersonaContext,
    rawParams: unknown
  ): Promise<{
    found: boolean;
    authorized: boolean;
    invoice?: Invoice;
    error?: string;
    evidence?: CopilotEvidenceItem[];
  }> {
    const parsed = GetInvoiceDetailsSchema.safeParse(rawParams);
    if (!parsed.success) {
      return {
        found: false,
        authorized: false,
        error: `Invalid tool arguments: ${parsed.error.issues.map((e: any) => e.message).join(', ')}`,
      };
    }

    const invoice = await this.findInvoice(parsed.data.invoiceIdOrNumber);

    if (!invoice) {
      return {
        found: false,
        authorized: false,
        error: `Invoice '${parsed.data.invoiceIdOrNumber}' was not found on the DRUNIX distributed ledger.`,
      };
    }

    const isAuth = this.isAuthorizedForInvoice(invoice, persona);
    if (!isAuth) {
      return {
        found: true,
        authorized: false,
        error: `ACCESS DENIED: Role '${persona.role}' (${persona.orgName}) is not authorized to access invoice '${parsed.data.invoiceIdOrNumber}'. On DRUNIX, data isolation restricts invoice access to authorized counter-parties and consortium auditors.`,
      };
    }

    const evidence: CopilotEvidenceItem[] = [
      {
        type: 'INVOICE',
        title: `Invoice ${invoice.invoiceNumber} (${invoice.id})`,
        source: 'DRUNIX ledger data',
        sourceTimestamp: invoice.updatedAt || invoice.createdAt,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        currency: invoice.currency,
        status: invoice.status,
        txId: invoice.txId,
        blockNumber: invoice.blockNumber,
        documentHash: invoice.documentHash,
        details: `${invoice.supplierOrg} → ${invoice.buyerOrg} | Status: ${invoice.status}`,
      },
    ];

    if (invoice.documentHash) {
      evidence.push({
        type: 'BLOCKCHAIN_TX',
        title: `Cryptographic Document Hash`,
        source: 'DRUNIX ledger data',
        sourceTimestamp: invoice.createdAt,
        invoiceId: invoice.id,
        txId: invoice.txId,
        blockNumber: invoice.blockNumber,
        documentHash: invoice.documentHash,
        details: `SHA-256 Document Fingerprint: ${invoice.documentHash.slice(0, 24)}...`,
      });
    }

    return {
      found: true,
      authorized: true,
      invoice,
      evidence,
    };
  }

  /**
   * Tool 3: getInvoiceRiskAssessment(invoiceId)
   */
  public static async getInvoiceRiskAssessment(
    persona: UserPersonaContext,
    rawParams: unknown
  ): Promise<{
    found: boolean;
    authorized: boolean;
    assessment?: InvoiceRiskAssessment;
    error?: string;
    evidence?: CopilotEvidenceItem[];
  }> {
    const parsed = GetInvoiceRiskAssessmentSchema.safeParse(rawParams);
    if (!parsed.success) {
      return {
        found: false,
        authorized: false,
        error: `Invalid tool arguments: ${parsed.error.issues.map((e: any) => e.message).join(', ')}`,
      };
    }

    const invoice = await this.findInvoice(parsed.data.invoiceIdOrNumber);
    if (!invoice) {
      return {
        found: false,
        authorized: false,
        error: `Invoice '${parsed.data.invoiceIdOrNumber}' was not found on the DRUNIX distributed ledger.`,
      };
    }

    if (!this.isAuthorizedForInvoice(invoice, persona)) {
      return {
        found: true,
        authorized: false,
        error: `ACCESS DENIED: Role '${persona.role}' (${persona.orgName}) is not authorized to access risk assessments for invoice '${invoice.id}'.`,
      };
    }

    try {
      const assessment = await InvoiceRiskEngineService.analyzeInvoiceRisk(invoice.id);
      const evidence: CopilotEvidenceItem[] = [
        {
          type: 'RISK_ALERT',
          title: `Risk Assessment: ${assessment.riskCategory} (${assessment.riskScore}/100)`,
          source: 'AI-generated explanation',
          sourceTimestamp: assessment.assessmentTimestamp,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          riskFindings: `Score: ${assessment.riskScore} (${assessment.riskCategory}). ${assessment.individualRiskFactors.length} risk factor(s) identified.`,
          details: assessment.explanation?.summary || assessment.scoreCalculationExplanation,
        },
      ];

      return {
        found: true,
        authorized: true,
        assessment,
        evidence,
      };
    } catch (err: any) {
      return {
        found: true,
        authorized: true,
        error: `Failed to compute risk assessment: ${err.message}`,
      };
    }
  }

  /**
   * Tool 4: getPurchaseOrderMatch(invoiceId)
   */
  public static async getPurchaseOrderMatch(
    persona: UserPersonaContext,
    rawParams: unknown
  ): Promise<{
    found: boolean;
    authorized: boolean;
    poMatch?: {
      poNumber: string;
      matched: boolean;
      invoiceAmount: number;
      poAmount?: number;
      variancePercent?: number;
      poDetails?: any;
    };
    error?: string;
    evidence?: CopilotEvidenceItem[];
  }> {
    const parsed = GetPurchaseOrderMatchSchema.safeParse(rawParams);
    if (!parsed.success) {
      return {
        found: false,
        authorized: false,
        error: `Invalid tool arguments: ${parsed.error.issues.map((e: any) => e.message).join(', ')}`,
      };
    }

    const invoice = await this.findInvoice(parsed.data.invoiceIdOrNumber);
    if (!invoice) {
      return {
        found: false,
        authorized: false,
        error: `Invoice '${parsed.data.invoiceIdOrNumber}' was not found on the DRUNIX distributed ledger.`,
      };
    }

    if (!this.isAuthorizedForInvoice(invoice, persona)) {
      return {
        found: true,
        authorized: false,
        error: `ACCESS DENIED: Role '${persona.role}' (${persona.orgName}) is not authorized to inspect purchase orders for invoice '${invoice.id}'.`,
      };
    }

    const poNumber = parsed.data.poNumber || invoice.poNumber;
    if (!poNumber) {
      return {
        found: true,
        authorized: true,
        poMatch: {
          poNumber: 'NONE',
          matched: false,
          invoiceAmount: invoice.amount,
        },
        evidence: [
          {
            type: 'PURCHASE_ORDER',
            title: 'No PO Linked',
            source: 'InvoiceNet application data',
            sourceTimestamp: invoice.createdAt,
            invoiceId: invoice.id,
            poMatchStatus: 'UNLINKED',
            details: 'This invoice does not reference an underlying ERP Purchase Order number.',
          },
        ],
      };
    }

    const cleanPo = poNumber.trim().toLowerCase();
    const matchedPo = SAMPLE_PURCHASE_ORDERS.find(
      (p: any) => p.poNumber.toLowerCase() === cleanPo
    );

    if (!matchedPo) {
      return {
        found: true,
        authorized: true,
        poMatch: {
          poNumber,
          matched: false,
          invoiceAmount: invoice.amount,
        },
        evidence: [
          {
            type: 'PURCHASE_ORDER',
            title: `Unverified PO: ${poNumber}`,
            source: 'InvoiceNet application data',
            sourceTimestamp: invoice.createdAt,
            invoiceId: invoice.id,
            poMatchStatus: 'NOT_FOUND_IN_ERP',
            details: `Purchase Order '${poNumber}' was not found in the verified corporate ERP order catalog.`,
          },
        ],
      };
    }

    const diff = Math.abs(invoice.amount - matchedPo.amount);
    const variancePercent = Number(((diff / matchedPo.amount) * 100).toFixed(1));
    const isMatched = variancePercent <= 5.0;

    return {
      found: true,
      authorized: true,
      poMatch: {
        poNumber: matchedPo.poNumber,
        matched: isMatched,
        invoiceAmount: invoice.amount,
        poAmount: matchedPo.amount,
        variancePercent,
        poDetails: matchedPo,
      },
      evidence: [
        {
          type: 'PURCHASE_ORDER',
          title: `PO Match: ${matchedPo.poNumber} (${isMatched ? 'MATCHED' : 'DISCREPANCY'})`,
          source: 'InvoiceNet application data',
          sourceTimestamp: invoice.createdAt,
          invoiceId: invoice.id,
          poMatchStatus: isMatched ? 'MATCHED' : `VARIANCE_${variancePercent}%`,
          details: isMatched
            ? `Invoice amount ₹${invoice.amount.toLocaleString('en-IN')} matches ERP PO ₹${matchedPo.amount.toLocaleString('en-IN')} within 5% tolerance.`
            : `Invoice amount ₹${invoice.amount.toLocaleString('en-IN')} deviates from ERP PO ₹${matchedPo.amount.toLocaleString('en-IN')} by ${variancePercent}%.`,
        },
      ],
    };
  }

  /**
   * Tool 5: getInvoiceLifecycle(invoiceId)
   */
  public static async getInvoiceLifecycle(
    persona: UserPersonaContext,
    rawParams: unknown
  ): Promise<{
    found: boolean;
    authorized: boolean;
    lifecycle?: {
      invoiceId: string;
      invoiceNumber: string;
      currentStatus: string;
      createdBlock: number;
      createdTxId: string;
      endorsementHistory: Invoice['endorsementHistory'];
    };
    error?: string;
    evidence?: CopilotEvidenceItem[];
  }> {
    const parsed = GetInvoiceLifecycleSchema.safeParse(rawParams);
    if (!parsed.success) {
      return {
        found: false,
        authorized: false,
        error: `Invalid tool arguments: ${parsed.error.issues.map((e: any) => e.message).join(', ')}`,
      };
    }

    const invoice = await this.findInvoice(parsed.data.invoiceIdOrNumber);
    if (!invoice) {
      return {
        found: false,
        authorized: false,
        error: `Invoice '${parsed.data.invoiceIdOrNumber}' was not found on the DRUNIX distributed ledger.`,
      };
    }

    if (!this.isAuthorizedForInvoice(invoice, persona)) {
      return {
        found: true,
        authorized: false,
        error: `ACCESS DENIED: Role '${persona.role}' (${persona.orgName}) is not authorized to inspect lifecycle history for invoice '${invoice.id}'.`,
      };
    }

    const evidence: CopilotEvidenceItem[] = [
      {
        type: 'LIFECYCLE',
        title: `Lifecycle: ${invoice.status} (${invoice.endorsementHistory.length} endorsements)`,
        source: 'DRUNIX ledger data',
        sourceTimestamp: invoice.updatedAt || invoice.createdAt,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        txId: invoice.txId,
        blockNumber: invoice.blockNumber,
        details: `Endorsement chain: ${invoice.endorsementHistory.map((e) => `${e.orgMsp}: ${e.action}`).join(' → ')}`,
      },
    ];

    return {
      found: true,
      authorized: true,
      lifecycle: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        currentStatus: invoice.status,
        createdBlock: invoice.blockNumber,
        createdTxId: invoice.txId,
        endorsementHistory: invoice.endorsementHistory,
      },
      evidence,
    };
  }

  /**
   * Tool 6: getPaymentStatus(invoiceId)
   */
  public static async getPaymentStatus(
    persona: UserPersonaContext,
    rawParams: unknown
  ): Promise<{
    found: boolean;
    authorized: boolean;
    paymentStatus?: {
      invoiceId: string;
      invoiceNumber: string;
      amount: number;
      currency: string;
      dueDate: string;
      status: string;
      isOverdue: boolean;
      daysRemainingOrOverdue: number;
      settlementDate?: string;
      paymentReference?: string;
    };
    error?: string;
    evidence?: CopilotEvidenceItem[];
  }> {
    const parsed = GetPaymentStatusSchema.safeParse(rawParams);
    if (!parsed.success) {
      return {
        found: false,
        authorized: false,
        error: `Invalid tool arguments: ${parsed.error.issues.map((e: any) => e.message).join(', ')}`,
      };
    }

    const invoice = await this.findInvoice(parsed.data.invoiceIdOrNumber);
    if (!invoice) {
      return {
        found: false,
        authorized: false,
        error: `Invoice '${parsed.data.invoiceIdOrNumber}' was not found on the DRUNIX distributed ledger.`,
      };
    }

    if (!this.isAuthorizedForInvoice(invoice, persona)) {
      return {
        found: true,
        authorized: false,
        error: `ACCESS DENIED: Role '${persona.role}' (${persona.orgName}) is not authorized to inspect payment status for invoice '${invoice.id}'.`,
      };
    }

    const now = Date.now();
    const dueTime = new Date(invoice.dueDate).getTime();
    const isPastDue = dueTime < now && invoice.status !== 'SETTLED';
    const diffDays = Math.round((dueTime - now) / (1000 * 60 * 60 * 24));

    const evidence: CopilotEvidenceItem[] = [
      {
        type: 'INVOICE',
        title: `Payment Status: ${invoice.status}`,
        source: 'DRUNIX ledger data',
        sourceTimestamp: invoice.updatedAt || invoice.createdAt,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        currency: invoice.currency,
        status: invoice.status,
        details: isPastDue
          ? `OVERDUE by ${Math.abs(diffDays)} days. Outstanding amount: ₹${invoice.amount.toLocaleString('en-IN')}`
          : invoice.status === 'SETTLED'
          ? `Settled on ${invoice.settlementDate || 'DRUNIX'} (Ref: ${invoice.paymentReference || 'N/A'})`
          : `Due in ${diffDays} days (${invoice.dueDate.slice(0, 10)})`,
      },
    ];

    return {
      found: true,
      authorized: true,
      paymentStatus: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        currency: invoice.currency,
        dueDate: invoice.dueDate,
        status: invoice.status,
        isOverdue: isPastDue,
        daysRemainingOrOverdue: diffDays,
        settlementDate: invoice.settlementDate,
        paymentReference: invoice.paymentReference,
      },
      evidence,
    };
  }

  /**
   * Tool 7: getLedgerProof(invoiceId)
   */
  public static async getLedgerProof(
    persona: UserPersonaContext,
    rawParams: unknown
  ): Promise<{
    found: boolean;
    authorized: boolean;
    proof?: {
      invoiceId: string;
      invoiceNumber: string;
      blockNumber: number;
      txId: string;
      status: string;
      documentHash?: string;
      endorsementsCount: number;
      endorsementHistory: Invoice['endorsementHistory'];
    };
    error?: string;
    evidence?: CopilotEvidenceItem[];
  }> {
    const parsed = GetLedgerProofSchema.safeParse(rawParams);
    if (!parsed.success) {
      return {
        found: false,
        authorized: false,
        error: `Invalid tool arguments: ${parsed.error.issues.map((e: any) => e.message).join(', ')}`,
      };
    }

    const invoice = await this.findInvoice(parsed.data.invoiceIdOrNumber);
    if (!invoice) {
      return {
        found: false,
        authorized: false,
        error: `Invoice '${parsed.data.invoiceIdOrNumber}' was not found on the DRUNIX distributed ledger.`,
      };
    }

    if (!this.isAuthorizedForInvoice(invoice, persona)) {
      return {
        found: true,
        authorized: false,
        error: `ACCESS DENIED: Role '${persona.role}' (${persona.orgName}) is not authorized to inspect cryptographic proof for invoice '${invoice.id}'.`,
      };
    }

    const evidence: CopilotEvidenceItem[] = [
      {
        type: 'BLOCKCHAIN_TX',
        title: `DRUNIX Block #${invoice.blockNumber} Proof`,
        source: 'DRUNIX ledger data',
        sourceTimestamp: invoice.createdAt,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        txId: invoice.txId,
        blockNumber: invoice.blockNumber,
        documentHash: invoice.documentHash,
        details: `Cryptographic consensus verified with ${invoice.endorsementHistory.length} digital signature(s).`,
      },
    ];

    return {
      found: true,
      authorized: true,
      proof: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        blockNumber: invoice.blockNumber,
        txId: invoice.txId,
        status: invoice.status,
        documentHash: invoice.documentHash,
        endorsementsCount: invoice.endorsementHistory.length,
        endorsementHistory: invoice.endorsementHistory,
      },
      evidence,
    };
  }

  // Alias for backward compatibility with existing tests
  public static async getBlockchainProof(persona: UserPersonaContext, params: any) {
    return this.getLedgerProof(persona, params);
  }

  /**
   * Tool 8: getFinancingRequests(filters)
   */
  public static async getFinancingRequests(
    persona: UserPersonaContext,
    rawParams: unknown = {}
  ): Promise<{
    count: number;
    requests: Array<{
      id: string;
      invoiceNumber: string;
      amount: number;
      supplierOrg: string;
      buyerOrg: string;
      dueDate: string;
      status: string;
      discountRate?: number;
      financingEligible: boolean;
      reviewRequired: boolean;
    }>;
    benchmarkAPR: {
      drunixAPR: number;
      traditionalAPR: number;
    };
    evidence: CopilotEvidenceItem[];
  }> {
    const parsed = GetFinancingRequestsSchema.safeParse(rawParams);
    const params = parsed.success ? parsed.data : {};

    const allInvoices = await drunixGateway.getAllInvoices();
    const authorized = allInvoices.filter((inv) => this.isAuthorizedForInvoice(inv, persona));

    // Financing requests are invoices that are ACCEPTED, FINANCING_REQUESTED, or FINANCED
    let requests = authorized.filter((i) =>
      ['ACCEPTED', 'FINANCING_REQUESTED', 'FINANCED'].includes(i.status)
    );

    if (params.status && params.status !== 'ALL') {
      requests = requests.filter((r) => r.status.toUpperCase() === params.status?.toUpperCase());
    }

    const limit = params.limit || 20;
    const sliced = requests.slice(0, limit);
    const analytics = drunixGateway.getAnalytics();

    const evidence: CopilotEvidenceItem[] = sliced.map((inv) => ({
      type: 'INVOICE',
      title: `Financing Request: ${inv.invoiceNumber}`,
      source: 'DRUNIX ledger data',
      sourceTimestamp: inv.updatedAt || inv.createdAt,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      amount: inv.amount,
      status: inv.status,
      details: `Status: ${inv.status} | Eligible for DRUNIX factoring @ ${analytics.averageDiscountRateAPR}% APR.`,
    }));

    return {
      count: requests.length,
      requests: sliced.map((r) => ({
        id: r.id,
        invoiceNumber: r.invoiceNumber,
        amount: r.amount,
        supplierOrg: r.supplierOrg,
        buyerOrg: r.buyerOrg,
        dueDate: r.dueDate,
        status: r.status,
        discountRate: r.discountRate || analytics.averageDiscountRateAPR,
        financingEligible: r.status === 'ACCEPTED' || r.status === 'FINANCING_REQUESTED',
        reviewRequired: r.status === 'FINANCING_REQUESTED' || r.amount > 1000000,
      })),
      benchmarkAPR: {
        drunixAPR: analytics.averageDiscountRateAPR,
        traditionalAPR: analytics.traditionalFactoringRateAPR,
      },
      evidence,
    };
  }

  /**
   * Tool 9: getReceivablesSummary(filters)
   */
  public static async getReceivablesSummary(
    persona: UserPersonaContext,
    rawParams: unknown = {}
  ): Promise<{
    role: string;
    organization: string;
    totalCount: number;
    totalOutstandingINR: number;
    overdueCount: number;
    maturingCount: number;
    avgDiscountRateAPR: number;
    traditionalFactoringAPR: number;
    interestSavingsPercentage: number;
    invoicesAtRisk: Array<{
      id: string;
      invoiceNumber: string;
      amount: number;
      dueDate: string;
      daysRemaining: number;
      status: string;
      riskFactor: string;
    }>;
    evidence: CopilotEvidenceItem[];
  }> {
    const allInvoices = await drunixGateway.getAllInvoices();
    const authorized = allInvoices.filter((inv) => this.isAuthorizedForInvoice(inv, persona));

    const now = Date.now();
    let overdueCount = 0;
    let maturingCount = 0;
    let totalOutstandingINR = 0;
    const invoicesAtRisk: any[] = [];
    const evidence: CopilotEvidenceItem[] = [];

    for (const inv of authorized) {
      if (inv.status !== 'SETTLED' && inv.status !== 'CANCELLED') {
        totalOutstandingINR += inv.amount;
        const dueTime = new Date(inv.dueDate).getTime();
        const diffDays = Math.ceil((dueTime - now) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          overdueCount += 1;
          invoicesAtRisk.push({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            amount: inv.amount,
            dueDate: inv.dueDate,
            daysRemaining: diffDays,
            status: inv.status,
            riskFactor: `Overdue by ${Math.abs(diffDays)} days`,
          });
          evidence.push({
            type: 'RISK_ALERT',
            title: `OVERDUE: Invoice ${inv.invoiceNumber}`,
            source: 'DRUNIX ledger data',
            sourceTimestamp: inv.createdAt,
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            amount: inv.amount,
            status: inv.status,
            details: `Overdue by ${Math.abs(diffDays)} days. Outstanding: ₹${inv.amount.toLocaleString('en-IN')}`,
          });
        } else if (diffDays <= 15) {
          maturingCount += 1;
          invoicesAtRisk.push({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            amount: inv.amount,
            dueDate: inv.dueDate,
            daysRemaining: diffDays,
            status: inv.status,
            riskFactor: `Approaching maturity (${diffDays} days left)`,
          });
        }
      }
    }

    const analytics = drunixGateway.getAnalytics();

    return {
      role: persona.role,
      organization: persona.orgName,
      totalCount: authorized.length,
      totalOutstandingINR,
      overdueCount,
      maturingCount,
      avgDiscountRateAPR: analytics.averageDiscountRateAPR,
      traditionalFactoringAPR: analytics.traditionalFactoringRateAPR,
      interestSavingsPercentage: Number(analytics.interestSavingsPercentage),
      invoicesAtRisk,
      evidence,
    };
  }

  // Alias for backward compatibility
  public static async getRiskAndLiquidityAnalysis(persona: UserPersonaContext, params: any = {}) {
    const summary = await this.getReceivablesSummary(persona, params);
    return {
      summary: `Analyzed ${summary.totalCount} authorized receivables on DRUNIX. ${summary.overdueCount} invoices are currently overdue, and ${summary.maturingCount} are maturing within 15 days.`,
      metrics: {
        overdueCount: summary.overdueCount,
        approachingMaturityCount: summary.maturingCount,
        totalOutstandingINR: summary.totalOutstandingINR,
        avgDiscountRateAPR: summary.avgDiscountRateAPR,
        traditionalFactoringAPR: summary.traditionalFactoringAPR,
        interestSavingsPercentage: summary.interestSavingsPercentage,
      },
      invoicesAtRisk: summary.invoicesAtRisk,
      evidence: summary.evidence,
    };
  }

  /**
   * Tool 10: getNetworkMetrics()
   */
  public static async getNetworkMetrics(): Promise<{
    network: string;
    channel: string;
    currentBlockHeight: number;
    totalInvoicesOnLedger: number;
    connectedOrgs: Array<{ name: string; role: string; status: string }>;
    pricingBenchmark: {
      traditionalAPR: number;
      drunixAPR: number;
      fundingTurnaroundHours: number;
      traditionalTurnaroundDays: number;
    };
    evidence: CopilotEvidenceItem[];
  }> {
    const status = drunixGateway.getNetworkStatus();
    const analytics = drunixGateway.getAnalytics();

    const evidence: CopilotEvidenceItem[] = [
      {
        type: 'NETWORK_METRIC',
        title: `DRUNIX Block Height #${status.currentBlockHeight}`,
        source: 'DRUNIX ledger data',
        sourceTimestamp: new Date().toISOString(),
        blockNumber: status.currentBlockHeight,
        details: `Raft Consensus Active | 3 Node Clusters Online (Supplier, Buyer, Financier)`,
      },
    ];

    return {
      network: status.network,
      channel: status.channel,
      currentBlockHeight: status.currentBlockHeight,
      totalInvoicesOnLedger: status.totalInvoicesOnLedger,
      connectedOrgs: status.connectedOrganizations,
      pricingBenchmark: {
        traditionalAPR: analytics.traditionalFactoringRateAPR,
        drunixAPR: analytics.averageDiscountRateAPR,
        fundingTurnaroundHours: analytics.averageFundingTurnaroundHours,
        traditionalTurnaroundDays: analytics.traditionalTurnaroundDays,
      },
      evidence,
    };
  }

  /**
   * Tool 11: getPurchaseOrderDetails
   */
  public static async getPurchaseOrderDetails(params: { poNumber: string }) {
    const poList = SAMPLE_PURCHASE_ORDERS;
    const found = poList.find((p: any) => p.poNumber.toLowerCase() === params.poNumber.trim().toLowerCase());

    if (!found) {
      return {
        found: false,
        error: `Purchase Order '${params.poNumber}' was not found in the ERP purchase order registry.`,
      };
    }

    return {
      found: true,
      purchaseOrder: found,
    };
  }
}
