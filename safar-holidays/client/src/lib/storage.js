// Safe wrappers around localStorage: the site keeps working if storage is blocked
// (private windows, strict privacy settings).

export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

const RECENT_KEY = 'safar_recently_viewed';

/** Remembers the last 6 packages a visitor opened (newest first). */
export function rememberViewed(pkg) {
  const item = {
    id: pkg.id,
    slug: pkg.slug,
    title: pkg.title,
    destination: pkg.destination,
    image_url: pkg.image_url,
    price: pkg.price,
    duration_days: pkg.duration_days,
  };
  const list = readJSON(RECENT_KEY, []).filter((p) => p.id !== pkg.id);
  writeJSON(RECENT_KEY, [item, ...list].slice(0, 6));
}

export const recentlyViewed = () => readJSON(RECENT_KEY, []);
export const clearRecentlyViewed = () => writeJSON(RECENT_KEY, []);
