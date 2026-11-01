// /api/admin — dashboard numbers and management screens (admins only)
import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { HttpError, cleanQuery, idParam, validate } from '../utils/http.js';
import { PACKAGE_SELECT, toDetail } from '../utils/packages.js';

const router = Router();
router.use(requireAdmin);

const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];

/* ---------- Dashboard ---------- */

router.get('/stats', (_req, res) => {
  const one = (sql) => db.prepare(sql).get();

  const totals = {
    packages: one(`SELECT COUNT(*) AS n FROM packages WHERE is_active = 1`).n,
    customers: one(`SELECT COUNT(*) AS n FROM users WHERE role = 'user'`).n,
    bookings: one(`SELECT COUNT(*) AS n FROM bookings`).n,
    pendingBookings: one(`SELECT COUNT(*) AS n FROM bookings WHERE status = 'pending'`).n,
    revenue: one(`SELECT COALESCE(SUM(total_amount), 0) AS n FROM bookings WHERE status IN ('confirmed', 'completed')`).n,
    newEnquiries: one(`SELECT COUNT(*) AS n FROM enquiries WHERE status = 'new'`).n,
  };

  const byStatus = Object.fromEntries(BOOKING_STATUSES.map((s) => [s, 0]));
  for (const row of db.prepare(`SELECT status, COUNT(*) AS n FROM bookings GROUP BY status`).all()) {
    byStatus[row.status] = row.n;
  }

  const topPackages = db
    .prepare(
      `SELECT p.id, p.title, p.slug, COUNT(b.id) AS bookings,
              COALESCE(SUM(CASE WHEN b.status IN ('confirmed','completed') THEN b.total_amount END), 0) AS revenue
         FROM packages p JOIN bookings b ON b.package_id = p.id AND b.status != 'cancelled'
        GROUP BY p.id ORDER BY bookings DESC, revenue DESC LIMIT 5`,
    )
    .all();

  const recentBookings = db
    .prepare(
      `SELECT b.id, b.booking_ref, b.status, b.total_amount, b.travel_date, b.created_at,
              u.name AS customer_name, p.title AS package_title
         FROM bookings b JOIN users u ON u.id = b.user_id JOIN packages p ON p.id = b.package_id
        ORDER BY b.created_at DESC, b.id DESC LIMIT 6`,
    )
    .all();

  res.json({ totals, byStatus, topPackages, recentBookings });
});

/* ---------- Bookings ---------- */

const bookingFilter = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  search: z.string().trim().max(100).optional(),
});

router.get('/bookings', (req, res) => {
  const q = validate(bookingFilter, cleanQuery(req.query));
  const where = ['1 = 1'];
  const params = {};
  if (q.status) {
    where.push('b.status = @status');
    params.status = q.status;
  }
  if (q.search) {
    where.push('(b.booking_ref LIKE @s OR u.name LIKE @s OR u.email LIKE @s OR p.title LIKE @s)');
    params.s = `%${q.search}%`;
  }
  const bookings = db
    .prepare(
      `SELECT b.*, u.name AS customer_name, u.email AS customer_email,
              p.title AS package_title, p.slug AS package_slug
         FROM bookings b JOIN users u ON u.id = b.user_id JOIN packages p ON p.id = b.package_id
        WHERE ${where.join(' AND ')}
        ORDER BY b.created_at DESC, b.id DESC`,
    )
    .all(params);
  res.json({ bookings });
});

router.patch('/bookings/:id', (req, res) => {
  const id = idParam(req.params.id, 'booking id');
  const { status } = validate(z.object({ status: z.enum(BOOKING_STATUSES) }), req.body);
  const result = db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, id);
  if (result.changes === 0) throw new HttpError(404, 'Booking not found.');
  res.json({ id, status });
});

/* ---------- Packages (including hidden ones) ---------- */

router.get('/packages', (_req, res) => {
  const packages = db.prepare(`${PACKAGE_SELECT} ORDER BY p.is_active DESC, p.created_at DESC, p.id DESC`).all();
  res.json({ packages: packages.map(toDetail) });
});

/* ---------- Enquiries ---------- */

router.get('/enquiries', (_req, res) => {
  const enquiries = db
    .prepare(`SELECT * FROM enquiries ORDER BY CASE status WHEN 'new' THEN 0 ELSE 1 END, created_at DESC, id DESC`)
    .all();
  res.json({ enquiries });
});

router.patch('/enquiries/:id', (req, res) => {
  const id = idParam(req.params.id, 'enquiry id');
  const { status } = validate(z.object({ status: z.enum(['new', 'resolved']) }), req.body);
  const result = db.prepare('UPDATE enquiries SET status = ? WHERE id = ?').run(status, id);
  if (result.changes === 0) throw new HttpError(404, 'Enquiry not found.');
  res.json({ id, status });
});

/* ---------- Customers ---------- */

router.get('/users', (_req, res) => {
  const users = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at,
              COUNT(b.id) AS bookings,
              COALESCE(SUM(CASE WHEN b.status IN ('confirmed','completed') THEN b.total_amount END), 0) AS total_spent
         FROM users u LEFT JOIN bookings b ON b.user_id = u.id
        GROUP BY u.id ORDER BY u.created_at DESC, u.id DESC`,
    )
    .all();
  res.json({ users });
});

export default router;
