import { Request, Response } from 'express';
import { InvoiceRiskEngineService } from '../services/invoiceRiskEngineService';
import { drunixGateway } from '../services/drunixGateway';

export class RiskController {
  private static parseUser(req: Request) {
    const role = ((req.headers['x-user-role'] as string) || (req.query.role as string) || 'FINANCIER').toUpperCase();
    const org = (req.headers['x-user-org'] as string) || (req.query.org as string) || 'QuickFund Capital Ltd.';
    const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string) || 'Financier-1';

    return { role, org, userId };
  }

  /**
   * Run risk analysis on an invoice
   * POST /api/risk/analyze/:invoiceId
   */
  public static async analyzeInvoice(req: Request, res: Response) {
    try {
      const { invoiceId } = req.params;
      const { role, org, userId } = RiskController.parseUser(req);

      // Verify invoice exists
      const invoice = await drunixGateway.getInvoiceById(invoiceId);
      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: `Invoice '${invoiceId}' was not found on DRUNIX ledger.`,
        });
      }

      // Restrict access: FINANCIER and EXPLORER (Auditors) have full access.
      // SUPPLIER and BUYER can only analyze their own invoices.
      if (role === 'SUPPLIER') {
        const matchesSupplier =
          invoice.supplierId.toLowerCase() === userId.toLowerCase() ||
          invoice.supplierOrg.toLowerCase().includes(org.toLowerCase());
        if (!matchesSupplier) {
          return res.status(403).json({
            success: false,
            error: 'Access denied: Suppliers may only analyze their own registered invoices.',
          });
        }
      } else if (role === 'BUYER') {
        const matchesBuyer =
          invoice.buyerId.toLowerCase() === userId.toLowerCase() ||
          invoice.buyerOrg.toLowerCase().includes(org.toLowerCase());
        if (!matchesBuyer) {
          return res.status(403).json({
            success: false,
            error: 'Access denied: Buyers may only analyze their own commercial payables.',
          });
        }
      }

      const assessment = await InvoiceRiskEngineService.analyzeInvoiceRisk(invoiceId, `${role}-${userId}`);

      res.json({
        success: true,
        data: assessment,
      });
    } catch (err: any) {
      console.error('Error analyzing invoice risk:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Internal error during invoice risk analysis',
      });
    }
  }

  /**
   * Get existing assessment for an invoice
   * GET /api/risk/assessment/:invoiceId
   */
  public static async getAssessment(req: Request, res: Response) {
    try {
      const { invoiceId } = req.params;
      const { role, org, userId } = RiskController.parseUser(req);

      const invoice = await drunixGateway.getInvoiceById(invoiceId);
      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: `Invoice '${invoiceId}' was not found on DRUNIX ledger.`,
        });
      }

      // Check role authorization
      if (role === 'SUPPLIER') {
        const matchesSupplier =
          invoice.supplierId.toLowerCase() === userId.toLowerCase() ||
          invoice.supplierOrg.toLowerCase().includes(org.toLowerCase());
        if (!matchesSupplier) {
          return res.status(403).json({
            success: false,
            error: 'Access denied: Suppliers may only view risk assessments for their own invoices.',
          });
        }
      } else if (role === 'BUYER') {
        const matchesBuyer =
          invoice.buyerId.toLowerCase() === userId.toLowerCase() ||
          invoice.buyerOrg.toLowerCase().includes(org.toLowerCase());
        if (!matchesBuyer) {
          return res.status(403).json({
            success: false,
            error: 'Access denied: Buyers may only view risk assessments for their own payables.',
          });
        }
      }

      let assessment = InvoiceRiskEngineService.getAssessment(invoiceId);
      if (!assessment) {
        // Run analysis on demand
        assessment = await InvoiceRiskEngineService.analyzeInvoiceRisk(invoiceId, `${role}-${userId}`);
      }

      res.json({
        success: true,
        data: assessment,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }

  /**
   * Get all assessments across authorized invoices
   * GET /api/risk/assessments
   */
  public static async getAllAssessments(req: Request, res: Response) {
    try {
      const { role, org, userId } = RiskController.parseUser(req);
      const assessments = await InvoiceRiskEngineService.getAllAssessments(role, org, userId);

      res.json({
        success: true,
        count: assessments.length,
        data: assessments,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }

  /**
   * Get scoring methodology and configuration
   * GET /api/risk/config
   */
  public static getConfig(req: Request, res: Response) {
    res.json({
      success: true,
      scoringMethodology: {
        scale: '0 to 100 (Explainable Risk Index)',
        brackets: [
          { level: 'LOW', range: '0 - 24', description: 'Prime trade receivable, low risk of default or dispute' },
          { level: 'MEDIUM', range: '25 - 49', description: 'Minor non-conformity or missing metadata, standard diligence' },
          { level: 'HIGH', range: '50 - 74', description: 'Elevated risk, PO discrepancy or statistical outlier, enhanced diligence required' },
          { level: 'CRITICAL', range: '75 - 100', description: 'Severe fraud/duplicate indicator or date paradox, hold financing' },
        ],
        weights: [
          { factor: 'Duplicate Invoice Reference', weight: '+45 pts', severity: 'CRITICAL', rule: 'Collision with existing on-chain invoice reference' },
          { factor: 'Duplicate Cryptographic Hash', weight: '+45 pts', severity: 'CRITICAL', rule: 'SHA-256 fingerprint collision with prior ledger commitment' },
          { factor: 'Amount Outlier (>2.5σ or >3.5x)', weight: '+20 pts', severity: 'HIGH', rule: 'Statistical deviation exceeding historical supplier mean' },
          { factor: 'Moderate Amount Deviation (1.8x-3.5x)', weight: '+10 pts', severity: 'MEDIUM', rule: 'Invoice value notably exceeds customary billing volume' },
          { factor: 'Commercial Date Paradox', weight: '+20 pts', severity: 'HIGH', rule: 'Due date precedes issue date' },
          { factor: 'Long-Dated Tenor (>120 days)', weight: '+10 pts', severity: 'MEDIUM', rule: 'Payment terms exceed 120 days from issue' },
          { factor: 'Short-Dated Tenor (<5 days)', weight: '+10 pts', severity: 'LOW', rule: 'Abnormally short commercial payment turnaround' },
          { factor: 'PO Amount Mismatch (>5% variance)', weight: '+20 pts', severity: 'HIGH', rule: 'Invoice total differs significantly from underlying ERP purchase order' },
          { factor: 'Unverified Purchase Order', weight: '+15 pts', severity: 'MEDIUM', rule: 'Referenced PO number does not exist in corporate ERP records' },
          { factor: 'Missing PO Reference', weight: '+10 pts', severity: 'LOW', rule: 'Commercial receivable unlinked to formal corporate purchase order' },
          { factor: 'Unendorsed Draft State', weight: '+10 pts', severity: 'LOW', rule: 'Receivable in draft status without buyer cryptographic sign-off' },
          { factor: 'Buyer Cryptographic Endorsement', weight: '-10 pts', severity: 'LOW (MITIGANT)', rule: 'Verified BuyerMSP signature on DRUNIX ledger reduces dispute probability' },
        ],
        aiAssistance: 'Google Gemini 2.5 Flash provides natural language executive synthesis and underwriting guidance. Validated with strict Zod schema. LLM cannot override deterministic scores or invent facts.',
      },
    });
  }
}
