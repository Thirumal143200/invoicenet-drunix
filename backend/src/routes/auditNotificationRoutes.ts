import { Router } from 'express';
import { AuditNotificationController } from '../controllers/auditNotificationController';
import { optionalAuth } from '../middleware/authMiddleware';

const router = Router();

router.use(optionalAuth);

// Audit logs
router.get('/audit-logs', AuditNotificationController.getAuditLogs);

// Notifications
router.get('/notifications', AuditNotificationController.getNotifications);
router.put('/notifications/:id/read', AuditNotificationController.markRead);
router.put('/notifications/read-all', AuditNotificationController.markAllRead);

export default router;
