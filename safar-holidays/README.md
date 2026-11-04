# Safar Holidays: Travel Agency Website

A full-stack travel agency website where customers can browse tour packages, search and filter them,
save favourites, book trips and leave reviews, and where an admin manages packages, bookings,
enquiries and customers from a dashboard.

**Team:** _Member 1 name (roll no.)_ and _Member 2 name (roll no.)_

---

## Technologies used

| Layer | Technology | Why it is used |
| --- | --- | --- |
| Frontend | **React 19** | Component-based user interface |
| | **Vite 8** | Fast development server and production build tool |
| | **Tailwind CSS 4** | Utility-first styling, responsive layout for mobile and desktop |
| | **React Router 8** | Page navigation (single-page application) |
| | **Lucide React** | Icon set |
| Backend | **Node.js (22.22+ / 24 LTS)** | JavaScript runtime for the server |
| | **Express 5** | REST API framework |
| | **Zod 4** | Validates all data sent to the API |
| Database | **SQLite** via **node:sqlite** (built into Node.js) | Relational database stored in a single file: no database server or extra driver to install |
| Security | **JWT** (jsonwebtoken) | Login tokens for authentication |
| | **bcryptjs** | Password hashing (passwords are never stored as plain text) |
| Testing | **Node.js built-in test runner** | 34 automated API tests |
| Tooling | **npm workspaces**, **concurrently** | One `npm install`, one command to run frontend and backend together |

Architecture:

```
 Browser (React app)  ──HTTP/JSON──>  Express REST API  ──SQL──>  SQLite database file
   localhost:5173                       localhost:4000              server/data/travel.db
```

---

## Features

**Customers**
- Home page with destination search, popular packages, trip types and recent reviews
- Package listing with search, filters (India / abroad, trip type, budget, trip length) and sorting
- Package page with day-by-day itinerary, inclusions, exclusions, reviews and a live price calculator
- Sign up and log in (JWT authentication, hashed passwords)
- Book a trip: choose a start date and number of adults and children; the total is calculated on the server
- My trips: booking reference, status (pending, confirmed, completed, cancelled) and cancellation
- Saved trips (wishlist) with the heart button
- Reviews: only customers who booked a trip can review it
- Contact form for custom trip enquiries
- Fully responsive (works on phones)

**New in version 2**
- Coupon codes: apply in the booking panel, checked on the server (expiry, minimum amount, usage limit, once per customer); "Offers this month" on the home page
- Online payment (simulated gateway) by card (Luhn check, expiry, CVV, declined test card) or UPI, after the admin confirms the booking
- Printable tax invoice with GST breakdown, payment and refund transactions
- Tiered cancellation refunds (100% / 75% / 50% / 0% depending on days before travel)
- Notifications bell with unread count (booking received, confirmed, paid, cancelled)
- Profile page: edit details, change password with strength meter, trip stats and traveller level (Explorer / Silver / Gold)
- Compare up to 3 packages side by side (lowest price, best value per day, top rated highlighted)
- Recently viewed trips, similar trips, rating breakdown, share button, cancellation policy on each package
- "Load more" pagination on the package list
- FAQ page with live search, About page
- Newsletter sign-up in the footer
- Accessibility menu: larger text, high contrast, underlined links (remembered on the device)
- Security: login lockout after 8 failed attempts (429), security headers, duplicate-booking check

**Admin**
- Dashboard: confirmed revenue, 6-month revenue chart, payments collected / due / refunded, bookings by trip type, top packages, latest bookings
- Coupons: create, edit, deactivate and delete codes; usage and total discount per code
- Bookings: payment filter, CSV export, payment and coupon columns; cancelling a paid booking refunds it in full
- Packages: duplicate a package as a hidden draft
- Enquiries: internal team notes
- Subscribers: newsletter list with copy-all-emails
- Bookings: filter by status, search, and confirm / complete / cancel bookings
- Packages: add, edit, hide/show and delete packages, including the itinerary editor
- Enquiries: read messages from the contact form, reply by email, mark as resolved
- Customers: list of users with their number of bookings and total spent

**Business rules (enforced by the API)**
- Children under 12 travel at half price
- Trips must start at least 3 days from today and at most one year ahead
- Group size per booking cannot exceed the package limit
- A booking can be cancelled by the customer only before the trip starts
- A package that already has bookings is hidden instead of deleted, so booking history stays intact

---

## How to run the project

### 1. Install Node.js
Install **Node.js 24 LTS** (or 22.22 and above) from https://nodejs.org. Check with:

```bash
node -v
```

### 2. Install the packages
Open a terminal in the project folder (the one with this README) and run:

```bash
npm install
```

This installs the packages for both the `server` and `client` folders.

### 3. Start the website

```bash
npm run dev
```

This starts both parts together:
- Website: **http://localhost:5173** (open this in your browser)
- API: http://localhost:4000

The first time the server starts, it creates the database and fills it with 12 sample packages,
demo accounts, bookings and reviews.

### 4. Log in with the demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@example.com | Admin@123 |
| Customer | priya@example.com | User@123 |

The login page also has "Fill in" buttons for these accounts. You can also create a new account with Sign up.

---

## Other commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs frontend and backend in development mode (auto-reload on changes) |
| `npm test` | Runs the 34 automated API tests (uses a temporary in-memory database) |
| `npm run seed` | Resets the database to the original sample data |
| `npm run build` | Builds the React app for production into `client/dist` |
| `npm start` | Runs the production server: after `npm run build`, open **http://localhost:4000** (API and website on one port) |

### Optional settings
Copy `server/.env.example` to `server/.env` to change the port, the JWT secret or the database location.
Everything works without it.

---

## Project structure

```
safar-holidays/
├── package.json              Root scripts (dev, build, start, test, seed)
├── README.md
├── server/                   Backend: Node.js + Express + SQLite
│   ├── .env.example          Optional settings
│   ├── src/
│   │   ├── index.js          Starts the server (adds sample data on first run)
│   │   ├── app.js            Express app: middleware, routes, serves React build
│   │   ├── config.js         Reads settings from .env
│   │   ├── db.js             Opens SQLite and creates the tables
│   │   ├── seed.js           Sample data loader (npm run seed)
│   │   ├── seed-data.js      12 tour packages, demo users and reviews
│   │   ├── middleware/
│   │   │   └── auth.js       JWT login check, admin check
│   │   ├── routes/
│   │   │   ├── auth.js       Register, login, current user
│   │   │   ├── packages.js   List/search/filter, details, reviews, admin create/edit/delete
│   │   │   ├── bookings.js   Create booking, my bookings, cancel
│   │   │   ├── wishlist.js   Saved trips
│   │   │   ├── enquiries.js  Contact form
│   │   │   └── admin.js      Dashboard stats, bookings, enquiries, customers
│   │   └── utils/            Validation, error handling, shared helpers
│   ├── tests/api.test.js     Automated API tests
│   └── data/travel.db        Database file (created automatically)
└── client/                   Frontend: React + Vite + Tailwind CSS
    ├── index.html
    ├── vite.config.js        Dev server and /api proxy to port 4000
    └── src/
        ├── main.jsx          App entry point
        ├── App.jsx           Routes / pages
        ├── index.css         Tailwind setup and design colours
        ├── lib/              API helper (fetch + token), formatting helpers
        ├── context/          Login state (AuthContext), pop-up messages (ToastContext)
        ├── components/       Navbar, Footer, PackageCard, BookingTicket, Reviews, ...
        └── pages/            Home, Packages, PackageDetail, Login, Register, MyTrips,
            └── admin/        Saved, Contact, and the admin pages
```

---

## Database tables

| Table | Main columns |
| --- | --- |
| `users` | id, name, email (unique), phone, password_hash, role (user / admin), created_at |
| `packages` | id, slug, title, destination, country, region, category, duration_days, price, image_url, summary, description, highlights, itinerary, inclusions, exclusions, max_group_size, featured, is_active |
| `bookings` | id, booking_ref, user_id → users, package_id → packages, travel_date, adults, children, contact_phone, special_requests, total_amount, status, created_at |
| `reviews` | id, user_id → users, package_id → packages, rating (1 to 5), comment (one review per user per package) |
| `wishlist` | user_id → users, package_id → packages |
| `enquiries` | id, name, email, phone, subject, message, status (new / resolved), admin_note |
| `coupons` | id, code (unique), description, discount_type (percent / flat), discount_value, min_amount, max_discount, valid_until, usage_limit, is_active |
| `payments` | id, booking_id → bookings, amount, method (card / upi), reference, transaction_id, kind (payment / refund) |
| `notifications` | id, user_id → users, title, message, link, is_read |
| `subscribers` | id, email (unique), created_at |

`bookings` also stores coupon_code, discount_amount, payment_status (unpaid / paid / refunded), paid_at, refund_amount and cancelled_at.

Lists such as highlights and the itinerary are stored as JSON text inside the `packages` table.

---

## REST API

All endpoints start with `/api`. 🔒 = needs login, 👑 = admin only.

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/auth/register` | Create an account, returns a token |
| POST | `/auth/login` | Log in, returns a token |
| GET | `/auth/me` 🔒 | Current user |
| GET | `/packages` | List packages. Query: `search`, `region`, `category`, `maxPrice`, `maxDays`, `sort`, `featured`, `limit` |
| GET | `/packages/meta` | Trip types with counts, price range, recent reviews |
| GET | `/packages/:slug` | Package details with reviews |
| POST | `/packages/:id/reviews` 🔒 | Add or update your review (only if you booked) |
| POST | `/packages` 👑 | Create a package |
| PUT | `/packages/:id` 👑 | Update a package |
| DELETE | `/packages/:id` 👑 | Delete a package (hidden instead if it has bookings) |
| POST | `/bookings` 🔒 | Book a trip |
| GET | `/bookings/my` 🔒 | Your bookings |
| PATCH | `/bookings/:id/cancel` 🔒 | Cancel your booking |
| GET | `/wishlist` 🔒 | Saved packages |
| POST / DELETE | `/wishlist/:packageId` 🔒 | Save / unsave a package |
| POST | `/enquiries` | Send a contact form message |
| GET | `/admin/stats` 👑 | Dashboard numbers |
| GET | `/admin/bookings` 👑 | All bookings. Query: `status`, `search` |
| PATCH | `/admin/bookings/:id` 👑 | Change booking status |
| GET | `/admin/packages` 👑 | All packages including hidden ones |
| GET / PATCH | `/admin/enquiries`, `/admin/enquiries/:id` 👑 | Read enquiries, mark resolved |
| GET | `/admin/users` 👑 | Customers with booking totals |
| GET | `/packages/compare?ids=1,2,3` | Up to 3 packages for comparison |
| GET | `/coupons` | Current offers |
| POST | `/bookings/quote` 🔒 | Check a coupon and get the discounted total |
| GET | `/bookings/:id` 🔒 | One booking with payments and refund quote (invoice) |
| POST | `/bookings/:id/pay` 🔒 | Pay a confirmed booking by card or UPI (simulated) |
| PUT | `/auth/me`, `/auth/password` 🔒 | Update profile, change password |
| GET | `/auth/me/summary` 🔒 | Profile stats and traveller level |
| GET | `/notifications` 🔒 | Latest notifications and unread count |
| PATCH / POST | `/notifications/:id/read`, `/notifications/read-all` 🔒 | Mark read |
| POST | `/newsletter` | Subscribe to the newsletter |
| POST | `/packages/:id/duplicate` 👑 | Copy a package as a hidden draft |
| GET | `/admin/bookings.csv` 👑 | Export bookings as CSV |
| GET / POST / PUT / DELETE | `/admin/coupons`, `/admin/coupons/:id` 👑 | Manage coupons |
| GET | `/admin/subscribers` 👑 | Newsletter subscribers |

**Test payment details:** card 4111 1111 1111 1111, any future expiry, any CVV. Card 4000 0000 0000 0002 is always declined. Any UPI ID like test@okaxis works.

Logged-in requests send the header `Authorization: Bearer <token>`.

---

## Notes and troubleshooting

- **Photos** load from Unsplash, so they need an internet connection. Without internet, each package
  shows a coloured panel with its name instead, and the site still works. Admins can change any
  photo by pasting a new image URL in the package editor.
- **No real payments** are taken. After booking, the trip is "pending" until an admin confirms it,
  which is how many travel agencies work (they confirm hotel availability first).
- **Port already in use:** stop the other program or change `PORT` in `server/.env`
  (and the proxy port in `client/vite.config.js`).
- **"No such built-in module: node:sqlite"** or install warnings about the engine: your Node.js is too
  old. Install Node.js 24 LTS, delete `node_modules`, and run `npm install` again.
- **Start with fresh data:** run `npm run seed`, or stop the server and delete the `server/data` folder.
- **Browse the database:** open `server/data/travel.db` in a free tool such as DB Browser for SQLite.
