// /api/notifications — in-site messages about bookings and payments
import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError, idParam } from '../utils/http.js';

const router = Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const notifications = db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 20')
    .all(req.user.id)
    .map((n) => ({ ...n, is_read: Boolean(n.is_read) }));
  const { unread } = db
    .prepare('SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0')
    .get(req.user.id);
  res.json({ notifications, unread });
});

router.patch('/:id/read', (req, res) => {
  const id = idParam(req.params.id, 'notification id');
  const result = db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, req.user.id);
  if (result.changes === 0) throw new HttpError(404, 'Notification not found.');
  res.json({ id, is_read: true });
});

router.post('/read-all', (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ unread: 0 });
});

export default router;
