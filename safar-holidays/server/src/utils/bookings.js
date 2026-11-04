// Business rules for coupons, payments, refunds and user notifications.
import crypto from 'node:crypto';
import db from '../db.js';
import { HttpError, todayISO } from './http.js';

/* ---------- Coupons ---------- */

/** Works out the discount a coupon gives on a subtotal (never more than the subtotal). */
export function couponDiscount(coupon, subtotal) {
  let discount =
    coupon.discount_type === 'percent' ? Math.round((subtotal * coupon.discount_value) / 100) : coupon.discount_value;
  if (coupon.max_discount > 0) discount = Math.min(discount, coupon.max_discount);
  return Math.min(discount, subtotal);
}

/**
 * Checks a coupon code for a user and a subtotal.
 * Returns { coupon, discount } or throws a 400 error with a readable reason.
 */
export function applyCoupon(code, subtotal, userId) {
  const clean = String(code || '').trim().toUpperCase();
  if (!clean) return { coupon: null, discount: 0 };

  const coupon = db.prepare('SELECT * FROM coupons WHERE code = ?').get(clean);
  if (!coupon || !coupon.is_active) throw new HttpError(400, `Coupon ${clean} is not valid.`);
  if (coupon.valid_until && coupon.valid_until < todayISO()) throw new HttpError(400, `Coupon ${clean} has expired.`);
  if (subtotal < coupon.min_amount) {
    throw new HttpError(400, `Coupon ${clean} needs a booking of at least ₹${coupon.min_amount.toLocaleString('en-IN')}.`);
  }

  const used = db
    .prepare(`SELECT COUNT(*) AS n FROM bookings WHERE coupon_code = ? AND status != 'cancelled'`)
    .get(clean).n;
  if (coupon.usage_limit > 0 && used >= coupon.usage_limit) {
    throw new HttpError(400, `Coupon ${clean} has reached its usage limit.`);
  }

  const usedByUser = db
    .prepare(`SELECT 1 FROM bookings WHERE coupon_code = ? AND user_id = ? AND status != 'cancelled'`)
    .get(clean, userId);
  if (usedByUser) throw new HttpError(400, `You have already used coupon ${clean}.`);

  return { coupon, discount: couponDiscount(coupon, subtotal) };
}

/* ---------- Payments ---------- */

/** Luhn checksum used by all major card networks. */
export function luhnValid(number) {
  const digits = String(number).replace(/\D/g, '');
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/** "MM/YY" must be a real month that has not passed yet. */
export function expiryValid(expiry, now = new Date()) {
  const m = /^(\d{2})\/(\d{2})$/.exec(String(expiry).trim());
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);
  return endOfMonth >= now;
}

export function transactionId(prefix = 'TXN') {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

/* ---------- Cancellation and refunds ---------- */

/** Refund tiers: the earlier you cancel, the more you get back. */
export const REFUND_POLICY = [
  { minDays: 30, percent: 100 },
  { minDays: 15, percent: 75 },
  { minDays: 7, percent: 50 },
  { minDays: 0, percent: 0 },
];

export function daysBetween(fromISO, toISO) {
  const a = new Date(`${fromISO}T00:00:00Z`);
  const b = new Date(`${toISO}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

/** Refund for a paid booking cancelled today. Unpaid bookings have nothing to refund. */
export function refundFor(booking, today = todayISO()) {
  if (booking.payment_status !== 'paid') return { percent: 0, amount: 0, daysBefore: daysBetween(today, booking.travel_date) };
  const daysBefore = daysBetween(today, booking.travel_date);
  const tier = REFUND_POLICY.find((t) => daysBefore >= t.minDays);
  const percent = tier ? tier.percent : 0;
  return { percent, amount: Math.round((booking.total_amount * percent) / 100), daysBefore };
}

/* ---------- Notifications ---------- */

const insertNotification = db.prepare(
  'INSERT INTO notifications (user_id, title, message, link) VALUES (?, ?, ?, ?)',
);

export function notify(userId, title, message, link = '') {
  insertNotification.run(userId, title, message, link);
}
