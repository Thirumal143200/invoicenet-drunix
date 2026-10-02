import { Request, Response } from 'express';
import { ReminderService } from '../services/reminderService';
import { ReminderSchedulerService } from '../services/reminderSchedulerService';
import { z } from 'zod';

const updatePreferencesSchema = z.object({
  email_enabled: z.boolean().optional(),
  in_app_enabled: z.boolean().optional(),
  enabled_intervals: z.array(z.number()).optional(),
  overdue_alerts_enabled: z.boolean().optional(),
  minimum_amount: z.number().min(0).optional(),
});

export class ReminderController {
  /**
   * GET /api/reminders
   * Fetch invoice reminders with RBAC and tenant isolation
   */
  public static async getReminders(req: Request, res: Response) {
    try {
      const userRole = req.user?.role || (req.headers['x-user-role'] as string) || 'AUDITOR';
      const userOrgId = req.user?.organizationId || (req.headers['x-user-org'] as string) || 'ORG-AUDITOR-01';
      const userOrgName = req.user?.organizationName;
      const userId = req.user?.id || (req.headers['x-user-id'] as string);

      const filter = (req.query.filter as string) || 'ALL';
      const status = (req.query.status as string) || 'ALL';
      const search = (req.query.search as string) || '';
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const offset = req.query.offset ? Number(req.query.offset) : 0;

      const result = await ReminderService.getReminders({
        userRole,
        userOrgId,
        userOrgName,
        userId,
        filter,
        status,
        search,
        limit,
        offset,
      });

      return res.json({
        success: true,
        data: result.items,
        total: result.total,
        filter,
        status,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/reminders/summary
   * Fetch summary KPIs for Reminders dashboard
   */
  public static async getSummary(req: Request, res: Response) {
    try {
      const userRole = req.user?.role || (req.headers['x-user-role'] as string) || 'AUDITOR';
      const userOrgId = req.user?.organizationId || (req.headers['x-user-org'] as string) || 'ORG-AUDITOR-01';
      const userOrgName = req.user?.organizationName;
      const userId = req.user?.id || (req.headers['x-user-id'] as string);

      const summary = await ReminderService.getSummary({
        userRole,
        userOrgId,
        userOrgName,
        userId,
      });

      return res.json({ success: true, data: summary });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/reminders/process
   * Trigger immediate scan and generation of due reminders
   */
  public static async processReminders(req: Request, res: Response) {
    try {
      const { referenceDate, triggerReason = 'USER_ON_DEMAND' } = req.body || {};
      const refDate = referenceDate ? new Date(referenceDate) : new Date();

      if (isNaN(refDate.getTime())) {
        return res.status(400).json({ success: false, error: 'Invalid referenceDate format.' });
      }

      const report = await ReminderSchedulerService.executeScan(triggerReason, refDate);
      return res.json({
        success: true,
        message: `Reminder evaluation completed: ${report.generatedRemindersCount} generated, ${report.skippedDueToDeduplication} deduplicated.`,
        data: report,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/reminders/scheduler
   * Health and telemetry of the background reminder scheduler
   */
  public static async getSchedulerStatus(req: Request, res: Response) {
    try {
      const status = ReminderSchedulerService.getStatus();
      return res.json({ success: true, data: status });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * PUT /api/reminders/:id/read
   * Mark reminder as read
   */
  public static async markRead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || (req.headers['x-user-id'] as string);
      const userOrgId = req.user?.organizationId || (req.headers['x-user-org'] as string);

      const success = await ReminderService.markAsRead(id, userId, userOrgId);
      return res.json({ success });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * PUT /api/reminders/read-all
   * Mark all reminders as read for the user/role
   */
  public static async markAllRead(req: Request, res: Response) {
    try {
      const userRole = req.user?.role || (req.headers['x-user-role'] as string) || 'AUDITOR';
      const userOrgId = req.user?.organizationId || (req.headers['x-user-org'] as string);

      const count = await ReminderService.markAllAsRead({ userRole, userOrgId });
      return res.json({ success: true, markedCount: count });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/reminders/preferences
   * Get reminder preferences for the active user/organization
   */
  public static async getPreferences(req: Request, res: Response) {
    try {
      const userId = req.user?.id || (req.headers['x-user-id'] as string) || 'USR-SUPPLIER-01';
      const userOrgId = req.user?.organizationId || (req.headers['x-user-org'] as string) || 'ORG-SUPPLIER-01';

      const prefs = await ReminderService.getPreferences(userId, userOrgId);
      return res.json({ success: true, data: prefs });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * PUT /api/reminders/preferences
   * Update reminder preferences
   */
  public static async updatePreferences(req: Request, res: Response) {
    try {
      const parsed = updatePreferencesSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0]?.message || 'Invalid parameters' });
      }

      const userId = req.user?.id || (req.headers['x-user-id'] as string) || 'USR-SUPPLIER-01';
      const userOrgId = req.user?.organizationId || (req.headers['x-user-org'] as string) || 'ORG-SUPPLIER-01';

      const updated = await ReminderService.updatePreferences(userId, userOrgId, parsed.data);
      return res.json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
