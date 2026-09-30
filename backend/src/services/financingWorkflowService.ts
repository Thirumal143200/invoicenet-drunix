import { v4 as uuidv4 } from 'uuid';
import { inMemoryDb, isDatabasePostgres, query, DbFinancingRequest } from '../db';
import { drunixGateway } from './drunixGateway';
import { AuditNotificationService } from './auditNotificationService';

export class FinancingWorkflowService {
  /**
   * Submit a new financing request against an eligible invoice
   */
  public static async requestFinancing(params: {
    invoiceId: string;
    supplierOrgId: string;
    supplierUserId: string;
    requestedAmount?: number;
    requestedRate?: number;
    tenorDays?: number;
  }): Promise<DbFinancingRequest> {
    const invoice = await drunixGateway.getInvoiceById(params.invoiceId);
    if (!invoice) {
      throw new Error(`Invoice ${params.invoiceId} not found on ledger.`);
    }

    // 1. Prevent duplicate active financing requests
    for (const req of inMemoryDb.financingRequests.values()) {
      if (req.invoice_id === params.invoiceId && (req.financing_status === 'PENDING' || req.financing_status === 'APPROVED')) {
        throw new Error(`An active financing request (${req.id}) already exists for this invoice.`);
      }
    }

    // 2. Eligibility check: invoice must be accepted by buyer
    if (invoice.status !== 'ACCEPTED' && invoice.status !== 'CREATED' && invoice.status !== 'FINANCING_REQUESTED') {
      throw new Error(`Invoice status ${invoice.status} is not eligible for financing. Invoice must be accepted by buyer.`);
    }

    const requestedAmount = params.requestedAmount || invoice.amount;
    if (requestedAmount <= 0 || requestedAmount > invoice.amount) {
      throw new Error(`Requested amount ₹${requestedAmount} cannot exceed total invoice value ₹${invoice.amount}`);
    }

    const financingReq: DbFinancingRequest = {
      id: `FIN-REQ-${uuidv4().slice(0, 8).toUpperCase()}`,
      invoice_id: invoice.id,
      supplier_organization_id: params.supplierOrgId,
      requested_amount: requestedAmount,
      discount_rate_apr: params.requestedRate || 10.5,
      tenor_days: params.tenorDays || 45,
      financing_status: 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Update DRUNIX ledger state
    await drunixGateway.requestFinancing(invoice.id, params.supplierUserId, financingReq.discount_rate_apr || 10.5);

    // Save in database
    if (isDatabasePostgres()) {
      try {
        await query(
          `INSERT INTO financing_requests (id, invoice_id, supplier_organization_id, requested_amount, discount_rate_apr, tenor_days, financing_status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [financingReq.id, financingReq.invoice_id, financingReq.supplier_organization_id, financingReq.requested_amount, financingReq.discount_rate_apr, financingReq.tenor_days, financingReq.financing_status, financingReq.created_at, financingReq.updated_at]
        );
      } catch (err: any) {
        console.warn('Postgres financing request write failed, saved in memory:', err.message);
      }
    }

    inMemoryDb.financingRequests.set(financingReq.id, financingReq);

    // Audit Log & Notification
    await AuditNotificationService.logAudit({
      userId: params.supplierUserId,
      organizationId: params.supplierOrgId,
      action: 'FINANCING_REQUESTED',
      entityType: 'INVOICE',
      entityId: invoice.id,
      metadata: { financingRequestId: financingReq.id, requestedAmount, rate: financingReq.discount_rate_apr },
    });

    // Notify Financier organizations
    await AuditNotificationService.notify({
      title: 'New Financing Request Available',
      message: `Invoice ${invoice.invoiceNumber} for ₹${invoice.amount.toLocaleString('en-IN')} submitted for financing at ${financingReq.discount_rate_apr}% APR.`,
      notificationType: 'FINANCING_REQUESTED',
      link: `/invoices/${invoice.id}`,
    });

    return financingReq;
  }

  /**
   * Approve and finance an invoice (Financier action)
   */
  public static async approveFinancing(params: {
    requestId: string;
    financierUserId: string;
    financierOrgId: string;
    financierOrgName: string;
    offeredAmount?: number;
    discountRate?: number;
    decisionReason: string;
  }): Promise<{ request: DbFinancingRequest; invoice: any }> {
    let req = inMemoryDb.financingRequests.get(params.requestId);
    if (!req) {
      // Look up in PostgreSQL
      if (isDatabasePostgres()) {
        const res = await query('SELECT * FROM financing_requests WHERE id = $1', [params.requestId]);
        if (res && res.rows.length > 0) req = res.rows[0];
      }
    }

    if (!req) {
      throw new Error(`Financing request ${params.requestId} not found.`);
    }

    if (req.financing_status !== 'PENDING') {
      throw new Error(`Request cannot be approved because current status is ${req.financing_status}.`);
    }

    if (!params.decisionReason || params.decisionReason.trim().length < 5) {
      throw new Error('Mandatory underwriting decision reason must be provided by the authorized financier.');
    }

    const invoice = await drunixGateway.getInvoiceById(req.invoice_id);
    if (!invoice) {
      throw new Error(`Underlying invoice ${req.invoice_id} not found on ledger.`);
    }

    const discountRate = params.discountRate || req.discount_rate_apr || 10.5;
    const offeredAmount = params.offeredAmount || Math.round(invoice.amount * (1 - (discountRate / 100) * (45 / 365)));

    req.financing_status = 'APPROVED';
    req.financier_organization_id = params.financierOrgId;
    req.offered_amount = offeredAmount;
    req.discount_rate_apr = discountRate;
    req.decision_reason = params.decisionReason;
    req.decision_by = params.financierUserId;
    req.disbursed_at = new Date().toISOString();
    req.updated_at = new Date().toISOString();

    // Commit financing on DRUNIX DLT
    const updatedInvoice = await drunixGateway.financeInvoice(
      invoice.id,
      params.financierUserId,
      params.financierOrgName,
      discountRate,
      offeredAmount
    );

    if (isDatabasePostgres()) {
      try {
        await query(
          `UPDATE financing_requests 
           SET financing_status = $1, financier_organization_id = $2, offered_amount = $3, discount_rate_apr = $4, decision_reason = $5, decision_by = $6, disbursed_at = $7, updated_at = $8
           WHERE id = $9`,
          [req.financing_status, req.financier_organization_id, req.offered_amount, req.discount_rate_apr, req.decision_reason, req.decision_by, req.disbursed_at, req.updated_at, req.id]
        );
      } catch (err: any) {
        console.warn('Postgres financing approval update failed:', err.message);
      }
    }

    // Audit and notify supplier
    await AuditNotificationService.logAudit({
      userId: params.financierUserId,
      organizationId: params.financierOrgId,
      action: 'FINANCING_APPROVED',
      entityType: 'FINANCING_REQUEST',
      entityId: req.id,
      metadata: { invoiceId: invoice.id, offeredAmount, discountRate, decisionReason: params.decisionReason },
    });

    await AuditNotificationService.notify({
      organizationId: req.supplier_organization_id,
      title: 'Financing Approved & Funded!',
      message: `Your invoice ${invoice.invoiceNumber} has been financed for ₹${offeredAmount.toLocaleString('en-IN')} at ${discountRate}% APR by ${params.financierOrgName}.`,
      notificationType: 'FINANCING_APPROVED',
      link: `/invoices/${invoice.id}`,
    });

    return { request: req, invoice: updatedInvoice };
  }

  /**
   * Reject a financing request with a formal reason
   */
  public static async rejectFinancing(params: {
    requestId: string;
    financierUserId: string;
    financierOrgId: string;
    financierOrgName: string;
    decisionReason: string;
  }): Promise<DbFinancingRequest> {
    let req = inMemoryDb.financingRequests.get(params.requestId);
    if (!req && isDatabasePostgres()) {
      const res = await query('SELECT * FROM financing_requests WHERE id = $1', [params.requestId]);
      if (res && res.rows.length > 0) req = res.rows[0];
    }

    if (!req) {
      throw new Error(`Financing request ${params.requestId} not found.`);
    }

    if (!params.decisionReason || params.decisionReason.trim().length < 5) {
      throw new Error('A detailed decision reason is required when rejecting a financing request.');
    }

    req.financing_status = 'REJECTED';
    req.financier_organization_id = params.financierOrgId;
    req.decision_reason = params.decisionReason;
    req.decision_by = params.financierUserId;
    req.updated_at = new Date().toISOString();

    if (isDatabasePostgres()) {
      try {
        await query(
          `UPDATE financing_requests 
           SET financing_status = $1, financier_organization_id = $2, decision_reason = $3, decision_by = $4, updated_at = $5
           WHERE id = $6`,
          [req.financing_status, req.financier_organization_id, req.decision_reason, req.decision_by, req.updated_at, req.id]
        );
      } catch (err: any) {
        console.warn('Postgres financing rejection update failed:', err.message);
      }
    }

    await AuditNotificationService.logAudit({
      userId: params.financierUserId,
      organizationId: params.financierOrgId,
      action: 'FINANCING_REJECTED',
      entityType: 'FINANCING_REQUEST',
      entityId: req.id,
      metadata: { invoiceId: req.invoice_id, decisionReason: params.decisionReason },
    });

    await AuditNotificationService.notify({
      organizationId: req.supplier_organization_id,
      title: 'Financing Request Update',
      message: `Financing request for invoice has been reviewed: ${params.decisionReason}`,
      notificationType: 'FINANCING_REJECTED',
      link: `/invoices/${req.invoice_id}`,
    });

    return req;
  }

  /**
   * List financing requests according to role and organization boundaries
   */
  public static async listRequests(params: {
    userRole: string;
    userOrgId: string;
  }): Promise<DbFinancingRequest[]> {
    if (isDatabasePostgres()) {
      try {
        if (params.userRole === 'FINANCIER' || params.userRole === 'AUDITOR' || params.userRole === 'ADMIN' || params.userRole === 'EXPLORER') {
          const res = await query('SELECT * FROM financing_requests ORDER BY created_at DESC');
          if (res) return res.rows;
        } else {
          const res = await query('SELECT * FROM financing_requests WHERE supplier_organization_id = $1 ORDER BY created_at DESC', [params.userOrgId]);
          if (res) return res.rows;
        }
      } catch (err: any) {
        console.warn('Postgres list financing requests error:', err.message);
      }
    }

    const all = Array.from(inMemoryDb.financingRequests.values());
    if (params.userRole === 'FINANCIER' || params.userRole === 'AUDITOR' || params.userRole === 'ADMIN' || params.userRole === 'EXPLORER') {
      return all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return all
      .filter((r) => r.supplier_organization_id === params.userOrgId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
}
