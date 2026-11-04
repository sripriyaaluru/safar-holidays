import { Clock } from 'lucide-react';
import { Link } from 'react-router';
import { formatINR } from '../lib/format.js';
import CompareButton from './CompareButton.jsx';
import Cover from './Cover.jsx';
import SaveButton from './SaveButton.jsx';
import Stars from './Stars.jsx';

export default function PackageCard({ pkg }) {
  const href = `/packages/${pkg.slug}`;
  return (
    <article className="relative flex flex-col">
      <Link to={href} className="block overflow-hidden rounded-2xl" tabIndex={-1} aria-hidden>
        <Cover src={pkg.image_url} alt="" label={pkg.destination} className="aspect-[4/3] w-full" />
      </Link>
      <SaveButton packageId={pkg.id} title={pkg.title} className="absolute right-3 top-3" />

      <div className="mt-3 flex-1">
        <p className="text-sm text-slate">
          {pkg.destination}
          {pkg.region === 'international' && `, ${pkg.country}`}
        </p>
        <h3 className="mt-0.5 text-lg font-bold">
          <Link to={href} className="hover:text-peacock">
            {pkg.title}
          </Link>
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4" aria-hidden />
            {pkg.duration_days} days
          </span>
          <Stars rating={pkg.rating} count={pkg.review_count} />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
        <p>
          <span className="font-display text-xl font-bold">{formatINR(pkg.price)}</span>
          <span className="text-sm text-slate"> per person</span>
        </p>
        <CompareButton pkg={pkg} />
      </div>
    </article>
  );
}
