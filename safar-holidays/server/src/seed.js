// Fills the database with sample packages, demo users, bookings and reviews.
// Runs automatically when the database is empty. Run `npm run seed` to reset everything.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { todayISO } from './utils/http.js';
import { couponDiscount } from './utils/bookings.js';
import { calculateTotal, slugify } from './utils/packages.js';
import { samplePackages, sampleReviews, sampleUsers } from './seed-data.js';

const at = (daysOffset, time = '10:30:00') => `${todayISO(daysOffset)} ${time}`;

// [user email, package title, status, travel date offset, created offset, adults, children, paid, coupon]
const sampleBookings = [
  ['priya@example.com', 'Kerala Backwaters & Hills', 'completed', -60, -150, 2, 0, true, ''],
  ['rahul@example.com', 'Kerala Backwaters & Hills', 'completed', -30, -125, 2, 1, true, ''],
  ['ananya@example.com', 'Golden Triangle Classic', 'completed', -45, -100, 2, 0, true, ''],
  ['priya@example.com', 'Goa Beach Escape', 'completed', -20, -80, 4, 0, true, 'WELCOME10'],
  ['rahul@example.com', 'Dubai City Lights', 'completed', -15, -60, 3, 0, true, ''],
  ['ananya@example.com', 'Bali Island Retreat', 'completed', -10, -40, 2, 0, true, 'MONSOON5K'],
  ['priya@example.com', 'Singapore Family Fun', 'confirmed', 25, -10, 2, 2, true, ''],
  ['priya@example.com', 'Golden Triangle Classic', 'confirmed', 60, -3, 2, 0, false, ''],
  ['rahul@example.com', 'Andaman Island Hopper', 'pending', 40, -2, 2, 0, false, ''],
  ['ananya@example.com', 'Royal Rajasthan', 'pending', 30, -1, 3, 0, false, ''],
  ['rahul@example.com', 'Maldives Overwater Stay', 'cancelled', 50, -5, 2, 0, false, ''],
];

const sampleCoupons = [
  { code: 'WELCOME10', description: '10% off your first trip with us (up to ₹5,000)', discount_type: 'percent', discount_value: 10, min_amount: 10000, max_discount: 5000, valid_days: 365, usage_limit: 0 },
  { code: 'MONSOON5K', description: 'Flat ₹5,000 off any booking above ₹80,000', discount_type: 'flat', discount_value: 5000, min_amount: 80000, max_discount: 0, valid_days: 90, usage_limit: 100 },
  { code: 'FAMILY15', description: '15% off family holidays above ₹1,00,000 (up to ₹15,000)', discount_type: 'percent', discount_value: 15, min_amount: 100000, max_discount: 15000, valid_days: 180, usage_limit: 50 },
  { code: 'DIWALI2025', description: 'Festive offer (expired)', discount_type: 'percent', discount_value: 20, min_amount: 0, max_discount: 8000, valid_days: -30, usage_limit: 0 },
];

const sampleSubscribers = ['priya@example.com', 'traveller.one@example.com', 'meera@example.com', 'karthik@example.com'];

const sampleEnquiries = [
  {
    name: 'Karthik Iyer',
    email: 'karthik@example.com',
    phone: '9811122233',
    subject: 'Group trip for 18 colleagues',
    message: 'We are planning a 3-day offsite in Goa in February for 18 people. Can you share a custom quote?',
    status: 'new',
  },
  {
    name: 'Meera Nair',
    email: 'meera@example.com',
    phone: '',
    subject: 'Visa help for Bali',
    message: 'Do Indian passport holders need a visa for Bali, and do you help with the paperwork?',
    status: 'resolved',
    admin_note: 'Replied by email with e-VOA details on the same day.',
  },
];

export function seedDatabase(db) {
  const reset = () => {
    db.exec(`
      DELETE FROM notifications; DELETE FROM payments; DELETE FROM coupons; DELETE FROM subscribers;
      DELETE FROM reviews; DELETE FROM wishlist; DELETE FROM bookings;
      DELETE FROM enquiries; DELETE FROM packages; DELETE FROM users;
      DELETE FROM sqlite_sequence;
    `);

    const userIds = {};
    const insertUser = db.prepare(
      'INSERT INTO users (name, email, phone, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    );
    sampleUsers.forEach((u, i) => {
      const hash = bcrypt.hashSync(u.password, 10);
      userIds[u.email] = insertUser.run(u.name, u.email, u.phone, hash, u.role, at(-120 + i * 5)).lastInsertRowid;
    });

    const pkgs = {};
    const insertPackage = db.prepare(`
      INSERT INTO packages (slug, title, destination, country, region, category, duration_days, price, image_url,
        summary, description, highlights, itinerary, inclusions, exclusions, max_group_size, featured, created_at)
      VALUES (@slug, @title, @destination, @country, @region, @category, @duration_days, @price, @image_url,
        @summary, @description, @highlights, @itinerary, @inclusions, @exclusions, @max_group_size, @featured, @created_at)
    `);
    samplePackages.forEach((p, i) => {
      const id = insertPackage.run({
        ...p,
        slug: slugify(p.title),
        highlights: JSON.stringify(p.highlights),
        itinerary: JSON.stringify(p.itinerary),
        inclusions: JSON.stringify(p.inclusions),
        exclusions: JSON.stringify(p.exclusions),
        featured: p.featured ? 1 : 0,
        created_at: at(-150 + i),
      }).lastInsertRowid;
      pkgs[p.title] = { id, price: p.price };
    });

    const insertBooking = db.prepare(`
      INSERT INTO bookings (booking_ref, user_id, package_id, travel_date, adults, children, contact_phone,
        special_requests, total_amount, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertCoupon = db.prepare(
      `INSERT INTO coupons (code, description, discount_type, discount_value, min_amount, max_discount, valid_until, usage_limit, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const coupons = {};
    sampleCoupons.forEach((c, i) => {
      insertCoupon.run(c.code, c.description, c.discount_type, c.discount_value, c.min_amount, c.max_discount,
        todayISO(c.valid_days), c.usage_limit, c.valid_days > 0 ? 1 : 0, at(-160 + i));
      coupons[c.code] = c;
    });

    const insertPayment = db.prepare(
      `INSERT INTO payments (booking_id, amount, method, reference, transaction_id, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    );
    const insertNote = db.prepare(
      'INSERT INTO notifications (user_id, title, message, link, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    );

    sampleBookings.forEach(([email, title, status, travel, created, adults, children, paid, code], i) => {
      const user = sampleUsers.find((u) => u.email === email);
      const pkg = pkgs[title];
      const subtotal = calculateTotal(pkg.price, adults, children);
      const discount = code ? couponDiscount(coupons[code], subtotal) : 0;
      const ref = `SFR-${(0xa1b200 + i * 4099).toString(16).toUpperCase()}`;
      const { lastInsertRowid } = insertBooking.run(
        ref,
        userIds[email],
        pkg.id,
        todayISO(travel),
        adults,
        children,
        user.phone,
        '',
        subtotal - discount,
        status,
        at(created),
      );
      db.prepare('UPDATE bookings SET coupon_code = ?, discount_amount = ? WHERE id = ?').run(code, discount, lastInsertRowid);
      if (status === 'cancelled') {
        db.prepare('UPDATE bookings SET cancelled_at = ? WHERE id = ?').run(at(created + 1), lastInsertRowid);
      }
      if (paid) {
        const paidAt = at(created + 2, '15:10:00');
        db.prepare(`UPDATE bookings SET payment_status = 'paid', paid_at = ? WHERE id = ?`).run(paidAt, lastInsertRowid);
        insertPayment.run(lastInsertRowid, subtotal - discount, i % 2 ? 'upi' : 'card',
          i % 2 ? `UPI ${email.split('@')[0]}@okaxis` : 'Card ending 1111', `PAY-SEED${String(i).padStart(4, '0')}`, paidAt);
      }
      if (email === 'priya@example.com') {
        insertNote.run(userIds[email], 'Booking received', `We received booking ${ref} for ${title}.`, '/trips', 1, at(created));
        if (status !== 'pending') {
          insertNote.run(userIds[email], 'Booking confirmed',
            paid ? `${ref} is confirmed and paid. Have a great trip!` : `Good news! ${ref} is confirmed. You can now pay online from My trips.`,
            '/trips', paid ? 1 : 0, at(created + 1));
        }
      }
    });

    const insertWish = db.prepare('INSERT INTO wishlist (user_id, package_id, created_at) VALUES (?, ?, ?)');
    ['Maldives Overwater Stay', 'Paris & Switzerland', 'Andaman Island Hopper'].forEach((title, i) =>
      insertWish.run(userIds['priya@example.com'], pkgs[title].id, at(-6 + i)),
    );

    const insertSubscriber = db.prepare('INSERT INTO subscribers (email, created_at) VALUES (?, ?)');
    sampleSubscribers.forEach((email, i) => insertSubscriber.run(email, at(-30 + i * 6)));

    const insertReview = db.prepare(
      'INSERT INTO reviews (user_id, package_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?)',
    );
    sampleReviews.forEach((r, i) => {
      insertReview.run(userIds[r.user], pkgs[r.pkg].id, r.rating, r.comment, at(-25 + i * 3));
    });

    const insertEnquiry = db.prepare(
      'INSERT INTO enquiries (name, email, phone, subject, message, status, admin_note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    );
    sampleEnquiries.forEach((e, i) => {
      insertEnquiry.run(e.name, e.email, e.phone, e.subject, e.message, e.status, e.admin_note || '', at(-4 + i * 2));
    });
  };

  // Save everything together, or nothing if something fails.
  db.exec('BEGIN');
  try {
    reset();
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// Allow `node src/seed.js` (npm run seed) to reset the database from the command line.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { default: db } = await import('./db.js');
  seedDatabase(db);
  console.log('Database reset with sample data.');
  console.log('Admin login: admin@example.com / Admin@123');
  console.log('User login:  priya@example.com / User@123');
}
