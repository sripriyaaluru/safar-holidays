// Side-by-side comparison of up to three packages.
import { Check, X } from 'lucide-react';
import { Link } from 'react-router';
import Cover from '../components/Cover.jsx';
import Stars from '../components/Stars.jsx';
import { EmptyState, ErrorState, Loader } from '../components/States.jsx';
import { useCompare } from '../context/CompareContext.jsx';
import { useApi } from '../lib/api.js';
import { CATEGORY_LABELS, REGION_LABELS, formatINR, nightsLabel } from '../lib/format.js';

export default function Compare() {
  const { ids, remove, clear } = useCompare();
  const { data, error, loading, reload } = useApi(ids.length ? `/packages/compare?ids=${ids.join(',')}` : null);
  const packages = data?.packages || [];

  const cheapest = packages.length ? Math.min(...packages.map((p) => p.price)) : 0;
  const bestRated = packages.length ? Math.max(...packages.map((p) => p.rating)) : 0;
  const perDay = (p) => Math.round(p.price / p.duration_days);
  const bestPerDay = packages.length ? Math.min(...packages.map(perDay)) : 0;

  const rows = [
    ['Destination', (p) => `${p.destination}, ${p.country}`],
    ['Region', (p) => REGION_LABELS[p.region]],
    ['Trip type', (p) => CATEGORY_LABELS[p.category]],
    ['Duration', (p) => nightsLabel(p.duration_days)],
    [
      'Price per adult',
      (p) => (
        <span className={p.price === cheapest && packages.length > 1 ? 'font-bold text-leaf' : 'font-semibold'}>
          {formatINR(p.price)}
          {p.price === cheapest && packages.length > 1 && <span className="block text-xs">Lowest price</span>}
        </span>
      ),
    ],
    [
      'Price per day',
      (p) => (
        <span className={perDay(p) === bestPerDay && packages.length > 1 ? 'font-bold text-leaf' : ''}>
          {formatINR(perDay(p))}
          {perDay(p) === bestPerDay && packages.length > 1 && <span className="block text-xs">Best value</span>}
        </span>
      ),
    ],
    [
      'Rating',
      (p) => (
        <span>
          <Stars rating={p.rating} count={p.review_count} />
          {p.rating === bestRated && p.rating > 0 && packages.length > 1 && (
            <span className="block text-xs font-bold text-leaf">Top rated</span>
          )}
        </span>
      ),
    ],
    ['Group size', (p) => `Up to ${p.max_group_size}`],
    [
      'Highlights',
      (p) => (
        <ul className="space-y-1">
          {p.highlights.map((h) => (
            <li key={h} className="flex gap-1.5">
              <Check className="mt-0.5 size-4 shrink-0 text-leaf" aria-hidden />
              {h}
            </li>
          ))}
        </ul>
      ),
    ],
    [
      'Included',
      (p) => (
        <ul className="space-y-1">
          {p.inclusions.map((h) => (
            <li key={h} className="flex gap-1.5">
              <Check className="mt-0.5 size-4 shrink-0 text-leaf" aria-hidden />
              {h}
            </li>
          ))}
        </ul>
      ),
    ],
    [
      'Not included',
      (p) => (
        <ul className="space-y-1 text-ink-soft">
          {p.exclusions.map((h) => (
            <li key={h} className="flex gap-1.5">
              <X className="mt-0.5 size-4 shrink-0 text-sindoor" aria-hidden />
              {h}
            </li>
          ))}
        </ul>
      ),
    ],
  ];

  return (
    <div className="container-page pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold sm:text-5xl">Compare trips</h1>
          <p className="mt-2 text-slate">Pick up to three packages with the Compare button and see them side by side.</p>
        </div>
        {ids.length > 0 && (
          <button className="btn-ghost" onClick={clear}>
            Clear all
          </button>
        )}
      </div>

      <div className="mt-8">
        {ids.length === 0 && (
          <EmptyState title="Nothing to compare yet" action={<Link to="/packages" className="btn-primary">Browse packages</Link>}>
            Tap “Compare” on any package card to add it here.
          </EmptyState>
        )}
        {loading && !data && <Loader label="Loading trips" />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {packages.length > 0 && (
          <div className="overflow-x-auto rounded-3xl border border-line bg-white">
            <table className="w-full min-w-[720px] table-fixed text-left text-[15px]">
              <caption className="sr-only">Comparison of selected packages</caption>
              <thead>
                <tr>
                  <th scope="col" className="w-40 p-4">
                    <span className="sr-only">Feature</span>
                  </th>
                  {packages.map((p) => (
                    <th key={p.id} scope="col" className="p-4 align-top font-normal">
                      <Cover src={p.image_url} alt="" label={p.destination} className="aspect-[4/3] w-full rounded-2xl" />
                      <Link to={`/packages/${p.slug}`} className="mt-3 block font-display text-lg font-bold hover:text-peacock">
                        {p.title}
                      </Link>
                      <div className="mt-2 flex gap-3 text-sm">
                        <Link to={`/packages/${p.slug}#book`} className="link">
                          Book
                        </Link>
                        <button onClick={() => remove(p.id)} className="font-semibold text-sindoor hover:underline">
                          Remove
                        </button>
                      </div>
                    </th>
                  ))}
                  {packages.length < 3 && (
                    <th scope="col" className="p-4 align-top font-normal">
                      <Link
                        to="/packages"
                        className="grid aspect-[4/3] place-items-center rounded-2xl border-2 border-dashed border-line text-slate hover:border-ink"
                      >
                        + Add a trip
                      </Link>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(([label, render]) => (
                  <tr key={label}>
                    <th scope="row" className="bg-paper p-4 align-top text-sm font-semibold text-slate">
                      {label}
                    </th>
                    {packages.map((p) => (
                      <td key={p.id} className="p-4 align-top">
                        {render(p)}
                      </td>
                    ))}
                    {packages.length < 3 && <td />}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
