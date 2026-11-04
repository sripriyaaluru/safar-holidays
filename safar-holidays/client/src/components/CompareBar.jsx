// Floating tray listing the trips picked for comparison.
import { X } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { MAX_COMPARE, useCompare } from '../context/CompareContext.jsx';
import Cover from './Cover.jsx';

export default function CompareBar() {
  const { items, remove, clear } = useCompare();
  const { pathname } = useLocation();
  if (items.length === 0 || pathname === '/compare' || pathname.startsWith('/admin') || pathname.startsWith('/packages/')) {
    return null;
  }

  return (
    <>
    <div className="h-20" aria-hidden />
    <aside
      aria-label="Trips to compare"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 shadow-[0_-10px_30px_-20px_rgb(27_42_74/0.5)] backdrop-blur print:hidden"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
        <p className="text-sm font-semibold">
          Compare ({items.length}/{MAX_COMPARE})
        </p>
        <ul className="flex flex-1 flex-wrap gap-2">
          {items.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-full border border-line bg-paper py-1 pl-1 pr-2 text-sm">
              <Cover src={p.image_url} alt="" label={p.destination} small className="size-7 rounded-full" />
              <span className="max-w-36 truncate">{p.title}</span>
              <button onClick={() => remove(p.id)} className="rounded-full p-0.5 hover:bg-mist" aria-label={`Remove ${p.title} from comparison`}>
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <button onClick={clear} className="text-sm font-semibold text-slate hover:text-ink">
          Clear
        </button>
        <Link to="/compare" className={`btn-dark py-2 ${items.length < 2 ? 'pointer-events-none opacity-50' : ''}`} aria-disabled={items.length < 2}>
          Compare now
        </Link>
      </div>
    </aside>
    </>
  );
}
