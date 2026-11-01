import { Star } from 'lucide-react';

/** Read-only star rating, e.g. ★★★★☆ 4.5 (12) */
export default function Stars({ rating = 0, count, size = 'size-4', showNumber = true }) {
  if (!rating && count === 0) {
    return <span className="text-sm text-slate">No reviews yet</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm" aria-label={`Rated ${rating} out of 5`}>
      <span className="flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={`${size} ${n <= Math.round(rating) ? 'fill-marigold text-marigold' : 'fill-line text-line'}`}
          />
        ))}
      </span>
      {showNumber && (
        <span className="font-semibold text-ink">
          {Number(rating).toFixed(1)}
          {count !== undefined && <span className="font-normal text-slate"> ({count})</span>}
        </span>
      )}
    </span>
  );
}
