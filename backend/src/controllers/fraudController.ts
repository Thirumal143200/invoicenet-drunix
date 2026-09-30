import { Request, Response } from 'express';
import {
  FraudDetectionService,
  InvestigationStatus,
} from '../services/fraudDetectionService';

export class FraudController {
  private static parseUser(req: Request) {
    const role = (req.headers['x-user-role'] as string) || req.query.role as string || 'EXPLORER';
    const org = (req.headers['x-user-org'] as string) || req.query.org as string || 'DRUNIX Consortium Node';
    const userId = (req.headers['x-user-id'] as string) || req.query.userId as string || 'Auditor-99';

    return { role: role.toUpperCase(), org, userId };
  }

  public static async getAlerts(req: Request, res: Response) {
    try {
      const { role, org, userId } = FraudController.parseUser(req);
      const { severity, status, anomalyType } = req.query;

      let alerts = FraudDetectionService.getAllAlerts(role, org, userId);

      if (severity && severity !== 'ALL') {
        alerts = alerts.filter((a) => a.severity.toUpperCase() === String(severity).toUpperCase());
      }
      if (status && status !== 'ALL') {
        alerts = alerts.filter((a) => a.status.toUpperCase() === String(status).toUpperCase());
      }
      if (anomalyType && anomalyType !== 'ALL') {
        alerts = alerts.filter((a) => a.anomalyType.toUpperCase() === String(anomalyType).toUpperCase());
      }

      res.json({
        success: true,
        count: alerts.length,
        data: alerts,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getAlertById(req: Request, res: Response) {
    try {
      const { role, org, userId } = FraudController.parseUser(req);
      const alert = FraudDetectionService.getAlertById(req.params.id, role, org, userId);

      if (!alert) {
        return res.status(404).json({
          success: false,
          error: `Alert '${req.params.id}' was not found or you do not have permission to view it.`,
        });
      }

      res.json({
        success: true,
        data: alert,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getMetrics(req: Request, res: Response) {
    try {
      const { role, org, userId } = FraudController.parseUser(req);
      const metrics = FraudDetectionService.getMetrics(role, org, userId);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async addNote(req: Request, res: Response) {
    try {
      const { note } = req.body;
      if (!note || typeof note !== 'string' || note.trim() === '') {
        return res.status(400).json({ success: false, error: 'Investigation note content is required.' });
      }

      const { role, userId } = FraudController.parseUser(req);
      const alert = FraudDetectionService.addInvestigationNote(
        req.params.id,
        userId,
        role,
        note
      );

      res.json({
        success: true,
        message: 'Investigation note added and recorded in audit trail.',
        data: alert,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async updateStatus(req: Request, res: Response) {
    try {
      const { status, notes } = req.body;
      const validStatuses: InvestigationStatus[] = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'FALSE_POSITIVE'];

      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        });
      }

      const { role, org, userId } = FraudController.parseUser(req);
      const alert = FraudDetectionService.updateAlertStatus(
        req.params.id,
        status,
        userId,
        `${org} (${role})`,
        notes
      );

      res.json({
        success: true,
        message: `Alert case updated to '${status}' and logged to audit trail.`,
        data: alert,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async scanLedger(req: Request, res: Response) {
    try {
      const alerts = await FraudDetectionService.scanLedgerForAnomalies();
      res.json({
        success: true,
        message: 'Ledger scan complete. Anomaly detection rules evaluated against all DRUNIX records.',
        totalAlerts: alerts.length,
        data: alerts,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static getConfig(req: Request, res: Response) {
    res.json({
      success: true,
      data: FraudDetectionService.getConfig(),
    });
  }

  public static updateConfig(req: Request, res: Response) {
    try {
      const { role } = FraudController.parseUser(req);
      if (role !== 'EXPLORER' && role !== 'FINANCIER') {
        return res.status(403).json({
          success: false,
          error: 'Only Network Auditors or Risk Desk Officers can modify anomaly detection thresholds.',
        });
      }

      const updated = FraudDetectionService.updateConfig(req.body);
      res.json({
        success: true,
        message: 'Fraud engine detection thresholds updated successfully.',
        data: updated,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}
