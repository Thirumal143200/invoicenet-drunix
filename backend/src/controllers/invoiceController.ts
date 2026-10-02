import { Request, Response } from 'express';
import { drunixGateway, Invoice } from '../services/drunixGateway';

/**
 * Helper to check tenant authorization for an invoice
 */
export function isAuthorizedForInvoice(
  invoice: Invoice,
  user: { role: string; organizationName?: string; id?: string; mspId?: string }
): boolean {
  const role = (user.role || '').toUpperCase();
  if (role === 'EXPLORER' || role === 'AUDITOR' || role === 'ADMIN') {
    return true; // Consortium auditor/explorer/admin has full ledger visibility
  }

  const userOrg = (user.organizationName || '').toLowerCase().trim();
  const userId = (user.id || '').toLowerCase().trim();

  if (role === 'SUPPLIER') {
    const invSupplierOrg = (invoice.supplierOrg || '').toLowerCase().trim();
    const invSupplierId = (invoice.supplierId || '').toLowerCase().trim();
    return (
      (Boolean(userId) && (invSupplierId === userId || invSupplierId.includes(userId))) ||
      (Boolean(userOrg) && (invSupplierOrg.includes(userOrg) || userOrg.includes(invSupplierOrg)))
    );
  }

  if (role === 'BUYER') {
    const invBuyerOrg = (invoice.buyerOrg || '').toLowerCase().trim();
    const invBuyerId = (invoice.buyerId || '').toLowerCase().trim();
    return (
      (Boolean(userId) && (invBuyerId === userId || invBuyerId.includes(userId))) ||
      (Boolean(userOrg) && (invBuyerOrg.includes(userOrg) || userOrg.includes(invBuyerOrg)))
    );
  }

  if (role === 'FINANCIER') {
    // Invoices open for financing, actively financed, or settled
    if (invoice.status === 'CREATED' || invoice.status === 'REJECTED') {
      return Boolean(
        invoice.financierId &&
          (invoice.financierId.toLowerCase() === userId ||
            (Boolean(userOrg) && invoice.financierOrg?.toLowerCase().includes(userOrg)))
      );
    }
    return true;
  }

  return false;
}

export class InvoiceController {
  public static async getAll(req: Request, res: Response) {
    try {
      const allInvoices = await drunixGateway.getAllInvoices();
      let data = allInvoices;
      if (req.user) {
        data = allInvoices.filter((inv) => isAuthorizedForInvoice(inv, req.user!));
      }
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getById(req: Request, res: Response) {
    try {
      const invoice = await drunixGateway.getInvoiceById(req.params.id);
      if (!invoice) {
        return res.status(404).json({ success: false, error: 'Invoice not found on DRUNIX ledger' });
      }

      if (req.user && !isAuthorizedForInvoice(invoice, req.user)) {
        return res.status(403).json({
          success: false,
          error: `ACCESS DENIED: Tenant isolation policy prevents ${req.user.role} (${req.user.organizationName}) from accessing foreign invoice ${invoice.id}`,
        });
      }

      res.json({ success: true, data: invoice });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async create(req: Request, res: Response) {
    try {
      const {
        invoiceNumber,
        buyerId = 'BY-201',
        buyerOrg = 'AutoWorks Industries Ltd.',
        amount,
        dueDate,
        description,
        documentHash,
        documentFileName,
        supplierGstin,
        buyerGstin,
        poNumber,
        subtotal,
        taxAmount,
        lineItems,
        aiVerification,
      } = req.body;

      let { supplierId, supplierOrg } = req.body;

      if (req.user) {
        if (req.user.role === 'BUYER') {
          return res.status(403).json({
            success: false,
            error: 'Access denied: Buyers cannot create supplier invoices.',
          });
        }
        // Bind supplier to authenticated tenant
        supplierOrg = req.user.organizationName || supplierOrg;
        supplierId = req.user.id || supplierId;
      }

      supplierId = supplierId || 'SP-101';
      supplierOrg = supplierOrg || 'TechParts Manufacturing Pvt. Ltd.';

      if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, error: 'Amount must be greater than zero' });
      }

      if (!dueDate) {
        return res.status(400).json({ success: false, error: 'Due date is required' });
      }

      const invoice = await drunixGateway.createInvoice({
        invoiceNumber,
        supplierId,
        supplierOrg,
        buyerId,
        buyerOrg,
        amount: Number(amount),
        dueDate,
        description: description || 'Industrial component supply contract',
        documentHash,
        documentFileName,
        supplierGstin,
        buyerGstin,
        poNumber,
        subtotal: subtotal ? Number(subtotal) : undefined,
        taxAmount: taxAmount ? Number(taxAmount) : undefined,
        lineItems,
        aiVerification,
      });

      res.status(201).json({
        success: true,
        message: 'Invoice successfully registered and cryptographically stamped on DRUNIX ledger',
        data: invoice,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async accept(req: Request, res: Response) {
    try {
      const { buyerId = 'BY-201 (Rajesh Kumar)' } = req.body;
      const invoice = await drunixGateway.acceptInvoice(req.params.id, buyerId);
      res.json({
        success: true,
        message: 'Invoice accepted with BuyerMSP cryptographic endorsement on DRUNIX',
        data: invoice,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async reject(req: Request, res: Response) {
    try {
      const { buyerId = 'BY-201 (Rajesh Kumar)', reason = 'Discrepancy in goods delivery' } = req.body;
      const invoice = await drunixGateway.rejectInvoice(req.params.id, buyerId, reason);
      res.json({
        success: true,
        message: 'Invoice rejected with dispute record placed on-chain',
        data: invoice,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async requestFinancing(req: Request, res: Response) {
    try {
      const { supplierId = 'SP-101 (Priya Sharma)', requestedRate = 11.5 } = req.body;
      const invoice = await drunixGateway.requestFinancing(req.params.id, supplierId, Number(requestedRate));
      res.json({
        success: true,
        message: 'Invoice placed on DRUNIX financing exchange for financier bids',
        data: invoice,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async finance(req: Request, res: Response) {
    try {
      const {
        financierId = 'FN-301 (Ananya Patel)',
        financierOrg = 'QuickFund Capital',
        discountRate = 11.0,
        financedAmount,
      } = req.body;

      const invoice = await drunixGateway.getInvoiceById(req.params.id);
      if (!invoice) {
        return res.status(404).json({ success: false, error: 'Invoice not found' });
      }

      const calculatedAmount = financedAmount ? Number(financedAmount) : invoice.amount * (1 - (Number(discountRate) / 100) * (90 / 365));

      const updated = await drunixGateway.financeInvoice(
        req.params.id,
        financierId,
        financierOrg,
        Number(discountRate),
        Math.round(calculatedAmount)
      );

      res.json({
        success: true,
        message: 'Invoice financed! DRUNIX multi-org endorsement complete. Double-financing protection verified.',
        data: updated,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async settle(req: Request, res: Response) {
    try {
      const { buyerId = 'BY-201 (Rajesh Kumar)', paymentReference = `UPI/NEFT/CITI-${Date.now()}` } = req.body;
      const invoice = await drunixGateway.settleInvoice(req.params.id, buyerId, paymentReference);
      res.json({
        success: true,
        message: 'Invoice fully settled on ledger with bank payment proof',
        data: invoice,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}
