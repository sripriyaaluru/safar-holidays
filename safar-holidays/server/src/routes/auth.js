// /api/auth — register, login and "who am I"
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import db from '../db.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { createAttemptLimiter } from '../middleware/security.js';
import { HttpError, phoneSchema, validate } from '../utils/http.js';

const router = Router();
const loginLimiter = createAttemptLimiter({ max: 8, windowMs: 15 * 60 * 1000 });

const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address');

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(80, 'Name is too long'),
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters').max(72, 'Password is too long'),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password'),
});

const publicUser = ({ id, name, email, phone, role, created_at }) => ({ id, name, email, phone, role, created_at });

router.post('/register', (req, res) => {
  const data = validate(registerSchema, req.body);

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(data.email);
  if (exists) throw new HttpError(409, 'An account with this email already exists. Try logging in.');

  const hash = bcrypt.hashSync(data.password, 10);
  const { lastInsertRowid } = db
    .prepare('INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)')
    .run(data.name, data.email, data.phone || '', hash);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(lastInsertRowid);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

router.post('/login', loginLimiter.guard, (req, res) => {
  const data = validate(loginSchema, req.body);
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(data.email);

  if (!user || !bcrypt.compareSync(data.password, user.password_hash)) {
    loginLimiter.fail(req);
    throw new HttpError(401, 'Email or password is incorrect.');
  }
  loginLimiter.reset(req);
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

/* ---------- Profile ---------- */

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(80, 'Name is too long'),
  phone: phoneSchema.optional().or(z.literal('')).default(''),
});

router.put('/me', requireAuth, (req, res) => {
  const data = validate(profileSchema, req.body);
  db.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?').run(data.name, data.phone, req.user.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: publicUser(user) });
});

const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Enter your current password'),
    new_password: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .max(72, 'Password is too long')
      .regex(/[A-Za-z]/, 'New password needs at least one letter')
      .regex(/[0-9]/, 'New password needs at least one number'),
  })
  .refine((d) => d.current_password !== d.new_password, { message: 'New password must be different from the current one' });

router.put('/password', requireAuth, (req, res) => {
  const data = validate(passwordSchema, req.body);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(data.current_password, user.password_hash)) {
    throw new HttpError(400, 'Current password is incorrect.');
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(data.new_password, 10), user.id);
  res.json({ message: 'Password changed.' });
});

/** Numbers shown on the profile page. */
router.get('/me/summary', requireAuth, (req, res) => {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS bookings,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
              SUM(CASE WHEN status IN ('pending','confirmed') AND travel_date >= date('now') THEN 1 ELSE 0 END) AS upcoming,
              COALESCE(SUM(CASE WHEN status IN ('confirmed','completed') THEN total_amount END), 0) AS spent,
              COALESCE(SUM(discount_amount), 0) AS saved
         FROM bookings WHERE user_id = ?`,
    )
    .get(req.user.id);
  const reviews = db.prepare('SELECT COUNT(*) AS n FROM reviews WHERE user_id = ?').get(req.user.id).n;
  const wishlist = db.prepare('SELECT COUNT(*) AS n FROM wishlist WHERE user_id = ?').get(req.user.id).n;
  // Loyalty tier based on completed trips
  const completed = row.completed || 0;
  const tier = completed >= 5 ? 'Gold' : completed >= 2 ? 'Silver' : 'Explorer';
  res.json({ ...row, completed, upcoming: row.upcoming || 0, reviews, wishlist, tier });
});

export default router;
