// /api/admin — dashboard numbers and management screens (admins only)
import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { notify, transactionId } from '../utils/bookings.js';
import { HttpError, cleanQuery, idParam, todayISO, validate } from '../utils/http.js';
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

  // Revenue and bookings for each of the last 6 months (by booking date)
  const monthly = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthly.push({ month: key, label: d.toLocaleString('en-IN', { month: 'short' }), revenue: 0, bookings: 0 });
  }
  const monthRows = db
    .prepare(
      `SELECT substr(created_at, 1, 7) AS month, COUNT(*) AS bookings,
              COALESCE(SUM(CASE WHEN status IN ('confirmed','completed') THEN total_amount END), 0) AS revenue
         FROM bookings WHERE created_at >= ? GROUP BY month`,
    )
    .all(`${monthly[0].month}-01`);
  for (const r of monthRows) {
    const m = monthly.find((x) => x.month === r.month);
    if (m) Object.assign(m, { revenue: r.revenue, bookings: r.bookings });
  }

  const payments = {
    paid: one(`SELECT COALESCE(SUM(total_amount), 0) AS n FROM bookings WHERE payment_status = 'paid'`).n,
    due: one(
      `SELECT COALESCE(SUM(total_amount), 0) AS n FROM bookings WHERE status = 'confirmed' AND payment_status = 'unpaid'`,
    ).n,
    refunded: one(`SELECT COALESCE(SUM(refund_amount), 0) AS n FROM bookings`).n,
  };

  const byCategory = db
    .prepare(
      `SELECT p.category, COUNT(b.id) AS bookings FROM bookings b JOIN packages p ON p.id = b.package_id
        WHERE b.status != 'cancelled' GROUP BY p.category ORDER BY bookings DESC`,
    )
    .all();

  const avgRating = one(`SELECT ROUND(COALESCE(AVG(rating), 0), 1) AS n FROM reviews`).n;
  totals.subscribers = one(`SELECT COUNT(*) AS n FROM subscribers`).n;
  totals.avgRating = avgRating;

  res.json({ totals, byStatus, topPackages, recentBookings, monthly, payments, byCategory });
});

/* ---------- Bookings ---------- */

const bookingFilter = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  payment: z.enum(['unpaid', 'paid', 'refunded']).optional(),
  search: z.string().trim().max(100).optional(),
});

function findBookings(query) {
  const q = validate(bookingFilter, cleanQuery(query));
  const where = ['1 = 1'];
  const params = {};
  if (q.status) {
    where.push('b.status = @status');
    params.status = q.status;
  }
  if (q.payment) {
    where.push('b.payment_status = @payment');
    params.payment = q.payment;
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
  return bookings;
}

router.get('/bookings', (req, res) => {
  res.json({ bookings: findBookings(req.query) });
});

/** Download the (filtered) bookings as a CSV file that opens in Excel. */
router.get('/bookings.csv', (req, res) => {
  const rows = findBookings(req.query);
  const cols = [
    ['booking_ref', 'Booking ref'],
    ['customer_name', 'Customer'],
    ['customer_email', 'Email'],
    ['contact_phone', 'Phone'],
    ['package_title', 'Package'],
    ['travel_date', 'Travel date'],
    ['adults', 'Adults'],
    ['children', 'Children'],
    ['coupon_code', 'Coupon'],
    ['discount_amount', 'Discount'],
    ['total_amount', 'Total (INR)'],
    ['status', 'Status'],
    ['payment_status', 'Payment'],
    ['refund_amount', 'Refund'],
    ['created_at', 'Booked on'],
  ];
  const esc = (v) => {
    const text = String(v ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = [cols.map((c) => c[1]).join(','), ...rows.map((r) => cols.map(([k]) => esc(r[k])).join(','))].join('\r\n');
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="bookings-${todayISO()}.csv"`,
  });
  res.send('\uFEFF' + csv);
});

const STATUS_MESSAGES = {
  confirmed: (b) => [`Booking confirmed`, `Good news! ${b.booking_ref} is confirmed. You can now pay online from My trips.`],
  completed: (b) => [`Hope you enjoyed the trip`, `${b.booking_ref} is marked as completed. Tell other travellers how it went with a review.`],
  cancelled: (b) => [`Booking cancelled by Safar`, `${b.booking_ref} was cancelled by our team. Any amount paid is refunded in full.`],
  pending: (b) => [`Booking under review`, `${b.booking_ref} is back under review. We will update you soon.`],
};

router.patch('/bookings/:id', (req, res) => {
  const id = idParam(req.params.id, 'booking id');
  const { status } = validate(z.object({ status: z.enum(BOOKING_STATUSES) }), req.body);
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  if (!booking) throw new HttpError(404, 'Booking not found.');
  if (booking.status === status) return res.json({ id, status, payment_status: booking.payment_status });

  db.exec('BEGIN');
  try {
    if (status === 'cancelled' && booking.payment_status === 'paid') {
      // Cancelled by the agency: refund everything that was paid.
      db.prepare(
        `UPDATE bookings SET status = 'cancelled', cancelled_at = datetime('now'),
                refund_amount = total_amount, payment_status = 'refunded' WHERE id = ?`,
      ).run(id);
      db.prepare(
        `INSERT INTO payments (booking_id, amount, method, reference, transaction_id, kind)
         SELECT booking_id, amount, method, reference, ?, 'refund' FROM payments
          WHERE booking_id = ? AND kind = 'payment' ORDER BY id DESC LIMIT 1`,
      ).run(transactionId('RFD'), id);
    } else {
      db.prepare(
        `UPDATE bookings SET status = ?, cancelled_at = CASE WHEN ? = 'cancelled' THEN datetime('now') ELSE cancelled_at END
          WHERE id = ?`,
      ).run(status, status, id);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  const [title, message] = STATUS_MESSAGES[status](booking);
  notify(booking.user_id, title, message, status === 'completed' ? '/trips' : '/trips');
  const updated = db.prepare('SELECT status, payment_status, refund_amount FROM bookings WHERE id = ?').get(id);
  res.json({ id, ...updated });
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
  const data = validate(
    z.object({
      status: z.enum(['new', 'resolved']).optional(),
      admin_note: z.string().trim().max(1000, 'Note is too long').optional(),
    }),
    req.body,
  );
  const current = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(id);
  if (!current) throw new HttpError(404, 'Enquiry not found.');
  const status = data.status ?? current.status;
  const note = data.admin_note ?? current.admin_note;
  db.prepare('UPDATE enquiries SET status = ?, admin_note = ? WHERE id = ?').run(status, note, id);
  res.json({ id, status, admin_note: note });
});

/* ---------- Coupons ---------- */

const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{3,20}$/, 'Code must be 3 to 20 letters or numbers'),
    description: z.string().trim().max(160).default(''),
    discount_type: z.enum(['percent', 'flat']),
    discount_value: z.coerce.number().int().min(1, 'Discount must be at least 1'),
    min_amount: z.coerce.number().int().min(0).default(0),
    max_discount: z.coerce.number().int().min(0).default(0),
    valid_until: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid end date')
      .or(z.literal(''))
      .default(''),
    usage_limit: z.coerce.number().int().min(0).default(0),
    is_active: z.boolean().default(true),
  })
  .refine((c) => c.discount_type !== 'percent' || c.discount_value <= 90, {
    message: 'A percentage discount cannot be more than 90%',
  });

const COUPON_SELECT = `
  SELECT c.*, (SELECT COUNT(*) FROM bookings b WHERE b.coupon_code = c.code AND b.status != 'cancelled') AS times_used,
         (SELECT COALESCE(SUM(discount_amount), 0) FROM bookings b WHERE b.coupon_code = c.code AND b.status != 'cancelled') AS total_discount
    FROM coupons c`;

const couponOut = (c) => ({ ...c, is_active: Boolean(c.is_active) });

router.get('/coupons', (_req, res) => {
  res.json({ coupons: db.prepare(`${COUPON_SELECT} ORDER BY c.is_active DESC, c.created_at DESC`).all().map(couponOut) });
});

router.post('/coupons', (req, res) => {
  const data = validate(couponSchema, req.body);
  if (db.prepare('SELECT 1 FROM coupons WHERE code = ?').get(data.code)) {
    throw new HttpError(409, `Coupon ${data.code} already exists.`);
  }
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO coupons (code, description, discount_type, discount_value, min_amount, max_discount, valid_until, usage_limit, is_active)
       VALUES (@code, @description, @discount_type, @discount_value, @min_amount, @max_discount, @valid_until, @usage_limit, @is_active)`,
    )
    .run({ ...data, is_active: data.is_active ? 1 : 0 });
  res.status(201).json({ coupon: couponOut(db.prepare(`${COUPON_SELECT} WHERE c.id = ?`).get(lastInsertRowid)) });
});

router.put('/coupons/:id', (req, res) => {
  const id = idParam(req.params.id, 'coupon id');
  const data = validate(couponSchema, req.body);
  const clash = db.prepare('SELECT 1 FROM coupons WHERE code = ? AND id != ?').get(data.code, id);
  if (clash) throw new HttpError(409, `Coupon ${data.code} already exists.`);
  const result = db
    .prepare(
      `UPDATE coupons SET code = @code, description = @description, discount_type = @discount_type,
         discount_value = @discount_value, min_amount = @min_amount, max_discount = @max_discount,
         valid_until = @valid_until, usage_limit = @usage_limit, is_active = @is_active WHERE id = @id`,
    )
    .run({ ...data, is_active: data.is_active ? 1 : 0, id });
  if (result.changes === 0) throw new HttpError(404, 'Coupon not found.');
  res.json({ coupon: couponOut(db.prepare(`${COUPON_SELECT} WHERE c.id = ?`).get(id)) });
});

router.delete('/coupons/:id', (req, res) => {
  const id = idParam(req.params.id, 'coupon id');
  const result = db.prepare('DELETE FROM coupons WHERE id = ?').run(id);
  if (result.changes === 0) throw new HttpError(404, 'Coupon not found.');
  res.json({ deleted: true });
});

/* ---------- Newsletter subscribers ---------- */

router.get('/subscribers', (_req, res) => {
  const subscribers = db
    .prepare(
      `SELECT s.*, u.name AS customer_name FROM subscribers s LEFT JOIN users u ON u.email = s.email
        ORDER BY s.created_at DESC, s.id DESC`,
    )
    .all();
  res.json({ subscribers });
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
