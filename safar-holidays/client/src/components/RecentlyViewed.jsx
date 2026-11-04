// Small row of packages the visitor opened recently (stored on this device).
import { useState } from 'react';
import { Link } from 'react-router';
import { clearRecentlyViewed, recentlyViewed } from '../lib/storage.js';
import { formatINR } from '../lib/format.js';
import Cover from './Cover.jsx';

export default function RecentlyViewed({ excludeId }) {
  const [items, setItems] = useState(() => recentlyViewed().filter((p) => p.id !== excludeId));
  if (items.length === 0) return null;

  return (
    <section className="container-page mt-20" aria-labelledby="recent-title">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="recent-title" className="text-2xl font-bold">
          Recently viewed
        </h2>
        <button
          className="text-sm font-semibold text-slate hover:text-ink"
          onClick={() => {
            clearRecentlyViewed();
            setItems([]);
          }}
        >
          Clear history
        </button>
      </div>
      <ul className="-mx-4 mt-5 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
        {items.map((p) => (
          <li key={p.id} className="w-56 shrink-0 snap-start">
            <Link to={`/packages/${p.slug}`} className="group block">
              <Cover src={p.image_url} alt="" label={p.destination} className="aspect-[4/3] w-full rounded-2xl" />
              <p className="mt-2 font-semibold group-hover:text-peacock">{p.title}</p>
              <p className="text-sm text-slate">
                {p.duration_days} days · {formatINR(p.price)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
