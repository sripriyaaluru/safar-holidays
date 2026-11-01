// End-to-end API tests using Node's built-in test runner. Run with: npm test
// Uses an in-memory database, so your real data is never touched.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';
const { default: db } = await import('../src/db.js');
const { seedDatabase } = await import('../src/seed.js');
const { createApp } = await import('../src/app.js');
const { todayISO } = await import('../src/utils/http.js');

let server;
let base;

async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
}

before(async () => {
  seedDatabase(db);
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => server.close());

describe('packages', () => {
  test('lists active packages', async () => {
    const { status, data } = await api('/packages');
    assert.equal(status, 200);
    assert.equal(data.count, 12);
  });

  test('filters by region, price and sorts by price', async () => {
    const { data } = await api('/packages?region=domestic&maxPrice=25000&sort=price_asc');
    assert.ok(data.count > 0);
    assert.ok(data.packages.every((p) => p.region === 'domestic' && p.price <= 25000));
    const prices = data.packages.map((p) => p.price);
    assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
  });

  test('searches by destination', async () => {
    const { data } = await api('/packages?search=munnar');
    assert.equal(data.count, 1);
    assert.equal(data.packages[0].slug, 'kerala-backwaters-and-hills');
  });

  test('returns package details with itinerary and reviews', async () => {
    const { status, data } = await api('/packages/kerala-backwaters-and-hills');
    assert.equal(status, 200);
    assert.equal(data.package.itinerary.length, 6);
    assert.equal(data.reviews.length, 2);
    assert.equal(data.package.rating, 4.5);
  });

  test('returns 404 for unknown package', async () => {
    const { status } = await api('/packages/does-not-exist');
    assert.equal(status, 404);
  });
});

describe('auth, bookings, reviews and wishlist', () => {
  let token;
  let bookingId;
  const pkgSlug = 'goa-beach-escape';

  test('registers a new user', async () => {
    const { status, data } = await api('/auth/register', {
      method: 'POST',
      body: { name: 'Test Student', email: 'Student@Example.com', password: 'secret123' },
    });
    assert.equal(status, 201);
    assert.equal(data.user.email, 'student@example.com');
    assert.equal(data.user.role, 'user');
    token = data.token;
  });

  test('rejects duplicate email and bad login', async () => {
    const dup = await api('/auth/register', {
      method: 'POST',
      body: { name: 'Again', email: 'student@example.com', password: 'secret123' },
    });
    assert.equal(dup.status, 409);
    const bad = await api('/auth/login', { method: 'POST', body: { email: 'student@example.com', password: 'wrong' } });
    assert.equal(bad.status, 401);
  });

  test('requires login to book', async () => {
    const { status } = await api('/bookings', { method: 'POST', body: {} });
    assert.equal(status, 401);
  });

  test('cannot review before booking', async () => {
    const { data } = await api(`/packages/${pkgSlug}`);
    const res = await api(`/packages/${data.package.id}/reviews`, {
      method: 'POST',
      token,
      body: { rating: 5, comment: 'Great trip overall' },
    });
    assert.equal(res.status, 403);
  });

  test('rejects a travel date that is too soon', async () => {
    const { status, data } = await api('/bookings', {
      method: 'POST',
      token,
      body: { package_id: 1, travel_date: todayISO(1), adults: 2, contact_phone: '9876543210' },
    });
    assert.equal(status, 400);
    assert.match(data.error, /at least 3 days/);
  });

  test('books a trip and calculates the price on the server', async () => {
    const { status, data } = await api('/bookings', {
      method: 'POST',
      token,
      body: { package_id: 1, travel_date: todayISO(20), adults: 2, children: 1, contact_phone: '9876543210', total_amount: 1 },
    });
    assert.equal(status, 201);
    assert.equal(data.booking.status, 'pending');
    assert.equal(data.booking.total_amount, 14999 * 2 + 7500); // child = half price, client total ignored
    assert.match(data.booking.booking_ref, /^SFR-[0-9A-F]{6}$/);
    bookingId = data.booking.id;
  });

  test('shows the booking in My Bookings and allows a review', async () => {
    const mine = await api('/bookings/my', { token });
    assert.equal(mine.data.bookings.length, 1);

    const review = await api('/packages/1/reviews', {
      method: 'POST',
      token,
      body: { rating: 5, comment: 'Lovely resort and great guide' },
    });
    assert.equal(review.status, 201);

    const detail = await api(`/packages/${pkgSlug}`, { token });
    assert.equal(detail.data.viewer.canReview, true);
    assert.equal(detail.data.viewer.myReview.rating, 5);
  });

  test('saves and removes a wishlist item', async () => {
    assert.equal((await api('/wishlist/7', { method: 'POST', token })).status, 201);
    assert.equal((await api('/wishlist', { token })).data.packages.length, 1);
    await api('/wishlist/7', { method: 'DELETE', token });
    assert.equal((await api('/wishlist', { token })).data.packages.length, 0);
  });

  test('cancels the booking', async () => {
    const { status, data } = await api(`/bookings/${bookingId}/cancel`, { method: 'PATCH', token });
    assert.equal(status, 200);
    assert.equal(data.booking.status, 'cancelled');
    const again = await api(`/bookings/${bookingId}/cancel`, { method: 'PATCH', token });
    assert.equal(again.status, 400);
  });

  test('blocks non-admins from admin routes', async () => {
    const { status } = await api('/admin/stats', { token });
    assert.equal(status, 403);
  });
});

describe('admin', () => {
  let adminToken;

  before(async () => {
    const { data } = await api('/auth/login', {
      method: 'POST',
      body: { email: 'admin@example.com', password: 'Admin@123' },
    });
    adminToken = data.token;
  });

  test('reads dashboard stats', async () => {
    const { status, data } = await api('/admin/stats', { token: adminToken });
    assert.equal(status, 200);
    assert.equal(data.totals.packages, 12);
    assert.ok(data.totals.revenue > 0);
    assert.ok(data.topPackages.length > 0);
  });

  test('confirms a pending booking', async () => {
    const { data } = await api('/admin/bookings?status=pending', { token: adminToken });
    const target = data.bookings[0];
    const res = await api(`/admin/bookings/${target.id}`, { method: 'PATCH', token: adminToken, body: { status: 'confirmed' } });
    assert.equal(res.status, 200);
    assert.equal(res.data.status, 'confirmed');
  });

  test('creates, updates and deletes a package', async () => {
    const body = {
      title: 'Coorg Coffee Trails',
      destination: 'Madikeri, Coorg',
      country: 'India',
      region: 'domestic',
      category: 'nature',
      duration_days: 3,
      price: 9999,
      image_url: '',
      summary: 'Coffee estates, waterfalls and misty hills.',
      description: 'A short break among the coffee estates of Coorg with a plantation stay.',
      highlights: ['Plantation stay'],
      inclusions: ['2 nights stay'],
      exclusions: ['Travel to Coorg'],
      itinerary: [{ title: 'Arrive', details: 'Check in' }],
      max_group_size: 10,
      featured: false,
      is_active: true,
    };
    const created = await api('/packages', { method: 'POST', token: adminToken, body });
    assert.equal(created.status, 201);
    assert.equal(created.data.package.slug, 'coorg-coffee-trails');

    const id = created.data.package.id;
    const updated = await api(`/packages/${id}`, { method: 'PUT', token: adminToken, body: { ...body, price: 11999 } });
    assert.equal(updated.data.package.price, 11999);

    const removed = await api(`/packages/${id}`, { method: 'DELETE', token: adminToken });
    assert.equal(removed.data.deleted, true);
  });

  test('hides (archives) a package that has bookings instead of deleting it', async () => {
    const res = await api('/packages/2', { method: 'DELETE', token: adminToken });
    assert.equal(res.data.archived, true);
    const list = await api('/packages');
    assert.equal(list.data.count, 11);
  });

  test('accepts a contact enquiry and lets admin resolve it', async () => {
    const sent = await api('/enquiries', {
      method: 'POST',
      body: { name: 'Visitor', email: 'visitor@example.com', subject: 'Honeymoon ideas', message: 'Suggest a 5 day trip in March please.' },
    });
    assert.equal(sent.status, 201);
    const { data } = await api('/admin/enquiries', { token: adminToken });
    const fresh = data.enquiries.find((e) => e.email === 'visitor@example.com');
    const res = await api(`/admin/enquiries/${fresh.id}`, { method: 'PATCH', token: adminToken, body: { status: 'resolved' } });
    assert.equal(res.data.status, 'resolved');
  });
});
