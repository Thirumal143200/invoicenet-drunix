import { Request, Response } from 'express';
import { FinancingWorkflowService } from '../services/financingWorkflowService';

export class FinancingController {
  public static async requestFinancing(req: Request, res: Response) {
    try {
      const { invoiceId, requestedAmount, requestedRate, tenorDays } = req.body;
      if (!invoiceId) {
        return res.status(400).json({ success: false, error: 'invoiceId is required' });
      }

      const supplierOrgId = req.user?.organizationId || (req.headers['x-user-org'] as string) || 'ORG-SUPPLIER-01';
      const supplierUserId = req.user?.id || (req.headers['x-user-id'] as string) || 'SP-101';

      const result = await FinancingWorkflowService.requestFinancing({
        invoiceId,
        supplierOrgId,
        supplierUserId,
        requestedAmount: requestedAmount ? Number(requestedAmount) : undefined,
        requestedRate: requestedRate ? Number(requestedRate) : undefined,
        tenorDays: tenorDays ? Number(tenorDays) : undefined,
      });

      return res.status(201).json({
        success: true,
        message: 'Financing request submitted successfully for underwriting evaluation.',
        data: result,
      });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async listRequests(req: Request, res: Response) {
    try {
      const userRole = req.user?.role || (req.headers['x-user-role'] as string) || 'FINANCIER';
      const userOrgId = req.user?.organizationId || (req.headers['x-user-org'] as string) || 'ORG-FINANCIER-01';

      const requests = await FinancingWorkflowService.listRequests({ userRole, userOrgId });
      return res.json({ success: true, data: requests });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async approve(req: Request, res: Response) {
    try {
      const requestId = req.params.id;
      const { offeredAmount, discountRate, decisionReason } = req.body;

      if (!decisionReason) {
        return res.status(400).json({ success: false, error: 'Mandatory underwriting decisionReason is required.' });
      }

      const financierUserId = req.user?.id || (req.headers['x-user-id'] as string) || 'FN-301';
      const financierOrgId = req.user?.organizationId || (req.headers['x-user-org'] as string) || 'ORG-FINANCIER-01';
      const financierOrgName = req.user?.organizationName || 'Apex Supply Chain Capital';

      const result = await FinancingWorkflowService.approveFinancing({
        requestId,
        financierUserId,
        financierOrgId,
        financierOrgName,
        offeredAmount: offeredAmount ? Number(offeredAmount) : undefined,
        discountRate: discountRate ? Number(discountRate) : undefined,
        decisionReason,
      });

      return res.json({
        success: true,
        message: 'Financing approved and funds committed on DRUNIX DLT.',
        data: result,
      });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async reject(req: Request, res: Response) {
    try {
      const requestId = req.params.id;
      const { decisionReason } = req.body;

      if (!decisionReason) {
        return res.status(400).json({ success: false, error: 'decisionReason is required' });
      }

      const financierUserId = req.user?.id || (req.headers['x-user-id'] as string) || 'FN-301';
      const financierOrgId = req.user?.organizationId || (req.headers['x-user-org'] as string) || 'ORG-FINANCIER-01';
      const financierOrgName = req.user?.organizationName || 'Apex Supply Chain Capital';

      const result = await FinancingWorkflowService.rejectFinancing({
        requestId,
        financierUserId,
        financierOrgId,
        financierOrgName,
        decisionReason,
      });

      return res.json({
        success: true,
        message: 'Financing request reviewed and rejected.',
        data: result,
      });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }
}
