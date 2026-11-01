// Fills the database with sample packages, demo users, bookings and reviews.
// Runs automatically when the database is empty. Run `npm run seed` to reset everything.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { todayISO } from './utils/http.js';
import { calculateTotal, slugify } from './utils/packages.js';
import { samplePackages, sampleReviews, sampleUsers } from './seed-data.js';

const at = (daysOffset, time = '10:30:00') => `${todayISO(daysOffset)} ${time}`;

// [user email, package title, status, travel date offset, created offset, adults, children]
const sampleBookings = [
  ['priya@example.com', 'Kerala Backwaters & Hills', 'completed', -60, -95, 2, 0],
  ['rahul@example.com', 'Kerala Backwaters & Hills', 'completed', -30, -70, 2, 1],
  ['ananya@example.com', 'Golden Triangle Classic', 'completed', -45, -100, 2, 0],
  ['priya@example.com', 'Goa Beach Escape', 'completed', -20, -50, 4, 0],
  ['rahul@example.com', 'Dubai City Lights', 'completed', -15, -60, 3, 0],
  ['ananya@example.com', 'Bali Island Retreat', 'completed', -10, -40, 2, 0],
  ['priya@example.com', 'Singapore Family Fun', 'confirmed', 25, -10, 2, 2],
  ['priya@example.com', 'Golden Triangle Classic', 'confirmed', 60, -3, 2, 0],
  ['rahul@example.com', 'Andaman Island Hopper', 'pending', 40, -2, 2, 0],
  ['ananya@example.com', 'Royal Rajasthan', 'pending', 30, -1, 3, 0],
  ['rahul@example.com', 'Maldives Overwater Stay', 'cancelled', 50, -5, 2, 0],
];

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
  },
];

export function seedDatabase(db) {
  const reset = () => {
    db.exec(`
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
    sampleBookings.forEach(([email, title, status, travel, created, adults, children], i) => {
      const user = sampleUsers.find((u) => u.email === email);
      const pkg = pkgs[title];
      insertBooking.run(
        `SFR-${(0xa1b200 + i * 4099).toString(16).toUpperCase()}`,
        userIds[email],
        pkg.id,
        todayISO(travel),
        adults,
        children,
        user.phone,
        '',
        calculateTotal(pkg.price, adults, children),
        status,
        at(created),
      );
    });

    const insertReview = db.prepare(
      'INSERT INTO reviews (user_id, package_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?)',
    );
    sampleReviews.forEach((r, i) => {
      insertReview.run(userIds[r.user], pkgs[r.pkg].id, r.rating, r.comment, at(-25 + i * 3));
    });

    const insertEnquiry = db.prepare(
      'INSERT INTO enquiries (name, email, phone, subject, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    );
    sampleEnquiries.forEach((e, i) => {
      insertEnquiry.run(e.name, e.email, e.phone, e.subject, e.message, e.status, at(-4 + i * 2));
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
