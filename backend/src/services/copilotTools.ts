import { drunixGateway, Invoice } from './drunixGateway';
import { SAMPLE_PURCHASE_ORDERS } from './documentIntelligenceService';

export interface UserPersonaContext {
  role: 'SUPPLIER' | 'BUYER' | 'FINANCIER' | 'EXPLORER';
  userId: string;
  orgName: string;
  orgMsp: string;
}

export interface CopilotEvidenceItem {
  type: 'INVOICE' | 'BLOCKCHAIN_TX' | 'RISK_ALERT' | 'NETWORK_METRIC';
  title: string;
  invoiceId?: string;
  invoiceNumber?: string;
  amount?: number;
  currency?: string;
  status?: string;
  txId?: string;
  blockNumber?: number;
  documentHash?: string;
  details?: string;
}

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
      // Unendorsed draft invoices (CREATED) are not accessible to financiers on DRUNIX.
      if (invoice.status === 'CREATED' || invoice.status === 'REJECTED') {
        // Only accessible if this financier was specifically assigned or financed it
        return invoice.financierId === persona.userId;
      }
      return true;
    }

    return false;
  }

  /**
   * Tool 1: Get Authorized Invoices
   */
  public static async getAuthorizedInvoices(
    persona: UserPersonaContext,
    params: { status?: string; limit?: number } = {}
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

  /**
   * Tool 2: Get Invoice Details by ID or Number
   */
  public static async getInvoiceDetails(
    persona: UserPersonaContext,
    params: { invoiceIdOrNumber: string }
  ): Promise<{
    found: boolean;
    authorized: boolean;
    invoice?: Invoice;
    error?: string;
    evidence?: CopilotEvidenceItem[];
  }> {
    const query = params.invoiceIdOrNumber.trim().toLowerCase();
    const allInvoices = await drunixGateway.getAllInvoices();

    const invoice = allInvoices.find(
      (inv) => inv.id.toLowerCase() === query || inv.invoiceNumber.toLowerCase() === query
    );

    if (!invoice) {
      return {
        found: false,
        authorized: false,
        error: `Invoice '${params.invoiceIdOrNumber}' was not found on the DRUNIX distributed ledger.`,
      };
    }

    const isAuth = this.isAuthorizedForInvoice(invoice, persona);
    if (!isAuth) {
      return {
        found: true,
        authorized: false,
        error: `ACCESS DENIED: Role '${persona.role}' (${persona.orgName}) is not authorized to access invoice '${params.invoiceIdOrNumber}'. On DRUNIX, data isolation restricts invoice access to authorized counter-parties and consortium auditors.`,
      };
    }

    const evidence: CopilotEvidenceItem[] = [
      {
        type: 'INVOICE',
        title: `Invoice ${invoice.invoiceNumber} (${invoice.id})`,
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
   * Tool 3: Get Blockchain Proof & Endorsements
   */
  public static async getBlockchainProof(
    persona: UserPersonaContext,
    params: { invoiceIdOrNumber: string }
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
    const details = await this.getInvoiceDetails(persona, params);
    if (!details.found || !details.authorized || !details.invoice) {
      return {
        found: details.found,
        authorized: details.authorized,
        error: details.error,
      };
    }

    const inv = details.invoice;
    const evidence: CopilotEvidenceItem[] = [
      {
        type: 'BLOCKCHAIN_TX',
        title: `DRUNIX Block #${inv.blockNumber} Proof`,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        txId: inv.txId,
        blockNumber: inv.blockNumber,
        documentHash: inv.documentHash,
        details: `Multi-party signatures verified: ${inv.endorsementHistory.length} endorsements`,
      },
    ];

    return {
      found: true,
      authorized: true,
      proof: {
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        blockNumber: inv.blockNumber,
        txId: inv.txId,
        status: inv.status,
        documentHash: inv.documentHash,
        endorsementsCount: inv.endorsementHistory.length,
        endorsementHistory: inv.endorsementHistory,
      },
      evidence,
    };
  }

  /**
   * Tool 4: Risk Analysis & Liquidity Assessment
   */
  public static async getRiskAndLiquidityAnalysis(
    persona: UserPersonaContext,
    params: { invoiceIdOrNumber?: string } = {}
  ): Promise<{
    summary: string;
    metrics: {
      overdueCount: number;
      approachingMaturityCount: number;
      totalOutstandingINR: number;
      avgDiscountRateAPR: number;
      traditionalFactoringAPR: number;
      interestSavingsPercentage: number;
    };
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

    const now = new Date().getTime();
    let overdueCount = 0;
    let approachingMaturityCount = 0;
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
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            amount: inv.amount,
            status: inv.status,
            details: `Overdue by ${Math.abs(diffDays)} days. Outstanding: ₹${inv.amount.toLocaleString('en-IN')}`,
          });
        } else if (diffDays <= 15) {
          approachingMaturityCount += 1;
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
      summary: `Analyzed ${authorized.length} authorized receivables on DRUNIX. ${overdueCount} invoices are currently overdue, and ${approachingMaturityCount} are maturing within 15 days.`,
      metrics: {
        overdueCount,
        approachingMaturityCount,
        totalOutstandingINR,
        avgDiscountRateAPR: analytics.averageDiscountRateAPR,
        traditionalFactoringAPR: analytics.traditionalFactoringRateAPR,
        interestSavingsPercentage: Number(analytics.interestSavingsPercentage),
      },
      invoicesAtRisk,
      evidence,
    };
  }

  /**
   * Tool 5: Get DRUNIX Network Metrics & Explorer State
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
   * Tool 6: Get Purchase Order Details
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
