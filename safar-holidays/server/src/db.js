// Opens the SQLite database and creates the tables on first run.
// Uses node:sqlite, the SQLite engine built into Node.js, so there is nothing extra to install.
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';

if (config.dbPath !== ':memory:') {
  fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
}

const db = new DatabaseSync(config.dbPath);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,
    phone         TEXT,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS packages (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    slug           TEXT    NOT NULL UNIQUE,
    title          TEXT    NOT NULL,
    destination    TEXT    NOT NULL,
    country        TEXT    NOT NULL,
    region         TEXT    NOT NULL CHECK (region IN ('domestic', 'international')),
    category       TEXT    NOT NULL,
    duration_days  INTEGER NOT NULL CHECK (duration_days > 0),
    price          INTEGER NOT NULL CHECK (price > 0),
    image_url      TEXT,
    summary        TEXT    NOT NULL,
    description    TEXT    NOT NULL,
    highlights     TEXT    NOT NULL DEFAULT '[]',
    itinerary      TEXT    NOT NULL DEFAULT '[]',
    inclusions     TEXT    NOT NULL DEFAULT '[]',
    exclusions     TEXT    NOT NULL DEFAULT '[]',
    max_group_size INTEGER NOT NULL DEFAULT 20,
    featured       INTEGER NOT NULL DEFAULT 0,
    is_active      INTEGER NOT NULL DEFAULT 1,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_ref      TEXT    NOT NULL UNIQUE,
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    package_id       INTEGER NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
    travel_date      TEXT    NOT NULL,
    adults           INTEGER NOT NULL CHECK (adults >= 1),
    children         INTEGER NOT NULL DEFAULT 0 CHECK (children >= 0),
    contact_phone    TEXT    NOT NULL,
    special_requests TEXT    NOT NULL DEFAULT '',
    total_amount     INTEGER NOT NULL,
    status           TEXT    NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    package_id INTEGER NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment    TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (user_id, package_id)
  );

  CREATE TABLE IF NOT EXISTS wishlist (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    package_id INTEGER NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, package_id)
  );

  CREATE TABLE IF NOT EXISTS enquiries (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    phone      TEXT NOT NULL DEFAULT '',
    subject    TEXT NOT NULL,
    message    TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'resolved')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_bookings_user    ON bookings(user_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_package ON bookings(package_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_package  ON reviews(package_id);
`);

export default db;
