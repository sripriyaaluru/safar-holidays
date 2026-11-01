import { useEffect, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useSearchParams } from 'react-router';
import PackageCard from '../components/PackageCard.jsx';
import { EmptyState, ErrorState, Loader } from '../components/States.jsx';
import { useApi } from '../lib/api.js';
import { CATEGORY_LABELS } from '../lib/format.js';

const FILTER_KEYS = ['search', 'region', 'category', 'maxPrice', 'maxDays', 'sort'];

const BUDGETS = [
  ['', 'Any budget'],
  ['20000', 'Under ₹20,000'],
  ['35000', 'Under ₹35,000'],
  ['60000', 'Under ₹60,000'],
  ['100000', 'Under ₹1,00,000'],
];

const DURATIONS = [
  ['', 'Any length'],
  ['4', 'Up to 4 days'],
  ['6', 'Up to 6 days'],
  ['8', 'Up to 8 days'],
];

const SORTS = [
  ['popular', 'Most popular'],
  ['price_asc', 'Price: low to high'],
  ['price_desc', 'Price: high to low'],
  ['duration', 'Shortest first'],
  ['rating', 'Best rated'],
];

function RadioGroup({ label, name, value, options, onChange }) {
  return (
    <fieldset>
      <legend className="field-label">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([v, text]) => (
          <label
            key={v}
            className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-semibold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-peacock ${
              value === v ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:border-ink'
            }`}
          >
            <input
              type="radio"
              className="sr-only"
              name={name}
              value={v}
              checked={value === v}
              onChange={() => onChange(v)}
            />
            {text}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function Packages() {
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const get = (k) => params.get(k) || '';

  // Keep the search box responsive: update the URL 350ms after the user stops typing.
  const [searchText, setSearchText] = useState(get('search'));
  useEffect(() => {
    const fromUrl = params.get('search') || '';
    setSearchText((current) => (current.trim() === fromUrl ? current : fromUrl));
  }, [params]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchText.trim() !== get('search')) update('search', searchText.trim());
    }, 350);
    return () => clearTimeout(t);
  }, [searchText]); // eslint-disable-line react-hooks/exhaustive-deps

  function update(key, value) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  }

  const query = new URLSearchParams(FILTER_KEYS.filter((k) => get(k)).map((k) => [k, get(k)])).toString();
  const { data, error, loading, reload } = useApi(`/packages${query ? `?${query}` : ''}`);
  const meta = useApi('/packages/meta');
  const activeFilters = FILTER_KEYS.filter((k) => k !== 'sort' && get(k)).length;

  return (
    <div className="container-page pt-10">
      <h1 className="text-4xl font-extrabold sm:text-5xl">Tour packages</h1>
      <p className="mt-2 text-slate">
        Prices are per adult and include hotels, transfers and the sightseeing listed in each plan.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Filters */}
        <div>
          <button
            className="btn-ghost w-full lg:hidden"
            onClick={() => setShowFilters((s) => !s)}
            aria-expanded={showFilters}
            aria-controls="filters"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            {showFilters ? 'Hide filters' : `Filters${activeFilters ? ` (${activeFilters})` : ''}`}
          </button>

          <aside
            id="filters"
            className={`${showFilters ? 'mt-4 block' : 'hidden'} space-y-6 rounded-3xl border border-line bg-white p-5 lg:sticky lg:top-24 lg:mt-0 lg:block`}
            aria-label="Filters"
          >
            <label className="block">
              <span className="field-label">Search</span>
              <input
                type="search"
                className="field"
                placeholder="Place or trip name"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </label>

            <RadioGroup
              label="Where"
              name="region"
              value={get('region')}
              onChange={(v) => update('region', v)}
              options={[
                ['', 'Anywhere'],
                ['domestic', 'India'],
                ['international', 'Abroad'],
              ]}
            />

            <label className="block">
              <span className="field-label">Trip type</span>
              <select className="field" value={get('category')} onChange={(e) => update('category', e.target.value)}>
                <option value="">All trip types</option>
                {(meta.data?.categories || []).map((c) => (
                  <option key={c.category} value={c.category}>
                    {CATEGORY_LABELS[c.category] || c.category} ({c.count})
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="field-label">Budget per person</span>
              <select className="field" value={get('maxPrice')} onChange={(e) => update('maxPrice', e.target.value)}>
                {BUDGETS.map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="field-label">Trip length</span>
              <select className="field" value={get('maxDays')} onChange={(e) => update('maxDays', e.target.value)}>
                {DURATIONS.map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            {activeFilters > 0 && (
              <button className="link text-sm" onClick={() => setParams({}, { replace: true })}>
                Clear all filters
              </button>
            )}
          </aside>
        </div>

        {/* Results */}
        <section aria-live="polite" aria-busy={loading}>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-slate">
              {data ? `${data.count} ${data.count === 1 ? 'trip' : 'trips'} found` : ' '}
            </p>
            <label className="flex items-center gap-2 text-sm">
              <span className="font-semibold">Sort by</span>
              <select
                className="field w-auto py-2"
                value={get('sort') || 'popular'}
                onChange={(e) => update('sort', e.target.value === 'popular' ? '' : e.target.value)}
              >
                {SORTS.map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading && !data && <Loader label="Finding trips" />}
          {error && <ErrorState message={error} onRetry={reload} />}
          {data && data.count === 0 && (
            <EmptyState
              title="No trips match these filters"
              action={
                <button className="btn-dark" onClick={() => setParams({}, { replace: true })}>
                  Clear filters
                </button>
              }
            >
              Try a bigger budget, a longer trip length, or search for a different place.
            </EmptyState>
          )}
          {data && data.count > 0 && (
            <div className={`grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3 ${loading ? 'opacity-60' : ''}`}>
              {data.packages.map((p) => (
                <PackageCard key={p.id} pkg={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
