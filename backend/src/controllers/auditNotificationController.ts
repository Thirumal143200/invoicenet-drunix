import { Request, Response } from 'express';
import { AuditNotificationService } from '../services/auditNotificationService';

export class AuditNotificationController {
  public static async getAuditLogs(req: Request, res: Response) {
    try {
      const userRole = req.user?.role || (req.headers['x-user-role'] as string) || 'AUDITOR';
      const userOrgId = req.user?.organizationId || (req.headers['x-user-org'] as string) || 'ORG-AUDITOR-01';
      const limit = req.query.limit ? Number(req.query.limit) : 50;

      const logs = await AuditNotificationService.getAuditLogs({
        userRole,
        userOrgId,
        limit,
      });

      return res.json({ success: true, data: logs });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getNotifications(req: Request, res: Response) {
    try {
      const userId = req.user?.id || (req.headers['x-user-id'] as string) || 'USR-SUPPLIER-01';
      const notifications = await AuditNotificationService.getUserNotifications(userId);
      return res.json({ success: true, data: notifications });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async markRead(req: Request, res: Response) {
    try {
      const userId = req.user?.id || (req.headers['x-user-id'] as string) || 'USR-SUPPLIER-01';
      const success = await AuditNotificationService.markAsRead(req.params.id, userId);
      return res.json({ success });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async markAllRead(req: Request, res: Response) {
    try {
      const userId = req.user?.id || (req.headers['x-user-id'] as string) || 'USR-SUPPLIER-01';
      const count = await AuditNotificationService.markAllAsRead(userId);
      return res.json({ success: true, markedCount: count });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
