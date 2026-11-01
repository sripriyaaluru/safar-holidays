// The fields the API accepts when creating or updating a package.
export const PACKAGE_FIELDS = [
  'title',
  'destination',
  'country',
  'region',
  'category',
  'duration_days',
  'price',
  'image_url',
  'summary',
  'description',
  'highlights',
  'inclusions',
  'exclusions',
  'itinerary',
  'max_group_size',
  'featured',
  'is_active',
];

export function toPayload(pkg) {
  return Object.fromEntries(PACKAGE_FIELDS.map((k) => [k, pkg[k] ?? '']));
}
