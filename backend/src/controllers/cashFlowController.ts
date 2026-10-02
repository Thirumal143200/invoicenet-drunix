import { Request, Response } from 'express';
import {
  CashFlowForecastService,
  ForecastScenario,
} from '../services/cashFlowForecastService';
import { PaymentPredictionService } from '../services/paymentPredictionService';

export class CashFlowController {
  private static parseUser(req: Request) {
    if (req.user) {
      return {
        role: req.user.role,
        org: req.user.organizationName,
        userId: req.user.id,
      };
    }
    const role = (req.headers['x-user-role'] as string) || (req.query.role as string) || 'SUPPLIER';
    const org = (req.headers['x-user-org'] as string) || (req.query.org as string) || 'TechParts Manufacturing Pvt. Ltd.';
    const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string) || 'SP-101 (Priya Sharma)';

    return { role: role.toUpperCase(), org, userId };
  }

  public static async getForecast(req: Request, res: Response) {
    try {
      const { role, org, userId } = CashFlowController.parseUser(req);
      const scenarioParam = (req.query.scenario as string)?.toUpperCase() || 'BASELINE';
      const validScenarios: ForecastScenario[] = [
        'BASELINE',
        'EARLY_PAYMENT',
        'DELAYED_PAYMENT',
        'DRUNIX_FINANCING',
      ];

      const scenario: ForecastScenario = validScenarios.includes(scenarioParam as any)
        ? (scenarioParam as ForecastScenario)
        : 'BASELINE';

      const buyer = req.query.buyer as string;
      const status = req.query.status as string;

      const forecast = await CashFlowForecastService.generateForecast(
        role,
        org,
        userId,
        scenario,
        { buyer, status }
      );

      res.json({
        success: true,
        data: forecast,
      });
    } catch (err: any) {
      console.error('Cash flow forecast error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/cashflow/payment-forecast
   * AI-powered payment prediction and 30-day cash flow forecast with tenant isolation
   */
  public static async getPaymentForecast(req: Request, res: Response) {
    try {
      const { role, org, userId } = CashFlowController.parseUser(req);

      const directionFilter = (req.query.direction as string)?.toUpperCase() as any;
      const statusFilter = (req.query.status as string)?.toUpperCase() as any;
      const dateRangePreset = (req.query.dateRange as string)?.toUpperCase() as any;
      const search = req.query.search as string;
      const asOfDateStr = req.query.asOfDate as string;

      let asOfDate: Date | undefined;
      if (asOfDateStr) {
        const parsed = new Date(asOfDateStr);
        if (!isNaN(parsed.getTime())) {
          asOfDate = parsed;
        }
      }

      const forecast = await PaymentPredictionService.generatePaymentForecast(
        role,
        org,
        userId,
        {
          asOfDate,
          directionFilter,
          statusFilter,
          dateRangePreset,
          search,
        }
      );

      return res.json({
        success: true,
        data: forecast,
      });
    } catch (err: any) {
      console.error('Payment forecast calculation error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static getScenarios(req: Request, res: Response) {
    res.json({
      success: true,
      data: [
        {
          id: 'BASELINE',
          name: 'Contractual Baseline',
          description: 'Scheduled maturities adjusted by historical buyer settlement lag with 90% confidence bands.',
        },
        {
          id: 'EARLY_PAYMENT',
          name: 'Dynamic Early Settlement',
          description: 'Models 1.5% prompt payment discount accelerating settlement by 14 days.',
        },
        {
          id: 'DELAYED_PAYMENT',
          name: '30-Day Delay Stress Test',
          description: 'Simulates working capital liquidity impact if corporate buyers defer payments by 30 days.',
        },
        {
          id: 'DRUNIX_FINANCING',
          name: 'DRUNIX Instant Factoring',
          description: 'Advances 89% cash liquidity on accepted receivables within 3.5 hours at 11% APR.',
        },
      ],
    });
  }
}
