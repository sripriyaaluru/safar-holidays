import { Plus } from 'lucide-react';
import { Link } from 'react-router';
import Cover from '../../components/Cover.jsx';
import { ErrorState, Loader } from '../../components/States.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api, useApi } from '../../lib/api.js';
import { CATEGORY_LABELS, REGION_LABELS, formatINR } from '../../lib/format.js';
import { toPayload } from './packagePayload.js';

export default function AdminPackages() {
  const toast = useToast();
  const { data, error, loading, reload } = useApi('/admin/packages');

  async function toggleVisibility(pkg) {
    try {
      await api(`/packages/${pkg.id}`, { method: 'PUT', body: { ...toPayload(pkg), is_active: !pkg.is_active } });
      toast(pkg.is_active ? `${pkg.title} is now hidden` : `${pkg.title} is live again`);
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function remove(pkg) {
    if (!window.confirm(`Delete "${pkg.title}"? Packages with bookings are hidden instead of deleted.`)) return;
    try {
      const res = await api(`/packages/${pkg.id}`, { method: 'DELETE' });
      toast(res.message);
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-slate">{data ? `${data.packages.length} packages` : ' '}</p>
        <Link to="/admin/packages/new" className="btn-primary">
          <Plus className="size-4" aria-hidden />
          Add package
        </Link>
      </div>

      <div className="mt-5">
        {loading && !data && <Loader />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {data && (
          <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[820px] text-left text-[15px]">
              <thead className="border-b border-line text-sm text-slate">
                <tr>
                  <th className="px-4 py-3 font-semibold">Package</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 text-right font-semibold">Price</th>
                  <th className="px-4 py-3 text-right font-semibold">Bookings</th>
                  <th className="px-4 py-3 font-semibold">Visibility</th>
                  <th className="px-4 py-3 font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.packages.map((p) => (
                  <tr key={p.id} className={p.is_active ? '' : 'bg-mist/60'}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Cover src={p.image_url} alt="" label={p.destination} small className="size-12 shrink-0 rounded-lg" />
                        <div>
                          <Link to={`/packages/${p.slug}`} className="font-semibold hover:text-peacock">
                            {p.title}
                          </Link>
                          <p className="text-sm text-slate">
                            {p.destination}, {p.duration_days} days
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {REGION_LABELS[p.region]}
                      <br />
                      <span className="text-slate">{CATEGORY_LABELS[p.category]}</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatINR(p.price)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{p.booking_count}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`font-semibold ${p.is_active ? 'text-leaf' : 'text-slate'}`}>
                        {p.is_active ? 'Live' : 'Hidden'}
                      </span>
                      {p.featured && <span className="ml-2 rounded-full bg-marigold-soft px-2 py-0.5 font-semibold">Featured</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-3 text-sm">
                        <Link to={`/admin/packages/${p.id}/edit`} className="link">
                          Edit
                        </Link>
                        <button onClick={() => toggleVisibility(p)} className="link">
                          {p.is_active ? 'Hide' : 'Show'}
                        </button>
                        <button onClick={() => remove(p)} className="font-semibold text-sindoor hover:underline">
                          Delete
                        </button>
                      </div>
                    </td>
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
