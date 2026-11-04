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

export const PAYMENT_STYLES = {
  unpaid: { label: 'Not paid', className: 'text-slate' },
  paid: { label: 'Paid', className: 'text-leaf' },
  refunded: { label: 'Refunded', className: 'text-peacock' },
};

/** Whole days from today until an ISO date (negative if it has passed). */
export function daysUntil(iso) {
  const today = new Date(`${dateFromToday(0)}T00:00:00`);
  const target = new Date(`${iso}T00:00:00`);
  return Math.round((target - today) / 86400000);
}

/** Same refund tiers as the server (server/src/utils/bookings.js). */
export const REFUND_POLICY = [
  { minDays: 30, percent: 100, label: '30 or more days before the trip' },
  { minDays: 15, percent: 75, label: '15 to 29 days before' },
  { minDays: 7, percent: 50, label: '7 to 14 days before' },
  { minDays: 0, percent: 0, label: 'Less than 7 days before' },
];

export function refundEstimate(booking) {
  if (booking.payment_status !== 'paid') return { percent: 0, amount: 0 };
  const days = daysUntil(booking.travel_date);
  const tier = REFUND_POLICY.find((t) => days >= t.minDays) || { percent: 0 };
  return { percent: tier.percent, amount: Math.round((booking.total_amount * tier.percent) / 100) };
}

/** "3 hours ago", "2 days ago" … for notifications */
export function timeAgo(value) {
  if (!value) return '';
  const d = new Date(value.replace(' ', 'T') + (value.length > 10 && !value.endsWith('Z') ? 'Z' : ''));
  const seconds = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [name, size] of units) {
    const n = Math.floor(seconds / size);
    if (n >= 1) return `${n} ${name}${n > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

/** Describes a coupon in one short line: "10% off (up to ₹5,000)" */
export function couponLabel(c) {
  const main = c.discount_type === 'percent' ? `${c.discount_value}% off` : `${formatINR(c.discount_value)} off`;
  const cap = c.discount_type === 'percent' && c.max_discount > 0 ? ` (up to ${formatINR(c.max_discount)})` : '';
  return main + cap;
}
