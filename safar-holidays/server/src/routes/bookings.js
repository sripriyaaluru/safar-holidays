// /api/bookings — logged-in users book trips, see and cancel their bookings
import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
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
});

const BOOKING_SELECT = `
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

  const total = calculateTotal(pkg.price, data.adults, data.children);
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO bookings (booking_ref, user_id, package_id, travel_date, adults, children,
                             contact_phone, special_requests, total_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      newBookingRef(),
      req.user.id,
      pkg.id,
      data.travel_date,
      data.adults,
      data.children,
      data.contact_phone,
      data.special_requests,
      total,
    );

  const booking = db.prepare(`${BOOKING_SELECT} WHERE b.id = ?`).get(lastInsertRowid);
  res.status(201).json({ booking });
});

router.get('/my', (req, res) => {
  const bookings = db
    .prepare(`${BOOKING_SELECT} WHERE b.user_id = ? ORDER BY b.created_at DESC, b.id DESC`)
    .all(req.user.id);
  res.json({ bookings });
});

router.patch('/:id/cancel', (req, res) => {
  const id = idParam(req.params.id, 'booking id');
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!booking) throw new HttpError(404, 'Booking not found.');
  if (!['pending', 'confirmed'].includes(booking.status)) {
    throw new HttpError(400, `A ${booking.status} booking cannot be cancelled.`);
  }
  if (booking.travel_date <= todayISO()) throw new HttpError(400, 'Trips that have already started cannot be cancelled.');

  db.prepare(`UPDATE bookings SET status = 'cancelled' WHERE id = ?`).run(id);
  const updated = db.prepare(`${BOOKING_SELECT} WHERE b.id = ?`).get(id);
  res.json({ booking: updated });
});

export default router;
