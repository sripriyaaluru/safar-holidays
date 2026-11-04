import { useState } from 'react';
import { Building2, Copy, Heart, Landmark, Mountain, Search, Trees, Waves } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import PackageCard from '../components/PackageCard.jsx';
import RecentlyViewed from '../components/RecentlyViewed.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Stars from '../components/Stars.jsx';
import { ErrorState, Loader } from '../components/States.jsx';
import { useApi } from '../lib/api.js';
import { CATEGORY_LABELS, couponLabel, formatDate, formatINR } from '../lib/format.js';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=2000&q=70';

const CATEGORY_ICONS = {
  beach: Waves,
  mountains: Mountain,
  heritage: Landmark,
  nature: Trees,
  honeymoon: Heart,
  city: Building2,
};

const BUDGETS = [
  { value: '', label: 'Any budget' },
  { value: '20000', label: 'Under ₹20,000' },
  { value: '35000', label: 'Under ₹35,000' },
  { value: '60000', label: 'Under ₹60,000' },
  { value: '100000', label: 'Under ₹1,00,000' },
];

function HeroSearch() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ search: '', region: '', maxPrice: '' });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function onSubmit(e) {
    e.preventDefault();
    const params = new URLSearchParams(Object.entries(form).filter(([, v]) => v));
    navigate(`/packages${params.size ? `?${params}` : ''}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-3xl bg-white p-4 shadow-[0_20px_50px_-28px_rgb(27_42_74/0.55)] sm:p-5 md:grid-cols-[1.6fr_1fr_1fr_auto] md:items-end"
      role="search"
    >
      <label className="block">
        <span className="field-label">Where to?</span>
        <input
          className="field"
          placeholder="Kerala, Bali, Dubai…"
          value={form.search}
          onChange={set('search')}
        />
      </label>
      <label className="block">
        <span className="field-label">Trip type</span>
        <select className="field" value={form.region} onChange={set('region')}>
          <option value="">India and abroad</option>
          <option value="domestic">Within India</option>
          <option value="international">International</option>
        </select>
      </label>
      <label className="block">
        <span className="field-label">Budget per person</span>
        <select className="field" value={form.maxPrice} onChange={set('maxPrice')}>
          {BUDGETS.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="btn-primary h-[46px] px-6">
        <Search className="size-4" aria-hidden />
        Find trips
      </button>
    </form>
  );
}

function Offers() {
  const { data } = useApi('/coupons');
  const toast = useToast();
  if (!data?.coupons?.length) return null;

  async function copy(code) {
    try {
      await navigator.clipboard.writeText(code);
      toast(`${code} copied. Paste it when you book.`);
    } catch {
      toast(`Use code ${code} when you book.`);
    }
  }

  return (
    <section className="container-page mt-24" aria-labelledby="offers-title">
      <h2 id="offers-title" className="text-3xl font-bold sm:text-4xl">
        Offers this month
      </h2>
      <p className="mt-2 text-slate">Apply a code in the booking panel of any package.</p>
      <ul className="mt-8 grid gap-4 md:grid-cols-3">
        {data.coupons.map((c) => (
          <li key={c.code} className="ticket flex flex-col p-5">
            <p className="font-display text-2xl font-extrabold text-peacock">{couponLabel(c)}</p>
            <p className="mt-1 flex-1 text-ink-soft">{c.description}</p>
            <p className="mt-2 text-sm text-slate">
              {c.min_amount > 0 ? `On bookings above ${formatINR(c.min_amount)}. ` : ''}
              {c.valid_until ? `Valid till ${formatDate(c.valid_until)}.` : ''}
            </p>
            <div className="ticket-tear mt-4 -mx-5" aria-hidden />
            <div className="mt-4 flex items-center justify-between">
              <span className="rounded-lg border-2 border-dashed border-marigold-deep px-3 py-1 font-display text-lg font-bold tracking-wider">
                {c.code}
              </span>
              <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => copy(c.code)}>
                <Copy className="size-4" aria-hidden />
                Copy
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Home() {
  const featured = useApi('/packages?featured=1&limit=6');
  const meta = useApi('/packages/meta');

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-ink">
        <img
          src={HERO_IMAGE}
          alt=""
          className="absolute inset-0 -z-10 size-full object-cover"
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
        <div className="absolute inset-0 -z-10 bg-linear-to-t from-ink via-ink/60 to-ink/10" />
        <div className="container-page pb-28 pt-24 sm:pb-36 sm:pt-32">
          <h1 className="max-w-3xl text-5xl font-extrabold text-white sm:text-7xl">Where to next?</h1>
          <p className="mt-5 max-w-xl text-lg text-white/85">
            Hand-planned holidays across India and abroad. Pick a package, choose your dates, and our team takes
            care of hotels, transfers and sightseeing.
          </p>
        </div>
      </section>

      <div className="container-page relative z-10 -mt-16 sm:-mt-20">
        <HeroSearch />
      </div>

      {/* Featured */}
      <section className="container-page mt-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold sm:text-4xl">Popular right now</h2>
            <p className="mt-2 text-slate">The trips our travellers are booking this season.</p>
          </div>
          <Link to="/packages" className="link">
            See all packages
          </Link>
        </div>
        <div className="mt-8">
          {featured.loading && !featured.data && <Loader label="Loading trips" />}
          {featured.error && <ErrorState message={featured.error} onRetry={featured.reload} />}
          {featured.data && (
            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {featured.data.packages.map((p) => (
                <PackageCard key={p.id} pkg={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      <RecentlyViewed />

      <Offers />

      {/* Categories */}
      {meta.data && (
        <section className="container-page mt-24">
          <h2 className="text-3xl font-bold sm:text-4xl">Pick the kind of trip</h2>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {meta.data.categories.map(({ category, count }) => {
              const Icon = CATEGORY_ICONS[category] || Mountain;
              return (
                <Link
                  key={category}
                  to={`/packages?category=${category}`}
                  className="group rounded-2xl border border-line bg-white p-4 hover:border-ink"
                >
                  <Icon className="size-6 text-peacock" aria-hidden />
                  <p className="mt-6 font-display text-lg font-bold">{CATEGORY_LABELS[category] || category}</p>
                  <p className="text-sm text-slate">
                    {count} {count === 1 ? 'trip' : 'trips'}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="mt-24 bg-white py-16">
        <div className="container-page">
          <h2 className="text-3xl font-bold sm:text-4xl">How booking works</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              ['Choose a package', 'Compare day-by-day plans, what is included, and reviews from people who went.'],
              ['Send your booking', 'Pick a start date and the number of travellers. You pay nothing at this step.'],
              ['We confirm within a day', 'Our team checks hotel availability, confirms your trip and shares payment details.'],
            ].map(([title, text], i) => (
              <li key={title} className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-marigold font-display text-lg font-bold">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-xl font-bold">{title}</h3>
                  <p className="mt-1.5 text-slate">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Reviews */}
      {meta.data?.recentReviews?.length > 0 && (
        <section className="container-page mt-24">
          <h2 className="text-3xl font-bold sm:text-4xl">From recent travellers</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {meta.data.recentReviews.map((r) => (
              <figure key={r.user_name + r.package_slug} className="flex flex-col rounded-3xl bg-peacock-soft p-6">
                <Stars rating={r.rating} showNumber={false} />
                <blockquote className="mt-4 flex-1 text-[17px] leading-relaxed">{r.comment}</blockquote>
                <figcaption className="mt-5 text-sm">
                  <span className="font-semibold">{r.user_name}</span>
                  <span className="text-slate"> on </span>
                  <Link className="link" to={`/packages/${r.package_slug}`}>
                    {r.package_title}
                  </Link>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* Custom trip */}
      <section className="container-page mt-24">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-ink px-6 py-10 text-white sm:px-10 md:flex-row md:items-center">
          <div>
            <h2 className="text-3xl font-bold">Planning something different?</h2>
            <p className="mt-2 max-w-xl text-white/80">
              Group tours, college trips, honeymoons with extra nights: tell us what you have in mind and we will
              build a plan around it.
            </p>
          </div>
          <Link to="/contact" className="btn-primary shrink-0">
            Ask for a custom trip
          </Link>
        </div>
      </section>
    </>
  );
}
