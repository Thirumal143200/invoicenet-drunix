import { Request, Response } from 'express';
import { InvoiceRiskEngineService } from '../services/invoiceRiskEngineService';
import { drunixGateway } from '../services/drunixGateway';

const VALID_ROLES = ['SUPPLIER', 'BUYER', 'FINANCIER', 'EXPLORER'];

export class RiskController {
  private static parseUser(req: Request) {
    const rawRole = (req.headers['x-user-role'] as string) || (req.query.role as string) || 'FINANCIER';
    const role = rawRole.toUpperCase().trim();
    const org = (req.headers['x-user-org'] as string) || (req.query.org as string) || 'QuickFund Capital Ltd.';
    const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string) || 'Financier-1';

    return { role, org, userId, isValidRole: VALID_ROLES.includes(role) };
  }

  /**
   * Run or recalculate risk assessment on an invoice
   * POST /api/risk/assess/:invoiceId & POST /api/risk/analyze/:invoiceId
   */
  public static async analyzeInvoice(req: Request, res: Response) {
    try {
      const { invoiceId } = req.params;
      const { role, org, userId, isValidRole } = RiskController.parseUser(req);

      if (!isValidRole) {
        return res.status(403).json({
          success: false,
          error: `Unauthorized role '${role}'. Valid consortium roles are: ${VALID_ROLES.join(', ')}.`,
        });
      }

      // Verify invoice exists on DRUNIX ledger
      const invoice = await drunixGateway.getInvoiceById(invoiceId);
      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: `Invoice '${invoiceId}' was not found on DRUNIX distributed ledger.`,
        });
      }

      // Role authorization enforcement
      if (role === 'SUPPLIER') {
        const matchesSupplier =
          invoice.supplierId.toLowerCase() === userId.toLowerCase() ||
          invoice.supplierOrg.toLowerCase().includes(org.toLowerCase()) ||
          org.toLowerCase().includes(invoice.supplierOrg.toLowerCase());
        if (!matchesSupplier) {
          return res.status(403).json({
            success: false,
            error: 'Access denied: Suppliers may only analyze their own registered invoices.',
          });
        }
      } else if (role === 'BUYER') {
        const matchesBuyer =
          invoice.buyerId.toLowerCase() === userId.toLowerCase() ||
          invoice.buyerOrg.toLowerCase().includes(org.toLowerCase()) ||
          org.toLowerCase().includes(invoice.buyerOrg.toLowerCase());
        if (!matchesBuyer) {
          return res.status(403).json({
            success: false,
            error: 'Access denied: Buyers may only analyze their own commercial payables.',
          });
        }
      }

      // Invalidate existing cached score to force fresh assessment upon explicit POST request
      InvoiceRiskEngineService.invalidateAssessment(invoiceId);
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
   * Get existing assessment for an invoice (or compute on-demand)
   * GET /api/risk/assessments/:invoiceId & GET /api/risk/assessment/:invoiceId
   */
  public static async getAssessment(req: Request, res: Response) {
    try {
      const { invoiceId } = req.params;
      const { role, org, userId, isValidRole } = RiskController.parseUser(req);

      if (!isValidRole) {
        return res.status(403).json({
          success: false,
          error: `Unauthorized role '${role}'. Valid consortium roles are: ${VALID_ROLES.join(', ')}.`,
        });
      }

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
          invoice.supplierOrg.toLowerCase().includes(org.toLowerCase()) ||
          org.toLowerCase().includes(invoice.supplierOrg.toLowerCase());
        if (!matchesSupplier) {
          return res.status(403).json({
            success: false,
            error: 'Access denied: Suppliers may only view risk assessments for their own invoices.',
          });
        }
      } else if (role === 'BUYER') {
        const matchesBuyer =
          invoice.buyerId.toLowerCase() === userId.toLowerCase() ||
          invoice.buyerOrg.toLowerCase().includes(org.toLowerCase()) ||
          org.toLowerCase().includes(invoice.buyerOrg.toLowerCase());
        if (!matchesBuyer) {
          return res.status(403).json({
            success: false,
            error: 'Access denied: Buyers may only view risk assessments for their own payables.',
          });
        }
      }

      let assessment = InvoiceRiskEngineService.getAssessment(invoiceId);
      if (!assessment) {
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
   * Assess uncommitted document extraction data
   * POST /api/risk/assess-document
   */
  public static async assessDocument(req: Request, res: Response) {
    try {
      const { role, org, userId, isValidRole } = RiskController.parseUser(req);

      if (!isValidRole) {
        return res.status(403).json({
          success: false,
          error: `Unauthorized role '${role}'.`,
        });
      }

      const {
        invoiceNumber,
        amount,
        subtotal,
        taxAmount,
        supplierOrg,
        buyerOrg,
        issueDate,
        dueDate,
        poNumber,
        documentHash,
        supplierGstin,
        buyerGstin,
        lineItems,
      } = req.body;

      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Document amount must be greater than zero for risk assessment.',
        });
      }

      const assessment = await InvoiceRiskEngineService.assessDocument(
        {
          invoiceNumber: invoiceNumber || 'UNASSIGNED',
          amount: Number(amount),
          subtotal: subtotal !== undefined ? Number(subtotal) : undefined,
          taxAmount: taxAmount !== undefined ? Number(taxAmount) : undefined,
          supplierOrg: supplierOrg || org,
          buyerOrg: buyerOrg || 'Declared Buyer',
          issueDate,
          dueDate,
          poNumber,
          documentHash,
          supplierGstin,
          buyerGstin,
          lineItems,
        },
        `${role}-${userId}`
      );

      res.json({
        success: true,
        data: assessment,
      });
    } catch (err: any) {
      console.error('Error assessing document risk:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Internal error during document risk assessment',
      });
    }
  }

  /**
   * Get all assessments across authorized invoices
   * GET /api/risk/assessments
   */
  public static async getAllAssessments(req: Request, res: Response) {
    try {
      const { role, org, userId, isValidRole } = RiskController.parseUser(req);

      if (!isValidRole) {
        return res.status(403).json({
          success: false,
          error: `Unauthorized role '${role}'.`,
        });
      }

      let assessments = await InvoiceRiskEngineService.getAllAssessments(role, org, userId);

      // Support category and status query filters
      const { category, status } = req.query;
      if (category && typeof category === 'string' && category !== 'ALL') {
        assessments = assessments.filter((a) => a.riskCategory === category.toUpperCase());
      }

      if (status && typeof status === 'string' && status !== 'ALL') {
        const allInvoices = await drunixGateway.getAllInvoices();
        const invoiceStatusMap = new Map(allInvoices.map((i) => [i.id, i.status]));
        assessments = assessments.filter((a) => invoiceStatusMap.get(a.invoiceId) === status.toUpperCase());
      }

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
   * FinTech Risk Dashboard metrics and portfolio summary
   * GET /api/risk/dashboard
   */
  public static async getDashboard(req: Request, res: Response) {
    try {
      const { role, org, userId, isValidRole } = RiskController.parseUser(req);

      if (!isValidRole) {
        return res.status(403).json({
          success: false,
          error: `Unauthorized role '${role}'.`,
        });
      }

      const assessments = await InvoiceRiskEngineService.getAllAssessments(role, org, userId);
      const allInvoices = await drunixGateway.getAllInvoices();

      const totalAssessed = assessments.length;
      const lowRiskCount = assessments.filter((a) => a.riskCategory === 'LOW').length;
      const mediumRiskCount = assessments.filter((a) => a.riskCategory === 'MEDIUM').length;
      const highRiskCount = assessments.filter((a) => a.riskCategory === 'HIGH').length;
      const criticalRiskCount = assessments.filter((a) => a.riskCategory === 'CRITICAL').length;

      const totalScore = assessments.reduce((sum, a) => sum + a.riskScore, 0);
      const averageRiskScore = totalAssessed > 0 ? Math.round(totalScore / totalAssessed) : 0;

      // Extract common risk factors frequency
      const factorFrequency: Record<string, number> = {};
      for (const a of assessments) {
        for (const f of a.individualRiskFactors || a.detectedFactors || []) {
          if (f.scoreImpact > 0) {
            factorFrequency[f.title] = (factorFrequency[f.title] || 0) + 1;
          }
        }
      }

      const commonRiskFactors = Object.entries(factorFrequency)
        .map(([title, count]) => ({ title, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      res.json({
        success: true,
        data: {
          role,
          org,
          summary: {
            totalAssessed,
            averageRiskScore,
            lowRiskCount,
            mediumRiskCount,
            highRiskCount,
            criticalRiskCount,
          },
          brackets: {
            low: { range: '0 - 29', count: lowRiskCount, label: 'Low Risk (Prime Trade Receivable)' },
            medium: { range: '30 - 59', count: mediumRiskCount, label: 'Medium Risk (Moderate Variance)' },
            high: { range: '60 - 79', count: highRiskCount, label: 'High Risk (Enhanced Diligence Required)' },
            critical: { range: '80 - 100', count: criticalRiskCount, label: 'Critical Risk (Financing Halt)' },
          },
          recentAssessments: assessments.slice(0, 5),
          commonRiskFactors,
          geminiEnabled: !!process.env.GEMINI_API_KEY,
        },
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
        scale: '0 to 100 (Explainable FinTech Risk Index)',
        brackets: [
          { level: 'LOW', range: '0 - 29', description: 'Prime trade receivable, low risk of default or dispute. Approved for discounting.' },
          { level: 'MEDIUM', range: '30 - 59', description: 'Moderate discrepancy or volume deviation, standard commercial verification recommended.' },
          { level: 'HIGH', range: '60 - 79', description: 'Elevated risk, substantial PO mismatch or statistical outlier, enhanced diligence required.' },
          { level: 'CRITICAL', range: '80 - 100', description: 'Critical fraud indicator, reference collision, or date paradox, hold financing immediately.' },
        ],
        weights: [
          { factor: 'Duplicate Invoice Reference', weight: '+45 pts', severity: 'CRITICAL', rule: 'Collision with existing on-chain invoice reference' },
          { factor: 'Duplicate Cryptographic Hash', weight: '+45 pts', severity: 'CRITICAL', rule: 'SHA-256 fingerprint collision with prior ledger commitment' },
          { factor: 'Arithmetic Subtotal/Tax Mismatch', weight: '+25 pts', severity: 'HIGH', rule: 'Subtotal + Tax != Total amount by > 1.0 currency unit' },
          { factor: 'Amount Outlier (>2.5σ or >3.5x)', weight: '+20 pts', severity: 'HIGH', rule: 'Statistical deviation exceeding historical supplier mean' },
          { factor: 'Commercial Date Paradox', weight: '+20 pts', severity: 'HIGH', rule: 'Commercial maturity due date precedes invoice issue date' },
          { factor: 'Purchase Order Mismatch (>5% variance)', weight: '+20 pts', severity: 'HIGH', rule: 'Invoice total deviates from underlying ERP purchase order' },
          { factor: 'Unverified Purchase Order', weight: '+15 pts', severity: 'MEDIUM', rule: 'Referenced PO number does not exist in corporate ERP records' },
          { factor: 'Supplier GSTIN Format Deviation', weight: '+15 pts', severity: 'MEDIUM', rule: 'Tax identifier does not conform to statutory Indian GSTIN format' },
          { factor: 'Long-Dated Tenor (>180 days)', weight: '+15 pts', severity: 'MEDIUM', rule: 'Payment terms exceed 180 days from issue' },
          { factor: 'Overdue Maturity (>30 days)', weight: '+20 pts', severity: 'HIGH', rule: 'Receivable is >30 days past due without settlement' },
          { factor: 'Buyer Cryptographic Endorsement', weight: '-10 pts', severity: 'LOW (MITIGANT)', rule: 'Verified BuyerMSP signature on DRUNIX ledger reduces dispute risk' },
        ],
        aiAssistance: 'Google Gemini 2.5/3.5 Flash provides natural language synthesis and underwriting recommendations validated with strict Zod schema. LLM cannot modify deterministic scores or invent facts.',
      },
    });
  }
}
