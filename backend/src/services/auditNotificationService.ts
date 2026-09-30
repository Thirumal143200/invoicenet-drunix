import { v4 as uuidv4 } from 'uuid';
import { inMemoryDb, isDatabasePostgres, query, DbAuditLog, DbNotification } from '../db';

export class AuditNotificationService {
  /**
   * Log an immutable audit event
   */
  public static async logAudit(params: {
    userId?: string;
    userName?: string;
    organizationId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    metadata?: any;
    ipAddress?: string;
  }): Promise<DbAuditLog> {
    const log: DbAuditLog = {
      id: `AUDIT-${uuidv4().slice(0, 10).toUpperCase()}`,
      user_id: params.userId,
      user_name: params.userName,
      organization_id: params.organizationId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      metadata: params.metadata || {},
      ip_address: params.ipAddress,
      created_at: new Date().toISOString(),
    };

    if (isDatabasePostgres()) {
      try {
        await query(
          `INSERT INTO audit_logs (id, user_id, user_name, organization_id, action, entity_type, entity_id, metadata, ip_address, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [log.id, log.user_id, log.user_name, log.organization_id, log.action, log.entity_type, log.entity_id, JSON.stringify(log.metadata), log.ip_address, log.created_at]
        );
      } catch (err: any) {
        console.warn('Postgres audit log write failed, keeping in memory:', err.message);
      }
    }

    inMemoryDb.auditLogs.unshift(log);
    return log;
  }

  /**
   * Query audit logs with role and org boundaries
   */
  public static async getAuditLogs(params: {
    userRole: string;
    userOrgId: string;
    entityType?: string;
    limit?: number;
  }): Promise<DbAuditLog[]> {
    const limit = params.limit || 50;
    const isConsortiumAuditor = params.userRole === 'AUDITOR' || params.userRole === 'ADMIN' || params.userRole === 'EXPLORER';

    if (isDatabasePostgres()) {
      try {
        if (isConsortiumAuditor) {
          const res = await query(
            'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1',
            [limit]
          );
          if (res) return res.rows;
        } else {
          const res = await query(
            'SELECT * FROM audit_logs WHERE organization_id = $1 ORDER BY created_at DESC LIMIT $2',
            [params.userOrgId, limit]
          );
          if (res) return res.rows;
        }
      } catch (err: any) {
        console.warn('Postgres query audit logs error:', err.message);
      }
    }

    // In-memory fallback
    if (isConsortiumAuditor) {
      return inMemoryDb.auditLogs.slice(0, limit);
    }
    return inMemoryDb.auditLogs
      .filter((l) => l.organization_id === params.userOrgId)
      .slice(0, limit);
  }

  /**
   * Send an in-app notification to a user or all members of an organization
   */
  public static async notify(params: {
    userId?: string;
    organizationId?: string;
    title: string;
    message: string;
    notificationType: string;
    link?: string;
  }): Promise<DbNotification[]> {
    const createdNotifications: DbNotification[] = [];
    const targetUserIds: string[] = [];

    if (params.userId) {
      targetUserIds.push(params.userId);
    } else if (params.organizationId) {
      // Find all users in this org
      for (const u of inMemoryDb.users.values()) {
        if (u.organization_id === params.organizationId) {
          targetUserIds.push(u.id);
        }
      }
    } else {
      // Default: notify all active consortium users
      for (const u of inMemoryDb.users.values()) {
        targetUserIds.push(u.id);
      }
    }

    for (const uid of targetUserIds) {
      const notif: DbNotification = {
        id: `NOTIF-${uuidv4().slice(0, 10).toUpperCase()}`,
        user_id: uid,
        organization_id: params.organizationId,
        title: params.title,
        message: params.message,
        notification_type: params.notificationType,
        link: params.link,
        is_read: false,
        created_at: new Date().toISOString(),
      };

      if (isDatabasePostgres()) {
        try {
          await query(
            `INSERT INTO notifications (id, user_id, organization_id, title, message, notification_type, link, is_read, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [notif.id, notif.user_id, notif.organization_id, notif.title, notif.message, notif.notification_type, notif.link, notif.is_read, notif.created_at]
          );
        } catch (err: any) {
          console.warn('Postgres notification write failed:', err.message);
        }
      }

      inMemoryDb.notifications.unshift(notif);
      createdNotifications.push(notif);
    }

    return createdNotifications;
  }

  /**
   * Get notifications for a user
   */
  public static async getUserNotifications(userId: string): Promise<DbNotification[]> {
    if (isDatabasePostgres()) {
      try {
        const res = await query(
          'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30',
          [userId]
        );
        if (res) return res.rows;
      } catch (err: any) {
        console.warn('Postgres get notifications error:', err.message);
      }
    }

    return inMemoryDb.notifications.filter((n) => n.user_id === userId);
  }

  /**
   * Mark notification as read
   */
  public static async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    if (isDatabasePostgres()) {
      try {
        await query(
          'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
          [notificationId, userId]
        );
      } catch (err: any) {
        console.warn('Postgres mark notification read error:', err.message);
      }
    }

    const notif = inMemoryDb.notifications.find((n) => n.id === notificationId && n.user_id === userId);
    if (notif) {
      notif.is_read = true;
      return true;
    }
    return false;
  }

  /**
   * Mark all notifications as read for a user
   */
  public static async markAllAsRead(userId: string): Promise<number> {
    if (isDatabasePostgres()) {
      try {
        await query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [userId]);
      } catch (err: any) {
        console.warn('Postgres mark all read error:', err.message);
      }
    }

    let count = 0;
    for (const n of inMemoryDb.notifications) {
      if (n.user_id === userId && !n.is_read) {
        n.is_read = true;
        count++;
      }
    }
    return count;
  }
}
