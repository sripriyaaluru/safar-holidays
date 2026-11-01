// /api/enquiries — the public contact form
import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { phoneSchema, validate } from '../utils/http.js';

const router = Router();

const enquirySchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  phone: phoneSchema.optional().or(z.literal('')).default(''),
  subject: z.string().trim().min(3, 'Add a short subject').max(120),
  message: z.string().trim().min(10, 'Tell us a little more (at least 10 characters)').max(2000),
});

router.post('/', (req, res) => {
  const data = validate(enquirySchema, req.body);
  db.prepare('INSERT INTO enquiries (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)').run(
    data.name,
    data.email,
    data.phone,
    data.subject,
    data.message,
  );
  res.status(201).json({ message: 'Thanks! Our travel team will reply within one working day.' });
});

export default router;
