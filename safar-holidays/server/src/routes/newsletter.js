// /api/newsletter — footer sign-up for travel deals
import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { validate } from '../utils/http.js';

const router = Router();

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(120),
});

router.post('/', (req, res) => {
  const { email } = validate(schema, req.body);
  const result = db.prepare('INSERT OR IGNORE INTO subscribers (email) VALUES (?)').run(email);
  if (result.changes === 0) {
    return res.json({ message: 'You are already on our list. Thanks for staying with us!' });
  }
  res.status(201).json({ message: 'Subscribed! Watch your inbox for our next set of deals.' });
});

export default router;
