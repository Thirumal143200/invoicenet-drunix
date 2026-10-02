import { Router } from 'express';
import { ReminderController } from '../controllers/reminderController';
import { optionalAuth } from '../middleware/authMiddleware';

const router = Router();

router.use(optionalAuth);

// Summary metrics & scheduler health
router.get('/summary', ReminderController.getSummary);
router.get('/scheduler', ReminderController.getSchedulerStatus);

// On-demand evaluation trigger
router.post('/process', ReminderController.processReminders);

// Preferences
router.get('/preferences', ReminderController.getPreferences);
router.put('/preferences', ReminderController.updatePreferences);

// Read actions
router.put('/read-all', ReminderController.markAllRead);
router.put('/:id/read', ReminderController.markRead);

// List reminders (supports ?filter=UPCOMING|DUE_TODAY|OVERDUE|UNREAD&status=...&search=...)
router.get('/', ReminderController.getReminders);

export default router;
