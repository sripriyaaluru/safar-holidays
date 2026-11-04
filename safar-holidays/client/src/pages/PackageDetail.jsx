import { useEffect } from 'react';
import { ArrowLeft, Check, Clock, MapPin, ShieldCheck, Users, X } from 'lucide-react';
import { Link, useParams } from 'react-router';
import CompareButton from '../components/CompareButton.jsx';
import PackageCard from '../components/PackageCard.jsx';
import RatingBreakdown from '../components/RatingBreakdown.jsx';
import ShareButton from '../components/ShareButton.jsx';
import BookingTicket from '../components/BookingTicket.jsx';
import Cover from '../components/Cover.jsx';
import Reviews from '../components/Reviews.jsx';
import SaveButton from '../components/SaveButton.jsx';
import Stars from '../components/Stars.jsx';
import { ErrorState, Loader } from '../components/States.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../lib/api.js';
import { CATEGORY_LABELS, REFUND_POLICY, formatINR, nightsLabel } from '../lib/format.js';
import { rememberViewed } from '../lib/storage.js';

export default function PackageDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  // Re-fetch when the user logs in or out, so wishlist and review options are correct.
  const { data, error, loading, reload } = useApi(`/packages/${slug}?viewer=${user?.id || 0}`);

  // Remember this trip for the "Recently viewed" row and set the browser tab title.
  useEffect(() => {
    if (!data?.package) return undefined;
    rememberViewed(data.package);
    const previous = document.title;
    document.title = `${data.package.title} | Safar Holidays`;
    return () => {
      document.title = previous;
    };
  }, [data?.package]);

  if (loading && !data) return <Loader label="Loading trip" />;
  if (error) {
    return (
      <div className="container-page py-16">
        <ErrorState message={error} onRetry={reload} />
        <p className="mt-6 text-center">
          <Link to="/packages" className="link">
            Browse all packages
          </Link>
        </p>
      </div>
    );
  }
  if (!data) return null;

  const { package: pkg, reviews, viewer, similar = [], ratingBreakdown = [] } = data;

  return (
    <div className="container-page pb-24 pt-8 lg:pb-0">
      <Link to="/packages" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden />
        All packages
      </Link>

      {!pkg.is_active && (
        <p className="mt-4 rounded-xl bg-marigold-soft px-4 py-3 text-sm font-semibold">
          This package is hidden from customers. Edit it in the admin area to show it again.
        </p>
      )}

      <header className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-slate">
            <MapPin className="size-4" aria-hidden />
            {pkg.destination}, {pkg.country}
          </p>
          <h1 className="mt-1 text-4xl font-extrabold sm:text-5xl">{pkg.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px]">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4 text-slate" aria-hidden />
              {nightsLabel(pkg.duration_days)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-4 text-slate" aria-hidden />
              Up to {pkg.max_group_size} per booking
            </span>
            <a href="#reviews" className="hover:underline">
              <Stars rating={pkg.rating} count={pkg.review_count} />
            </a>
            <span className="rounded-full bg-peacock-soft px-3 py-0.5 text-sm font-semibold text-peacock">
              {CATEGORY_LABELS[pkg.category] || pkg.category}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CompareButton pkg={pkg} className="py-2.5" />
          <ShareButton title={pkg.title} text={pkg.summary} />
          <SaveButton packageId={pkg.id} title={pkg.title} withLabel />
        </div>
      </header>

      <Cover
        src={pkg.image_url}
        alt={`${pkg.destination}`}
        label={pkg.destination}
        eager
        className="mt-6 aspect-[16/10] w-full rounded-3xl sm:aspect-[21/9]"
      />

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-14">
          <section>
            <h2 className="text-2xl font-bold">About this trip</h2>
            <p className="mt-3 max-w-[68ch] text-[17px] leading-relaxed text-ink-soft">{pkg.description}</p>
            {pkg.highlights.length > 0 && (
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {pkg.highlights.map((h) => (
                  <li key={h} className="flex gap-2.5">
                    <Check className="mt-0.5 size-5 shrink-0 text-leaf" aria-hidden />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {pkg.itinerary.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold">Day by day</h2>
              <ol className="mt-6">
                {pkg.itinerary.map((day, i) => (
                  <li key={i} className="relative flex gap-4 pb-7 last:pb-0">
                    {i < pkg.itinerary.length - 1 && (
                      <span className="absolute left-[21px] top-11 h-[calc(100%-2.75rem)] w-0.5 bg-line" aria-hidden />
                    )}
                    <span className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-ink bg-white font-display text-sm font-bold">
                      <span className="sr-only">Day </span>
                      {i + 1}
                    </span>
                    <div className="pt-2">
                      <h3 className="text-lg font-bold">{day.title}</h3>
                      {day.details && <p className="mt-1 text-ink-soft">{day.details}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="grid gap-8 sm:grid-cols-2">
            <div>
              <h2 className="text-xl font-bold">Included</h2>
              <ul className="mt-3 space-y-2.5">
                {pkg.inclusions.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <Check className="mt-0.5 size-5 shrink-0 text-leaf" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-bold">Not included</h2>
              <ul className="mt-3 space-y-2.5">
                {pkg.exclusions.map((item) => (
                  <li key={item} className="flex gap-2.5 text-ink-soft">
                    <X className="mt-0.5 size-5 shrink-0 text-sindoor" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section aria-labelledby="policy-title">
            <h2 id="policy-title" className="flex items-center gap-2 text-xl font-bold">
              <ShieldCheck className="size-5 text-peacock" aria-hidden />
              Cancellation policy
            </h2>
            <p className="mt-2 text-ink-soft">Cancel online from My trips. If you have already paid, you get back:</p>
            <table className="mt-3 w-full max-w-md text-left text-[15px]">
              <tbody className="divide-y divide-line">
                {REFUND_POLICY.map((t) => (
                  <tr key={t.minDays}>
                    <td className="py-2 pr-4">{t.label}</td>
                    <td className="py-2 text-right font-semibold tabular-nums">{t.percent}% refund</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {reviews.length > 0 && (
            <div className="max-w-md">
              <RatingBreakdown breakdown={ratingBreakdown} total={reviews.length} />
            </div>
          )}
          <Reviews pkg={pkg} reviews={reviews} viewer={viewer} onChanged={reload} />
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <BookingTicket pkg={pkg} />
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-20" aria-labelledby="similar-title">
          <h2 id="similar-title" className="text-2xl font-bold">
            You may also like
          </h2>
          <div className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((p) => (
              <PackageCard key={p.id} pkg={p} />
            ))}
          </div>
        </section>
      )}

      {/* Mobile: keep the price and a shortcut to the booking form in view */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white px-4 py-3 lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <p>
            <span className="font-display text-xl font-extrabold">{formatINR(pkg.price)}</span>
            <span className="text-sm text-slate"> per adult</span>
          </p>
          <a href="#book" className="btn-primary">
            Choose dates
          </a>
        </div>
      </div>
    </div>
  );
}
