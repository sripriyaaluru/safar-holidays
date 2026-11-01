// /api/wishlist — packages a user has saved for later
import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError, idParam } from '../utils/http.js';
import { PACKAGE_SELECT, toCard } from '../utils/packages.js';

const router = Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `${PACKAGE_SELECT} JOIN wishlist w ON w.package_id = p.id
       WHERE w.user_id = ? AND p.is_active = 1 ORDER BY w.created_at DESC`,
    )
    .all(req.user.id);
  res.json({ packages: rows.map(toCard) });
});

router.post('/:packageId', (req, res) => {
  const packageId = idParam(req.params.packageId, 'package id');
  if (!db.prepare('SELECT 1 FROM packages WHERE id = ? AND is_active = 1').get(packageId)) {
    throw new HttpError(404, 'We could not find that package.');
  }
  db.prepare('INSERT OR IGNORE INTO wishlist (user_id, package_id) VALUES (?, ?)').run(req.user.id, packageId);
  res.status(201).json({ saved: true });
});

router.delete('/:packageId', (req, res) => {
  const packageId = idParam(req.params.packageId, 'package id');
  db.prepare('DELETE FROM wishlist WHERE user_id = ? AND package_id = ?').run(req.user.id, packageId);
  res.json({ saved: false });
});

export default router;
