// /api/packages — browse, search and manage tour packages; post reviews
import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { optionalAuth, requireAdmin, requireAuth } from '../middleware/auth.js';
import { HttpError, cleanQuery, idParam, validate } from '../utils/http.js';
import { CATEGORIES, PACKAGE_SELECT, slugify, toCard, toDetail } from '../utils/packages.js';

const router = Router();

/* ---------- Public: list with search, filters and sorting ---------- */

const listQuery = z.object({
  search: z.string().trim().max(100).optional(),
  region: z.enum(['domestic', 'international']).optional(),
  category: z.enum(CATEGORIES).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  maxDays: z.coerce.number().int().min(1).optional(),
  featured: z.enum(['1', 'true']).optional(),
  sort: z.enum(['popular', 'price_asc', 'price_desc', 'duration', 'rating']).default('popular'),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  offset: z.coerce.number().int().min(0).default(0),
});

const SORTS = {
  popular: 'p.featured DESC, booking_count DESC, rating DESC, p.id',
  price_asc: 'p.price ASC',
  price_desc: 'p.price DESC',
  duration: 'p.duration_days ASC, p.price ASC',
  rating: 'rating DESC, review_count DESC',
};

router.get('/', (req, res) => {
  const q = validate(listQuery, cleanQuery(req.query));
  const where = ['p.is_active = 1'];
  const params = {};

  if (q.search) {
    where.push(`(p.title LIKE @search ESCAPE '\\' OR p.destination LIKE @search ESCAPE '\\'
                 OR p.country LIKE @search ESCAPE '\\' OR p.summary LIKE @search ESCAPE '\\')`);
    params.search = `%${q.search.replace(/[\\%_]/g, (c) => '\\' + c)}%`;
  }
  if (q.region) {
    where.push('p.region = @region');
    params.region = q.region;
  }
  if (q.category) {
    where.push('p.category = @category');
    params.category = q.category;
  }
  if (q.minPrice !== undefined) {
    where.push('p.price >= @minPrice');
    params.minPrice = q.minPrice;
  }
  if (q.maxPrice !== undefined) {
    where.push('p.price <= @maxPrice');
    params.maxPrice = q.maxPrice;
  }
  if (q.maxDays !== undefined) {
    where.push('p.duration_days <= @maxDays');
    params.maxDays = q.maxDays;
  }
  if (q.featured) where.push('p.featured = 1');

  let sql = `${PACKAGE_SELECT} WHERE ${where.join(' AND ')} ORDER BY ${SORTS[q.sort]}`;
  if (q.limit) sql += ` LIMIT ${q.limit} OFFSET ${q.offset}`;

  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM packages p WHERE ${where.join(' AND ')}`).get(params);
  const packages = db.prepare(sql).all(params).map(toCard);
  res.json({ packages, count: packages.length, total, hasMore: q.offset + packages.length < total });
});

/* ---------- Public: compare up to 3 packages side by side ---------- */

router.get('/compare', (req, res) => {
  const ids = String(req.query.ids || '')
    .split(',')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 3);
  if (ids.length === 0) return res.json({ packages: [] });
  const rows = db
    .prepare(`${PACKAGE_SELECT} WHERE p.is_active = 1 AND p.id IN (${ids.map(() => '?').join(',')})`)
    .all(...ids);
  // Keep the order the user picked
  const packages = ids.map((id) => rows.find((r) => r.id === id)).filter(Boolean).map(toDetail);
  res.json({ packages });
});

/* ---------- Public: filter options (categories, price range) ---------- */

router.get('/meta', (_req, res) => {
  const categories = db
    .prepare(`SELECT category, COUNT(*) AS count FROM packages WHERE is_active = 1 GROUP BY category ORDER BY count DESC`)
    .all();
  const range = db
    .prepare(`SELECT MIN(price) AS minPrice, MAX(price) AS maxPrice, MAX(duration_days) AS maxDays
                FROM packages WHERE is_active = 1`)
    .get();
  const reviews = db
    .prepare(
      `SELECT r.rating, r.comment, r.created_at, u.name AS user_name, p.title AS package_title, p.slug AS package_slug
         FROM reviews r JOIN users u ON u.id = r.user_id JOIN packages p ON p.id = r.package_id
        WHERE r.rating >= 4 AND p.is_active = 1
        ORDER BY r.created_at DESC LIMIT 3`,
    )
    .all();
  const ratings = db.prepare(`SELECT ROUND(COALESCE(AVG(rating), 0), 1) AS avgRating, COUNT(*) AS reviewCount FROM reviews`).get();
  res.json({ categories, ...range, ...ratings, recentReviews: reviews });
});

/* ---------- Public: one package with reviews ---------- */

router.get('/:slug', optionalAuth, (req, res) => {
  const row = db.prepare(`${PACKAGE_SELECT} WHERE p.slug = ?`).get(req.params.slug);
  const isAdmin = req.user?.role === 'admin';
  if (!row || (!row.is_active && !isAdmin)) throw new HttpError(404, 'We could not find that package.');

  const reviews = db
    .prepare(
      `SELECT r.id, r.rating, r.comment, r.created_at, r.user_id, u.name AS user_name
         FROM reviews r JOIN users u ON u.id = r.user_id
        WHERE r.package_id = ? ORDER BY r.created_at DESC`,
    )
    .all(row.id);

  let viewer = null;
  if (req.user) {
    const inWishlist = !!db.prepare('SELECT 1 FROM wishlist WHERE user_id = ? AND package_id = ?').get(req.user.id, row.id);
    const hasBooked = !!db
      .prepare(`SELECT 1 FROM bookings WHERE user_id = ? AND package_id = ? AND status != 'cancelled'`)
      .get(req.user.id, row.id);
    viewer = {
      inWishlist,
      canReview: hasBooked,
      myReview: reviews.find((r) => r.user_id === req.user.id) || null,
    };
  }

  // Similar trips: same trip type first, then same region, never the package itself.
  const similar = db
    .prepare(
      `${PACKAGE_SELECT} WHERE p.is_active = 1 AND p.id != @id AND (p.category = @category OR p.region = @region)
       ORDER BY CASE WHEN p.category = @category THEN 0 ELSE 1 END, ABS(p.price - @price) LIMIT 3`,
    )
    .all({ id: row.id, category: row.category, region: row.region, price: row.price })
    .map(toCard);

  // Rating breakdown: how many 5-star, 4-star ... reviews
  const ratingBreakdown = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => r.rating === stars).length,
  }));

  res.json({ package: toDetail(row), reviews, viewer, similar, ratingBreakdown });
});

/* ---------- Logged-in users: review a package they booked ---------- */

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, 'Choose a rating from 1 to 5').max(5, 'Choose a rating from 1 to 5'),
  comment: z.string().trim().min(5, 'Write at least a few words about your trip').max(1000, 'Review is too long'),
});

router.post('/:id/reviews', requireAuth, (req, res) => {
  const packageId = idParam(req.params.id, 'package id');
  const data = validate(reviewSchema, req.body);

  const pkg = db.prepare('SELECT id FROM packages WHERE id = ? AND is_active = 1').get(packageId);
  if (!pkg) throw new HttpError(404, 'We could not find that package.');

  const hasBooked = db
    .prepare(`SELECT 1 FROM bookings WHERE user_id = ? AND package_id = ? AND status != 'cancelled'`)
    .get(req.user.id, packageId);
  if (!hasBooked) throw new HttpError(403, 'You can review a trip after you have booked it.');

  db.prepare(
    `INSERT INTO reviews (user_id, package_id, rating, comment) VALUES (?, ?, ?, ?)
     ON CONFLICT (user_id, package_id)
     DO UPDATE SET rating = excluded.rating, comment = excluded.comment, created_at = datetime('now')`,
  ).run(req.user.id, packageId, data.rating, data.comment);

  res.status(201).json({ message: 'Review saved' });
});

/* ---------- Admin: create, update, delete ---------- */

const textList = z.array(z.string().trim().min(1).max(200)).max(30).default([]);

const packageSchema = z.object({
  title: z.string().trim().min(3, 'Title is too short').max(120),
  destination: z.string().trim().min(2, 'Enter the destination').max(120),
  country: z.string().trim().min(2, 'Enter the country').max(60),
  region: z.enum(['domestic', 'international']),
  category: z.enum(CATEGORIES),
  duration_days: z.coerce.number().int().min(1, 'Duration must be at least 1 day').max(30),
  price: z.coerce.number().int().min(500, 'Price must be at least ₹500').max(2000000),
  image_url: z.string().trim().url('Image must be a full URL starting with https://').max(500).or(z.literal('')).default(''),
  summary: z.string().trim().min(10, 'Summary should be at least 10 characters').max(220),
  description: z.string().trim().min(20, 'Description should be at least 20 characters').max(4000),
  highlights: textList,
  inclusions: textList,
  exclusions: textList,
  itinerary: z
    .array(
      z.object({
        title: z.string().trim().min(2, 'Each itinerary day needs a title').max(120),
        details: z.string().trim().max(600).default(''),
      }),
    )
    .max(30)
    .default([]),
  max_group_size: z.coerce.number().int().min(1).max(100).default(20),
  featured: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

function uniqueSlug(title, ignoreId = 0) {
  const base = slugify(title) || 'package';
  let slug = base;
  let n = 2;
  while (db.prepare('SELECT 1 FROM packages WHERE slug = ? AND id != ?').get(slug, ignoreId)) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

const toRow = (d) => ({
  ...d,
  highlights: JSON.stringify(d.highlights),
  inclusions: JSON.stringify(d.inclusions),
  exclusions: JSON.stringify(d.exclusions),
  itinerary: JSON.stringify(d.itinerary),
  featured: d.featured ? 1 : 0,
  is_active: d.is_active ? 1 : 0,
});

router.post('/', requireAdmin, (req, res) => {
  const data = validate(packageSchema, req.body);
  const row = { ...toRow(data), slug: uniqueSlug(data.title) };
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO packages (slug, title, destination, country, region, category, duration_days, price, image_url,
         summary, description, highlights, itinerary, inclusions, exclusions, max_group_size, featured, is_active)
       VALUES (@slug, @title, @destination, @country, @region, @category, @duration_days, @price, @image_url,
         @summary, @description, @highlights, @itinerary, @inclusions, @exclusions, @max_group_size, @featured, @is_active)`,
    )
    .run(row);
  const created = db.prepare(`${PACKAGE_SELECT} WHERE p.id = ?`).get(lastInsertRowid);
  res.status(201).json({ package: toDetail(created) });
});

router.put('/:id', requireAdmin, (req, res) => {
  const id = idParam(req.params.id, 'package id');
  if (!db.prepare('SELECT 1 FROM packages WHERE id = ?').get(id)) throw new HttpError(404, 'Package not found.');

  const data = validate(packageSchema, req.body);
  const row = { ...toRow(data), slug: uniqueSlug(data.title, id), id };
  db.prepare(
    `UPDATE packages SET slug = @slug, title = @title, destination = @destination, country = @country,
       region = @region, category = @category, duration_days = @duration_days, price = @price,
       image_url = @image_url, summary = @summary, description = @description, highlights = @highlights,
       itinerary = @itinerary, inclusions = @inclusions, exclusions = @exclusions,
       max_group_size = @max_group_size, featured = @featured, is_active = @is_active
     WHERE id = @id`,
  ).run(row);
  const updated = db.prepare(`${PACKAGE_SELECT} WHERE p.id = ?`).get(id);
  res.json({ package: toDetail(updated) });
});

router.post('/:id/duplicate', requireAdmin, (req, res) => {
  const id = idParam(req.params.id, 'package id');
  const src = db.prepare('SELECT * FROM packages WHERE id = ?').get(id);
  if (!src) throw new HttpError(404, 'Package not found.');
  const title = `${src.title} (copy)`.slice(0, 120);
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO packages (slug, title, destination, country, region, category, duration_days, price, image_url,
         summary, description, highlights, itinerary, inclusions, exclusions, max_group_size, featured, is_active)
       SELECT ?, ?, destination, country, region, category, duration_days, price, image_url,
         summary, description, highlights, itinerary, inclusions, exclusions, max_group_size, 0, 0
         FROM packages WHERE id = ?`,
    )
    .run(uniqueSlug(title), title, id);
  const created = db.prepare(`${PACKAGE_SELECT} WHERE p.id = ?`).get(lastInsertRowid);
  res.status(201).json({ package: toDetail(created), message: 'Copy created as a hidden draft.' });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const id = idParam(req.params.id, 'package id');
  if (!db.prepare('SELECT 1 FROM packages WHERE id = ?').get(id)) throw new HttpError(404, 'Package not found.');

  const hasBookings = db.prepare('SELECT 1 FROM bookings WHERE package_id = ?').get(id);
  if (hasBookings) {
    // Keep booking history intact: hide the package instead of deleting it.
    db.prepare('UPDATE packages SET is_active = 0, featured = 0 WHERE id = ?').run(id);
    return res.json({ archived: true, message: 'Package has bookings, so it was hidden instead of deleted.' });
  }
  db.prepare('DELETE FROM packages WHERE id = ?').run(id);
  res.json({ deleted: true, message: 'Package deleted.' });
});

export default router;
