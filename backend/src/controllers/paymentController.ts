import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { inMemoryDb, isDatabasePostgres, query, DbPayment } from '../db';
import { drunixGateway } from '../services/drunixGateway';
import { AuditNotificationService } from '../services/auditNotificationService';

export class PaymentController {
  /**
   * POST /api/payments
   * Record a settlement / payment against an approved/financed invoice
   */
  public static async recordPayment(req: Request, res: Response) {
    try {
      const { invoiceId, amount, paymentReference, paymentMethod = 'RTGS/NEFT', notes } = req.body;

      if (!invoiceId || !amount || !paymentReference) {
        return res.status(400).json({
          success: false,
          error: 'invoiceId, amount, and paymentReference are mandatory.',
        });
      }

      const invoice = await drunixGateway.getInvoiceById(invoiceId);
      if (!invoice) {
        return res.status(404).json({ success: false, error: 'Invoice not found' });
      }

      const payment: DbPayment = {
        id: `PAY-${uuidv4().slice(0, 8).toUpperCase()}`,
        invoice_id: invoiceId,
        amount: Number(amount),
        payment_reference: paymentReference.trim(),
        payment_status: 'COMPLETED',
        payment_date: new Date().toISOString(),
        payment_method: paymentMethod,
        recorded_by: req.user?.id || (req.headers['x-user-id'] as string) || 'BY-201',
        notes,
        created_at: new Date().toISOString(),
      };

      if (isDatabasePostgres()) {
        try {
          await query(
            `INSERT INTO payments (id, invoice_id, amount, payment_reference, payment_status, payment_date, recorded_by, payment_method, notes, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [payment.id, payment.invoice_id, payment.amount, payment.payment_reference, payment.payment_status, payment.payment_date, payment.recorded_by, payment.payment_method, payment.notes, payment.created_at]
          );
        } catch (err: any) {
          console.warn('Postgres payment write failed:', err.message);
        }
      }

      inMemoryDb.payments.set(payment.id, payment);

      // Settle on DRUNIX ledger
      const buyerId = req.user?.id ? `${req.user.id} (${req.user.fullName})` : 'BY-201 (Rajesh Kumar)';
      await drunixGateway.settleInvoice(invoiceId, buyerId, paymentReference);

      // Audit Log
      await AuditNotificationService.logAudit({
        userId: req.user?.id,
        userName: req.user?.fullName,
        organizationId: req.user?.organizationId,
        action: 'PAYMENT_RECORDED',
        entityType: 'PAYMENT',
        entityId: payment.id,
        metadata: { invoiceId, amount: payment.amount, paymentReference },
      });

      // Notify parties
      await AuditNotificationService.notify({
        title: 'Payment Settled',
        message: `Payment of ₹${payment.amount.toLocaleString('en-IN')} recorded for invoice ${invoice.invoiceNumber}. Ref: ${paymentReference}`,
        notificationType: 'PAYMENT_RECEIVED',
        link: `/invoices/${invoiceId}`,
      });

      return res.status(201).json({
        success: true,
        message: 'Payment recorded and settled on DRUNIX ledger.',
        data: payment,
      });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/payments
   * List payments
   */
  public static async listPayments(req: Request, res: Response) {
    try {
      if (isDatabasePostgres()) {
        const result = await query('SELECT * FROM payments ORDER BY created_at DESC');
        if (result) return res.json({ success: true, data: result.rows });
      }

      const payments = Array.from(inMemoryDb.payments.values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return res.json({ success: true, data: payments });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
