import { v4 as uuidv4 } from 'uuid';
import { inMemoryDb, isDatabasePostgres, query, DbInvoiceReminder, DbReminderPreference } from '../db';
import { drunixGateway, Invoice } from './drunixGateway';
import { EmailService } from './emailService';
import { AuditNotificationService } from './auditNotificationService';

export interface ReminderEvaluationReport {
  timestamp: string;
  referenceDate: string;
  scannedInvoicesCount: number;
  generatedRemindersCount: number;
  skippedDueToSettlement: number;
  skippedDueToDeduplication: number;
  skippedDueToPreferences: number;
  emailDeliverySummary: {
    delivered: number;
    mocked: number;
    failed: number;
    skipped: number;
  };
  details: Array<{
    invoiceId: string;
    invoiceNumber: string;
    reminderType: string;
    recipientRole: string;
    action: 'CREATED' | 'SKIPPED_DUPLICATE' | 'SKIPPED_SETTLED' | 'SKIPPED_PREF';
  }>;
}

export type ReminderType =
  | 'BEFORE_7_DAYS'
  | 'BEFORE_3_DAYS'
  | 'DUE_TODAY'
  | 'OVERDUE_1_DAY'
  | 'OVERDUE_3_DAYS'
  | 'OVERDUE_7_DAYS';

export class ReminderService {
  /**
   * Determine matching reminder intervals for a given invoice and reference date
   */
  public static getMatchingInterval(
    dueDateStr: string,
    refDate: Date = new Date()
  ): { type: ReminderType; intervalDays: number; daysDifference: number } | null {
    const due = new Date(dueDateStr);
    if (isNaN(due.getTime())) return null;

    // Normalize to UTC calendar days
    const dueDay = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
    const refDay = Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth(), refDate.getUTCDate());
    const diffDays = Math.round((dueDay - refDay) / (1000 * 60 * 60 * 24)); // > 0 means due in future, < 0 means overdue

    if (diffDays === 7) {
      return { type: 'BEFORE_7_DAYS', intervalDays: -7, daysDifference: diffDays };
    }
    if (diffDays === 3) {
      return { type: 'BEFORE_3_DAYS', intervalDays: -3, daysDifference: diffDays };
    }
    if (diffDays === 0) {
      return { type: 'DUE_TODAY', intervalDays: 0, daysDifference: diffDays };
    }
    if (diffDays === -1) {
      return { type: 'OVERDUE_1_DAY', intervalDays: 1, daysDifference: diffDays };
    }
    if (diffDays === -3) {
      return { type: 'OVERDUE_3_DAYS', intervalDays: 3, daysDifference: diffDays };
    }
    if (diffDays === -7) {
      return { type: 'OVERDUE_7_DAYS', intervalDays: 7, daysDifference: diffDays };
    }

    return null;
  }

  /**
   * Evaluates all open invoices and generates due reminders automatically with duplicate prevention
   */
  public static async evaluateAndGenerateReminders(referenceDate?: Date): Promise<ReminderEvaluationReport> {
    const refDate = referenceDate || new Date();
    const timestamp = new Date().toISOString();
    const report: ReminderEvaluationReport = {
      timestamp,
      referenceDate: refDate.toISOString(),
      scannedInvoicesCount: 0,
      generatedRemindersCount: 0,
      skippedDueToSettlement: 0,
      skippedDueToDeduplication: 0,
      skippedDueToPreferences: 0,
      emailDeliverySummary: { delivered: 0, mocked: 0, failed: 0, skipped: 0 },
      details: [],
    };

    // Get all invoices on DRUNIX ledger
    const allInvoices = await drunixGateway.getAllInvoices();
    report.scannedInvoicesCount = allInvoices.length;

    for (const invoice of allInvoices) {
      // 1. Stop reminders when invoices are paid, settled, or cancelled
      if (invoice.status === 'SETTLED' || invoice.status === 'REJECTED' || invoice.status === 'CANCELLED') {
        report.skippedDueToSettlement++;
        report.details.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          reminderType: 'NONE',
          recipientRole: 'ALL',
          action: 'SKIPPED_SETTLED',
        });
        continue;
      }

      // 2. Calculate interval matching
      const match = this.getMatchingInterval(invoice.dueDate, refDate);
      if (!match) continue;

      // 3. Process recipients: Primary Buyer and Supplier Tracking Copy
      const targetRoles: Array<'BUYER' | 'SUPPLIER'> = ['BUYER', 'SUPPLIER'];

      for (const role of targetRoles) {
        const orgId = role === 'BUYER' ? invoice.buyerId || 'ORG-BUYER-01' : invoice.supplierId || 'ORG-SUPPLIER-01';
        const orgName = role === 'BUYER' ? invoice.buyerOrg : invoice.supplierOrg;
        const counterParty = role === 'BUYER' ? invoice.supplierOrg : invoice.buyerOrg;

        // Check if user preferences allow this interval
        const prefs = await this.getPreferences(orgId, orgId);
        if (!prefs.enabled_intervals.includes(match.intervalDays)) {
          report.skippedDueToPreferences++;
          report.details.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            reminderType: match.type,
            recipientRole: role,
            action: 'SKIPPED_PREF',
          });
          continue;
        }

        if (match.intervalDays > 0 && !prefs.overdue_alerts_enabled) {
          report.skippedDueToPreferences++;
          continue;
        }

        if (invoice.amount < prefs.minimum_amount) {
          report.skippedDueToPreferences++;
          continue;
        }

        // 4. PostgreSQL & In-Memory Deduplication: Prevent duplicate reminders for the same invoice & interval
        const alreadyExists = await this.checkDuplicate(invoice.id, match.type, role);
        if (alreadyExists) {
          report.skippedDueToDeduplication++;
          report.details.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            reminderType: match.type,
            recipientRole: role,
            action: 'SKIPPED_DUPLICATE',
          });
          continue;
        }

        // 5. Build recipient email
        let recipientEmail = role === 'BUYER' ? 'payables@autoworks.com' : 'finance@techparts.in';
        for (const org of inMemoryDb.organizations.values()) {
          if (org.organization_name.toLowerCase().includes(orgName.toLowerCase())) {
            if (org.contact_email) recipientEmail = org.contact_email;
          }
        }

        const reminderId = `REM-${uuidv4().slice(0, 10).toUpperCase()}`;

        // 6. Format and send email notification via adapter
        let emailDeliveryStatus: 'DELIVERED' | 'FAILED' | 'SKIPPED' | 'MOCKED' = 'SKIPPED';
        let emailMessageId: string | undefined;
        let errorMessage: string | undefined;

        if (prefs.email_enabled) {
          const formatted = EmailService.formatReminderEmail({
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.amount,
            currency: invoice.currency,
            dueDate: invoice.dueDate,
            reminderType: match.type,
            intervalDays: match.intervalDays,
            recipientRole: role,
            counterPartyOrg: counterParty,
          });

          const sendResult = await EmailService.sendReminderEmail({
            to: recipientEmail,
            subject: formatted.subject,
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.amount,
            currency: invoice.currency,
            dueDate: invoice.dueDate,
            reminderType: match.type,
            intervalDays: match.intervalDays,
            bodyText: formatted.bodyText,
            bodyHtml: formatted.bodyHtml,
            metadata: { reminderId, invoiceId: invoice.id, recipientRole: role },
          });

          emailDeliveryStatus = sendResult.status;
          emailMessageId = sendResult.messageId;
          if (!sendResult.success) {
            errorMessage = sendResult.error;
          }

          if (sendResult.status === 'DELIVERED') report.emailDeliverySummary.delivered++;
          else if (sendResult.status === 'MOCKED') report.emailDeliverySummary.mocked++;
          else if (sendResult.status === 'FAILED') report.emailDeliverySummary.failed++;
          else report.emailDeliverySummary.skipped++;
        } else {
          report.emailDeliverySummary.skipped++;
        }

        // 7. Store reminder record in PostgreSQL and in-memory store
        const reminderRecord: DbInvoiceReminder = {
          id: reminderId,
          invoice_id: invoice.id,
          invoice_number: invoice.invoiceNumber,
          recipient_user_id: undefined,
          recipient_organization_id: orgId,
          recipient_email: recipientEmail,
          recipient_role: role,
          reminder_type: match.type,
          interval_days: match.intervalDays,
          due_date: invoice.dueDate,
          amount: invoice.amount,
          currency: invoice.currency || 'INR',
          status: 'SENT',
          channel: prefs.email_enabled && prefs.in_app_enabled ? 'BOTH' : prefs.email_enabled ? 'EMAIL' : 'IN_APP',
          email_delivery_status: emailDeliveryStatus,
          email_message_id: emailMessageId,
          error_message: errorMessage,
          is_read: false,
          metadata: {
            buyerOrg: invoice.buyerOrg,
            supplierOrg: invoice.supplierOrg,
            daysDifference: match.daysDifference,
          },
          created_at: timestamp,
          updated_at: timestamp,
        };

        if (isDatabasePostgres()) {
          try {
            await query(
              `INSERT INTO invoice_reminders (
                id, invoice_id, invoice_number, recipient_user_id, recipient_organization_id, recipient_email,
                recipient_role, reminder_type, interval_days, due_date, amount, currency, status, channel,
                email_delivery_status, email_message_id, error_message, is_read, metadata, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
              ON CONFLICT (invoice_id, reminder_type, recipient_role) DO NOTHING`,
              [
                reminderRecord.id,
                reminderRecord.invoice_id,
                reminderRecord.invoice_number,
                reminderRecord.recipient_user_id,
                reminderRecord.recipient_organization_id,
                reminderRecord.recipient_email,
                reminderRecord.recipient_role,
                reminderRecord.reminder_type,
                reminderRecord.interval_days,
                reminderRecord.due_date,
                reminderRecord.amount,
                reminderRecord.currency,
                reminderRecord.status,
                reminderRecord.channel,
                reminderRecord.email_delivery_status,
                reminderRecord.email_message_id,
                reminderRecord.error_message,
                reminderRecord.is_read,
                JSON.stringify(reminderRecord.metadata),
                reminderRecord.created_at,
                reminderRecord.updated_at,
              ]
            );
          } catch (err: any) {
            console.warn('PostgreSQL write invoice reminder notice:', err.message);
          }
        }

        inMemoryDb.invoiceReminders.set(reminderRecord.id, reminderRecord);

        // 8. Dispatch In-App Notification (so drawer & bell badge update immediately)
        if (prefs.in_app_enabled) {
          const notifTitle =
            match.intervalDays > 0
              ? `Overdue Notice: Invoice #${invoice.invoiceNumber}`
              : match.intervalDays === 0
              ? `Due Today: Invoice #${invoice.invoiceNumber}`
              : `Upcoming Reminder: Invoice #${invoice.invoiceNumber}`;

          const notifMsg =
            role === 'BUYER'
              ? `Payment of ₹${invoice.amount.toLocaleString('en-IN')} is ${
                  match.intervalDays > 0
                    ? `${match.intervalDays} days overdue`
                    : match.intervalDays === 0
                    ? 'due today'
                    : `due in ${Math.abs(match.intervalDays)} days`
                } to ${invoice.supplierOrg}.`
              : `Receivable of ₹${invoice.amount.toLocaleString('en-IN')} from ${invoice.buyerOrg} is ${
                  match.intervalDays > 0
                    ? `${match.intervalDays} days overdue`
                    : match.intervalDays === 0
                    ? 'due today'
                    : `due in ${Math.abs(match.intervalDays)} days`
                }. Reminder logged.`;

          await AuditNotificationService.notify({
            organizationId: orgId,
            title: notifTitle,
            message: notifMsg,
            notificationType: match.intervalDays > 0 ? 'ALERT' : 'INFO',
            link: `/invoices/${invoice.id}`,
          });
        }

        report.generatedRemindersCount++;
        report.details.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          reminderType: match.type,
          recipientRole: role,
          action: 'CREATED',
        });
      }
    }

    return report;
  }

  /**
   * Check if a reminder for (invoiceId, reminderType, recipientRole) was already generated
   */
  private static async checkDuplicate(invoiceId: string, reminderType: string, recipientRole: string): Promise<boolean> {
    if (isDatabasePostgres()) {
      try {
        const res = await query(
          'SELECT id FROM invoice_reminders WHERE invoice_id = $1 AND reminder_type = $2 AND recipient_role = $3 LIMIT 1',
          [invoiceId, reminderType, recipientRole]
        );
        if (res && res.rows.length > 0) return true;
      } catch (err: any) {
        console.warn('PostgreSQL duplicate check error:', err.message);
      }
    }

    for (const rem of inMemoryDb.invoiceReminders.values()) {
      if (rem.invoice_id === invoiceId && rem.reminder_type === reminderType && rem.recipient_role === recipientRole) {
        return true;
      }
    }
    return false;
  }

  /**
   * Query reminders with RBAC and tenant isolation
   */
  public static async getReminders(params: {
    userRole: string;
    userOrgId?: string;
    userOrgName?: string;
    userId?: string;
    filter?: string; // 'ALL' | 'UPCOMING' | 'DUE_TODAY' | 'OVERDUE' | 'PAID' | 'UNREAD'
    status?: string; // 'ALL' | 'SENT' | 'PENDING' | 'FAILED'
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: DbInvoiceReminder[]; total: number }> {
    const role = (params.userRole || '').toUpperCase();
    const isConsortiumAuditor = role === 'AUDITOR' || role === 'ADMIN' || role === 'EXPLORER';
    const limit = params.limit || 50;
    const offset = params.offset || 0;

    let items: DbInvoiceReminder[] = [];

    if (isDatabasePostgres()) {
      try {
        let sql = 'SELECT * FROM invoice_reminders WHERE 1=1';
        const queryParams: any[] = [];

        // Tenant Isolation
        if (!isConsortiumAuditor) {
          if (role === 'SUPPLIER') {
            queryParams.push('SUPPLIER');
            sql += ` AND recipient_role = $${queryParams.length}`;
            if (params.userOrgId) {
              queryParams.push(params.userOrgId);
              sql += ` AND (recipient_organization_id = $${queryParams.length} OR metadata->>'supplierOrg' ILIKE $${queryParams.length})`;
            }
          } else if (role === 'BUYER') {
            queryParams.push('BUYER');
            sql += ` AND recipient_role = $${queryParams.length}`;
            if (params.userOrgId) {
              queryParams.push(params.userOrgId);
              sql += ` AND (recipient_organization_id = $${queryParams.length} OR metadata->>'buyerOrg' ILIKE $${queryParams.length})`;
            }
          } else if (role === 'FINANCIER') {
            queryParams.push('FINANCIER');
            sql += ` AND (recipient_role = $${queryParams.length} OR invoice_id IN (SELECT id FROM invoices WHERE financier_organization_id = $${queryParams.length}))`;
          }
        }

        // Filters
        if (params.filter === 'UPCOMING') {
          sql += ` AND interval_days < 0`;
        } else if (params.filter === 'DUE_TODAY') {
          sql += ` AND interval_days = 0`;
        } else if (params.filter === 'OVERDUE') {
          sql += ` AND interval_days > 0`;
        } else if (params.filter === 'UNREAD') {
          sql += ` AND is_read = FALSE`;
        }

        // Status
        if (params.status && params.status !== 'ALL') {
          queryParams.push(params.status);
          sql += ` AND status = $${queryParams.length}`;
        }

        // Search
        if (params.search && params.search.trim() !== '') {
          queryParams.push(`%${params.search.trim()}%`);
          sql += ` AND (invoice_number ILIKE $${queryParams.length} OR metadata::text ILIKE $${queryParams.length})`;
        }

        sql += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
        queryParams.push(limit, offset);

        const res = await query(sql, queryParams);
        if (res) {
          items = res.rows;
          return { items, total: res.rows.length };
        }
      } catch (err: any) {
        console.warn('PostgreSQL query reminders error:', err.message);
      }
    }

    // In-memory fallback with identical filtering & tenant isolation
    items = Array.from(inMemoryDb.invoiceReminders.values());

    if (!isConsortiumAuditor) {
      if (role === 'SUPPLIER') {
        items = items.filter(
          (r) =>
            r.recipient_role === 'SUPPLIER' &&
            (!params.userOrgName ||
              !r.metadata?.supplierOrg ||
              r.metadata.supplierOrg.toLowerCase().includes(params.userOrgName.toLowerCase()) ||
              r.recipient_organization_id === params.userOrgId)
        );
      } else if (role === 'BUYER') {
        items = items.filter(
          (r) =>
            r.recipient_role === 'BUYER' &&
            (!params.userOrgName ||
              !r.metadata?.buyerOrg ||
              r.metadata.buyerOrg.toLowerCase().includes(params.userOrgName.toLowerCase()) ||
              r.recipient_organization_id === params.userOrgId)
        );
      } else if (role === 'FINANCIER') {
        items = items.filter((r) => r.recipient_role === 'FINANCIER');
      }
    }

    if (params.filter === 'UPCOMING') {
      items = items.filter((r) => r.interval_days < 0);
    } else if (params.filter === 'DUE_TODAY') {
      items = items.filter((r) => r.interval_days === 0);
    } else if (params.filter === 'OVERDUE') {
      items = items.filter((r) => r.interval_days > 0);
    } else if (params.filter === 'UNREAD') {
      items = items.filter((r) => !r.is_read);
    }

    if (params.status && params.status !== 'ALL') {
      items = items.filter((r) => r.status === params.status);
    }

    if (params.search && params.search.trim() !== '') {
      const q = params.search.toLowerCase().trim();
      items = items.filter(
        (r) =>
          r.invoice_number.toLowerCase().includes(q) ||
          r.reminder_type.toLowerCase().includes(q) ||
          r.metadata?.buyerOrg?.toLowerCase().includes(q) ||
          r.metadata?.supplierOrg?.toLowerCase().includes(q)
      );
    }

    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const total = items.length;
    const paginated = items.slice(offset, offset + limit);

    return { items: paginated, total };
  }

  /**
   * Summary metrics for dashboard KPI cards
   */
  public static async getSummary(params: {
    userRole: string;
    userOrgId?: string;
    userOrgName?: string;
    userId?: string;
  }) {
    const { items: all } = await this.getReminders({
      userRole: params.userRole,
      userOrgId: params.userOrgId,
      userOrgName: params.userOrgName,
      userId: params.userId,
      filter: 'ALL',
      limit: 1000,
    });

    const upcoming = all.filter((r) => r.interval_days < 0);
    const dueToday = all.filter((r) => r.interval_days === 0);
    const overdue = all.filter((r) => r.interval_days > 0);
    const unread = all.filter((r) => !r.is_read);
    const deliveredEmails = all.filter((r) => r.email_delivery_status === 'DELIVERED' || r.email_delivery_status === 'MOCKED');
    const failedEmails = all.filter((r) => r.email_delivery_status === 'FAILED');

    return {
      totalReminders: all.length,
      upcomingCount: upcoming.length,
      dueTodayCount: dueToday.length,
      overdueCount: overdue.length,
      unreadCount: unread.length,
      deliveredEmailsCount: deliveredEmails.length,
      failedEmailsCount: failedEmails.length,
      emailConfigured: EmailService.isConfigured(),
    };
  }

  /**
   * Mark a reminder as read
   */
  public static async markAsRead(reminderId: string, userId?: string, orgId?: string): Promise<boolean> {
    const timestamp = new Date().toISOString();

    if (isDatabasePostgres()) {
      try {
        await query('UPDATE invoice_reminders SET is_read = TRUE, read_at = $1 WHERE id = $2', [timestamp, reminderId]);
      } catch (err: any) {
        console.warn('PostgreSQL mark reminder read error:', err.message);
      }
    }

    const item = inMemoryDb.invoiceReminders.get(reminderId);
    if (item) {
      item.is_read = true;
      item.read_at = timestamp;
      return true;
    }
    return false;
  }

  /**
   * Mark all reminders as read for active user/role
   */
  public static async markAllAsRead(params: { userRole: string; userOrgId?: string }): Promise<number> {
    const timestamp = new Date().toISOString();
    let count = 0;

    if (isDatabasePostgres()) {
      try {
        let sql = 'UPDATE invoice_reminders SET is_read = TRUE, read_at = $1 WHERE is_read = FALSE';
        const queryParams: any[] = [timestamp];
        if (params.userRole !== 'ADMIN' && params.userRole !== 'AUDITOR') {
          queryParams.push(params.userRole);
          sql += ` AND recipient_role = $${queryParams.length}`;
          if (params.userOrgId) {
            queryParams.push(params.userOrgId);
            sql += ` AND recipient_organization_id = $${queryParams.length}`;
          }
        }
        const res = await query(sql, queryParams);
        if (res) count = res.rowCount || 0;
      } catch (err: any) {
        console.warn('PostgreSQL mark all read error:', err.message);
      }
    }

    for (const r of inMemoryDb.invoiceReminders.values()) {
      if (!r.is_read) {
        if (params.userRole === 'ADMIN' || params.userRole === 'AUDITOR' || r.recipient_role === params.userRole) {
          r.is_read = true;
          r.read_at = timestamp;
          count++;
        }
      }
    }

    return count;
  }

  /**
   * Get reminder preferences for an organization or user
   */
  public static async getPreferences(userId: string, orgId: string): Promise<DbReminderPreference> {
    if (isDatabasePostgres()) {
      try {
        const res = await query(
          'SELECT * FROM reminder_preferences WHERE user_id = $1 OR organization_id = $2 LIMIT 1',
          [userId, orgId]
        );
        if (res && res.rows.length > 0) {
          return res.rows[0];
        }
      } catch (err: any) {
        console.warn('PostgreSQL get preferences error:', err.message);
      }
    }

    const pref = inMemoryDb.reminderPreferences.get(userId) || inMemoryDb.reminderPreferences.get(orgId);
    if (pref) return pref;

    // Default configuration: All 6 standard intervals enabled
    const defaultPref: DbReminderPreference = {
      id: `PREF-${uuidv4().slice(0, 8).toUpperCase()}`,
      user_id: userId,
      organization_id: orgId,
      email_enabled: true,
      in_app_enabled: true,
      enabled_intervals: [-7, -3, 0, 1, 3, 7],
      overdue_alerts_enabled: true,
      minimum_amount: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    inMemoryDb.reminderPreferences.set(userId, defaultPref);
    return defaultPref;
  }

  /**
   * Update reminder preferences
   */
  public static async updatePreferences(
    userId: string,
    orgId: string,
    updates: Partial<DbReminderPreference>
  ): Promise<DbReminderPreference> {
    const current = await this.getPreferences(userId, orgId);
    const updated: DbReminderPreference = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (isDatabasePostgres()) {
      try {
        await query(
          `INSERT INTO reminder_preferences (
            id, user_id, organization_id, email_enabled, in_app_enabled, enabled_intervals,
            overdue_alerts_enabled, minimum_amount, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (user_id) DO UPDATE SET
            email_enabled = EXCLUDED.email_enabled,
            in_app_enabled = EXCLUDED.in_app_enabled,
            enabled_intervals = EXCLUDED.enabled_intervals,
            overdue_alerts_enabled = EXCLUDED.overdue_alerts_enabled,
            minimum_amount = EXCLUDED.minimum_amount,
            updated_at = EXCLUDED.updated_at`,
          [
            updated.id,
            updated.user_id,
            updated.organization_id,
            updated.email_enabled,
            updated.in_app_enabled,
            JSON.stringify(updated.enabled_intervals),
            updated.overdue_alerts_enabled,
            updated.minimum_amount,
            updated.created_at,
            updated.updated_at,
          ]
        );
      } catch (err: any) {
        console.warn('PostgreSQL update preferences error:', err.message);
      }
    }

    inMemoryDb.reminderPreferences.set(userId, updated);
    return updated;
  }
}
