import { Request, Response } from 'express';
import { drunixGateway } from '../services/drunixGateway';

export class InvoiceController {
  public static async getAll(req: Request, res: Response) {
    try {
      const invoices = await drunixGateway.getAllInvoices();
      res.json({ success: true, data: invoices });
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
      res.json({ success: true, data: invoice });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async create(req: Request, res: Response) {
    try {
      const {
        invoiceNumber,
        supplierId = 'SP-101',
        supplierOrg = 'TechParts Manufacturing Pvt. Ltd.',
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
