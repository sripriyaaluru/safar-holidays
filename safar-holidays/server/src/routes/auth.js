// /api/auth — register, login and "who am I"
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import db from '../db.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { HttpError, phoneSchema, validate } from '../utils/http.js';

const router = Router();

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

router.post('/login', (req, res) => {
  const data = validate(loginSchema, req.body);
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(data.email);

  if (!user || !bcrypt.compareSync(data.password, user.password_hash)) {
    throw new HttpError(401, 'Email or password is incorrect.');
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
