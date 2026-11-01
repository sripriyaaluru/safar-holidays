// Shared SQL and shaping helpers for tour packages.

export const CATEGORIES = ['beach', 'mountains', 'heritage', 'nature', 'honeymoon', 'city'];

/** SELECT that adds average rating, review count and booking count to each package row. */
export const PACKAGE_SELECT = `
  SELECT p.*,
         COALESCE(r.avg_rating, 0)    AS rating,
         COALESCE(r.review_count, 0)  AS review_count,
         COALESCE(b.booking_count, 0) AS booking_count
    FROM packages p
    LEFT JOIN (
      SELECT package_id, ROUND(AVG(rating), 1) AS avg_rating, COUNT(*) AS review_count
        FROM reviews GROUP BY package_id
    ) r ON r.package_id = p.id
    LEFT JOIN (
      SELECT package_id, COUNT(*) AS booking_count
        FROM bookings WHERE status != 'cancelled' GROUP BY package_id
    ) b ON b.package_id = p.id
`;

const parse = (text) => {
  try {
    return JSON.parse(text || '[]');
  } catch {
    return [];
  }
};

/** Short form used for cards and lists. */
export function toCard(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    destination: row.destination,
    country: row.country,
    region: row.region,
    category: row.category,
    duration_days: row.duration_days,
    price: row.price,
    image_url: row.image_url,
    summary: row.summary,
    featured: Boolean(row.featured),
    is_active: Boolean(row.is_active),
    rating: row.rating ?? 0,
    review_count: row.review_count ?? 0,
    booking_count: row.booking_count ?? 0,
  };
}

/** Full form used on the package detail page and in the admin editor. */
export function toDetail(row) {
  return {
    ...toCard(row),
    description: row.description,
    highlights: parse(row.highlights),
    itinerary: parse(row.itinerary),
    inclusions: parse(row.inclusions),
    exclusions: parse(row.exclusions),
    max_group_size: row.max_group_size,
    created_at: row.created_at,
  };
}

export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Price for a group: children (under 12) travel at half price. */
export function calculateTotal(pricePerAdult, adults, children) {
  return pricePerAdult * adults + Math.round(pricePerAdult * 0.5) * children;
}
