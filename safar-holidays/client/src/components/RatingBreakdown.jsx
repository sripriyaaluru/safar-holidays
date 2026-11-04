// Bars showing how many reviews gave 5, 4, 3, 2 and 1 stars.
export default function RatingBreakdown({ breakdown = [], total = 0 }) {
  if (!total) return null;
  return (
    <dl className="space-y-1.5" aria-label="Rating breakdown">
      {breakdown.map(({ stars, count }) => {
        const pct = Math.round((count / total) * 100);
        return (
          <div key={stars} className="grid grid-cols-[3.5rem_1fr_2.5rem] items-center gap-3 text-sm">
            <dt className="text-slate">{stars} star</dt>
            <dd className="h-2.5 overflow-hidden rounded-full bg-mist">
              <span className="block h-full rounded-full bg-marigold" style={{ width: `${pct}%` }} />
            </dd>
            <dd className="text-right tabular-nums text-slate">{count}</dd>
          </div>
        );
      })}
    </dl>
  );
}
