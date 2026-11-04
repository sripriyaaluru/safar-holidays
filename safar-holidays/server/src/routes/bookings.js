// /api/bookings — logged-in users book trips, apply coupons, pay, see and cancel their bookings
import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import {
  applyCoupon,
  expiryValid,
  luhnValid,
  notify,
  refundFor,
  transactionId,
} from '../utils/bookings.js';
import { HttpError, idParam, phoneSchema, todayISO, validate } from '../utils/http.js';
import { calculateTotal } from '../utils/packages.js';

const router = Router();
router.use(requireAuth);

const MIN_DAYS_AHEAD = 3;

const bookingSchema = z.object({
  package_id: z.coerce.number().int().positive('Choose a package'),
  travel_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a travel date'),
  adults: z.coerce.number().int().min(1, 'At least one adult must travel').max(30),
  children: z.coerce.number().int().min(0).max(30).default(0),
  contact_phone: phoneSchema,
  special_requests: z.string().trim().max(500, 'Special requests are too long').default(''),
  coupon_code: z.string().trim().max(30).default(''),
});

export const BOOKING_SELECT = `
  SELECT b.*, p.title AS package_title, p.slug AS package_slug, p.destination, p.country,
         p.image_url, p.duration_days, p.price AS price_per_person
    FROM bookings b JOIN packages p ON p.id = b.package_id
`;

function newBookingRef() {
  let ref;
  do {
    ref = 'SFR-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  } while (db.prepare('SELECT 1 FROM bookings WHERE booking_ref = ?').get(ref));
  return ref;
}

function isRealDate(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

/** Loads a booking that belongs to the current user (admins may load any booking). */
function ownBooking(req, id) {
  const booking =
    req.user.role === 'admin'
      ? db.prepare(`${BOOKING_SELECT} WHERE b.id = ?`).get(id)
      : db.prepare(`${BOOKING_SELECT} WHERE b.id = ? AND b.user_id = ?`).get(id, req.user.id);
  if (!booking) throw new HttpError(404, 'Booking not found.');
  return booking;
}

/* ---------- Check a coupon before booking ---------- */

const quoteSchema = z.object({
  package_id: z.coerce.number().int().positive(),
  adults: z.coerce.number().int().min(1).max(30),
  children: z.coerce.number().int().min(0).max(30).default(0),
  coupon_code: z.string().trim().min(1, 'Enter a coupon code').max(30),
});

router.post('/quote', (req, res) => {
  const data = validate(quoteSchema, req.body);
  const pkg = db.prepare('SELECT * FROM packages WHERE id = ? AND is_active = 1').get(data.package_id);
  if (!pkg) throw new HttpError(404, 'This package is no longer available.');
  const subtotal = calculateTotal(pkg.price, data.adults, data.children);
  const { coupon, discount } = applyCoupon(data.coupon_code, subtotal, req.user.id);
  res.json({
    code: coupon.code,
    description: coupon.description,
    subtotal,
    discount,
    total: subtotal - discount,
  });
});

/* ---------- Create a booking ---------- */

router.post('/', (req, res) => {
  const data = validate(bookingSchema, req.body);

  const pkg = db.prepare('SELECT * FROM packages WHERE id = ? AND is_active = 1').get(data.package_id);
  if (!pkg) throw new HttpError(404, 'This package is no longer available.');

  if (!isRealDate(data.travel_date)) throw new HttpError(400, 'Choose a valid travel date.');
  if (data.travel_date < todayISO(MIN_DAYS_AHEAD)) {
    throw new HttpError(400, `Trips must start at least ${MIN_DAYS_AHEAD} days from today.`);
  }
  if (data.travel_date > todayISO(365)) throw new HttpError(400, 'You can book up to one year ahead.');

  const travellers = data.adults + data.children;
  if (travellers > pkg.max_group_size) {
    throw new HttpError(400, `This trip takes up to ${pkg.max_group_size} travellers per booking.`);
  }

  // The same person cannot hold two active bookings for the same trip on the same day.
  const duplicate = db
    .prepare(
      `SELECT booking_ref FROM bookings
        WHERE user_id = ? AND package_id = ? AND travel_date = ? AND status IN ('pending', 'confirmed')`,
    )
    .get(req.user.id, pkg.id, data.travel_date);
  if (duplicate) {
    throw new HttpError(409, `You already have booking ${duplicate.booking_ref} for this trip on that date.`);
  }

  const subtotal = calculateTotal(pkg.price, data.adults, data.children);
  const { coupon, discount } = applyCoupon(data.coupon_code, subtotal, req.user.id);
  const ref = newBookingRef();

  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO bookings (booking_ref, user_id, package_id, travel_date, adults, children,
                             contact_phone, special_requests, total_amount, coupon_code, discount_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      ref,
      req.user.id,
      pkg.id,
      data.travel_date,
      data.adults,
      data.children,
      data.contact_phone,
      data.special_requests,
      subtotal - discount,
      coupon ? coupon.code : '',
      discount,
    );

  notify(
    req.user.id,
    'Booking received',
    `We received booking ${ref} for ${pkg.title}. We will confirm availability within 24 hours.`,
    '/trips',
  );

  const booking = db.prepare(`${BOOKING_SELECT} WHERE b.id = ?`).get(lastInsertRowid);
  res.status(201).json({ booking });
});

/* ---------- My bookings ---------- */

router.get('/my', (req, res) => {
  const bookings = db
    .prepare(`${BOOKING_SELECT} WHERE b.user_id = ? ORDER BY b.created_at DESC, b.id DESC`)
    .all(req.user.id);
  res.json({ bookings });
});

router.get('/:id', (req, res) => {
  const booking = ownBooking(req, idParam(req.params.id, 'booking id'));
  const payments = db.prepare('SELECT * FROM payments WHERE booking_id = ? ORDER BY id').all(booking.id);
  const customer = db.prepare('SELECT name, email, phone FROM users WHERE id = ?').get(booking.user_id);
  res.json({ booking, payments, customer, refundQuote: refundFor(booking) });
});

/* ---------- Pay for a confirmed booking (simulated payment gateway) ---------- */

const paymentSchema = z.discriminatedUnion('method', [
  z.object({
    method: z.literal('card'),
    card_name: z.string().trim().min(2, 'Enter the name on the card').max(80),
    card_number: z.string().trim().regex(/^[0-9 ]{12,23}$/, 'Enter a valid card number'),
    expiry: z.string().trim().regex(/^\d{2}\/\d{2}$/, 'Expiry must look like MM/YY'),
    cvv: z.string().trim().regex(/^\d{3,4}$/, 'CVV must be 3 or 4 digits'),
  }),
  z.object({
    method: z.literal('upi'),
    upi_id: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9._-]{2,256}@[a-z]{2,64}$/, 'Enter a valid UPI ID such as name@okbank'),
  }),
]);

router.post('/:id/pay', (req, res) => {
  const id = idParam(req.params.id, 'booking id');
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!booking) throw new HttpError(404, 'Booking not found.');
  if (booking.status !== 'confirmed') {
    throw new HttpError(400, 'You can pay once our team has confirmed the booking.');
  }
  if (booking.payment_status === 'paid') throw new HttpError(400, 'This booking is already paid.');

  const data = validate(paymentSchema, req.body);
  let reference;
  if (data.method === 'card') {
    const digits = data.card_number.replace(/\D/g, '');
    if (!luhnValid(digits)) throw new HttpError(400, 'Card number is not valid. Please check it.');
    if (!expiryValid(data.expiry)) throw new HttpError(400, 'This card has expired.');
    // Test card that the simulated bank always declines.
    if (digits === '4000000000000002') throw new HttpError(402, 'Payment declined by the bank. Try another card.');
    reference = `Card ending ${digits.slice(-4)}`;
  } else {
    reference = `UPI ${data.upi_id}`;
  }

  const txn = transactionId('PAY');
  db.exec('BEGIN');
  try {
    db.prepare(
      'INSERT INTO payments (booking_id, amount, method, reference, transaction_id) VALUES (?, ?, ?, ?, ?)',
    ).run(id, booking.total_amount, data.method, reference, txn);
    db.prepare(`UPDATE bookings SET payment_status = 'paid', paid_at = datetime('now') WHERE id = ?`).run(id);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  notify(
    req.user.id,
    'Payment successful',
    `₹${booking.total_amount.toLocaleString('en-IN')} received for ${booking.booking_ref}. Your invoice is ready.`,
    `/trips/${id}/invoice`,
  );

  const updated = db.prepare(`${BOOKING_SELECT} WHERE b.id = ?`).get(id);
  res.status(201).json({ booking: updated, transaction_id: txn });
});

/* ---------- Cancel ---------- */

router.patch('/:id/cancel', (req, res) => {
  const id = idParam(req.params.id, 'booking id');
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!booking) throw new HttpError(404, 'Booking not found.');
  if (!['pending', 'confirmed'].includes(booking.status)) {
    throw new HttpError(400, `A ${booking.status} booking cannot be cancelled.`);
  }
  if (booking.travel_date <= todayISO()) throw new HttpError(400, 'Trips that have already started cannot be cancelled.');

  const refund = refundFor(booking);
  db.exec('BEGIN');
  try {
    db.prepare(
      `UPDATE bookings SET status = 'cancelled', cancelled_at = datetime('now'), refund_amount = ?,
              payment_status = CASE WHEN payment_status = 'paid' AND ? > 0 THEN 'refunded' ELSE payment_status END
        WHERE id = ?`,
    ).run(refund.amount, refund.amount, id);
    if (refund.amount > 0) {
      db.prepare(
        `INSERT INTO payments (booking_id, amount, method, reference, transaction_id, kind)
         SELECT booking_id, ?, method, reference, ?, 'refund' FROM payments
          WHERE booking_id = ? AND kind = 'payment' ORDER BY id DESC LIMIT 1`,
      ).run(refund.amount, transactionId('RFD'), id);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  notify(
    req.user.id,
    'Booking cancelled',
    refund.amount > 0
      ? `${booking.booking_ref} was cancelled. A refund of ₹${refund.amount.toLocaleString('en-IN')} (${refund.percent}%) is on its way.`
      : `${booking.booking_ref} was cancelled.`,
    '/trips',
  );

  const updated = db.prepare(`${BOOKING_SELECT} WHERE b.id = ?`).get(id);
  res.json({ booking: updated, refund });
});

export default router;
