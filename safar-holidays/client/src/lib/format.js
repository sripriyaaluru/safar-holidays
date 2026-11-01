// Formatting helpers used across the site.

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
export const formatINR = (amount) => inr.format(amount || 0);

/** "2026-11-05" or "2026-11-05 10:30:00" -> "5 Nov 2026" */
export function formatDate(value, withWeekday = false) {
  if (!value) return '';
  const d = new Date(value.length <= 10 ? `${value}T00:00:00` : value.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withWeekday ? { weekday: 'short' } : {}),
  });
}

export const nightsLabel = (days) => `${days} days, ${Math.max(days - 1, 0)} nights`;

/** YYYY-MM-DD for today + n days (local time) */
export function dateFromToday(n = 0) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Adds days to a YYYY-MM-DD string */
export function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const CATEGORY_LABELS = {
  beach: 'Beaches',
  mountains: 'Mountains',
  heritage: 'Heritage',
  nature: 'Nature',
  honeymoon: 'Honeymoon',
  city: 'City breaks',
};

export const REGION_LABELS = { domestic: 'India', international: 'International' };

/** Children under 12 travel at half price (same rule as the server). */
export const tripTotal = (price, adults, children) => price * adults + Math.round(price * 0.5) * children;

export const STATUS_STYLES = {
  pending: { label: 'Awaiting confirmation', short: 'Pending', className: 'border-marigold-deep text-marigold-deep' },
  confirmed: { label: 'Confirmed', short: 'Confirmed', className: 'border-leaf text-leaf' },
  completed: { label: 'Completed', short: 'Completed', className: 'border-peacock text-peacock' },
  cancelled: { label: 'Cancelled', short: 'Cancelled', className: 'border-sindoor text-sindoor' },
};
