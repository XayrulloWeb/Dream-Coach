import { Router } from 'express';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../controllers/notification.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.get('/', listNotifications);
router.post('/read-all', markAllNotificationsRead);
router.post('/:id/read', markNotificationRead);

export default router;
