// /api/coupons — public list of current offers shown on the home page
import { Router } from 'express';
import db from '../db.js';
import { todayISO } from '../utils/http.js';

const router = Router();

router.get('/', (_req, res) => {
  const coupons = db
    .prepare(
      `SELECT code, description, discount_type, discount_value, min_amount, max_discount, valid_until
         FROM coupons
        WHERE is_active = 1 AND (valid_until IS NULL OR valid_until = '' OR valid_until >= ?)
        ORDER BY discount_value DESC`,
    )
    .all(todayISO());
  res.json({ coupons });
});

export default router;
