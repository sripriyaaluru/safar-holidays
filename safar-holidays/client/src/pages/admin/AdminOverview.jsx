import { Link } from 'react-router';
import { ErrorState, Loader } from '../../components/States.jsx';
import { useApi } from '../../lib/api.js';
import { CATEGORY_LABELS, STATUS_STYLES, formatDate, formatINR } from '../../lib/format.js';

/** Simple bar chart drawn with CSS: one bar per month. */
function MonthlyChart({ monthly }) {
  const max = Math.max(1, ...monthly.map((m) => m.revenue));
  return (
    <figure>
      <div className="flex h-48 items-end gap-3" role="img" aria-label={`Confirmed revenue for the last ${monthly.length} months`}>
        {monthly.map((m) => (
          <div key={m.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-xs font-semibold tabular-nums text-slate">
              {m.revenue ? `₹${Math.round(m.revenue / 1000)}k` : ''}
            </span>
            <div
              className="w-full max-w-14 rounded-t-lg bg-peacock"
              style={{ height: `${Math.max(2, (m.revenue / max) * 100)}%` }}
              title={`${m.label}: ${formatINR(m.revenue)}, ${m.bookings} bookings`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-3 border-t border-line pt-2">
        {monthly.map((m) => (
          <span key={m.month} className="flex-1 text-center text-sm text-slate">
            {m.label}
            <span className="block text-xs">{m.bookings} bkg</span>
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Monthly revenue</caption>
        <tbody>
          {monthly.map((m) => (
            <tr key={m.month}>
              <th>{m.label}</th>
              <td>{formatINR(m.revenue)}</td>
              <td>{m.bookings} bookings</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function Stat({ label, value, children }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="text-sm text-slate">{label}</p>
      <p className="mt-1 font-display text-3xl font-extrabold">{value}</p>
      {children && <div className="mt-1 text-sm">{children}</div>}
    </div>
  );
}

export default function AdminOverview() {
  const { data, error, loading, reload } = useApi('/admin/stats');

  if (loading && !data) return <Loader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const { totals, byStatus, topPackages, recentBookings, monthly = [], payments, byCategory = [] } = data;
  const categoryMax = Math.max(1, ...byCategory.map((c) => c.bookings));

  return (
    <div className="space-y-10">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label="Confirmed revenue" value={formatINR(totals.revenue)}>
          <span className="text-slate">From confirmed and completed trips</span>
        </Stat>
        <Stat label="Bookings" value={totals.bookings}>
          {totals.pendingBookings > 0 ? (
            <Link to="/admin/bookings?status=pending" className="link">
              {totals.pendingBookings} waiting for confirmation
            </Link>
          ) : (
            <span className="text-slate">None waiting</span>
          )}
        </Stat>
        <Stat label="Customers" value={totals.customers}>
          <span className="text-slate">
            {totals.subscribers ?? 0} newsletter subscribers · avg rating {totals.avgRating ?? 0}
          </span>
        </Stat>
        <Stat label="Live packages" value={totals.packages}>
          <Link to="/admin/packages/new" className="link">
            Add a package
          </Link>
        </Stat>
        <Stat label="New enquiries" value={totals.newEnquiries}>
          <Link to="/admin/enquiries" className="link">
            Read enquiries
          </Link>
        </Stat>
        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="text-sm text-slate">Bookings by status</p>
          <ul className="mt-3 space-y-1.5">
            {Object.entries(byStatus).map(([status, count]) => (
              <li key={status} className="flex items-center justify-between">
                <span className={`text-sm font-semibold ${STATUS_STYLES[status].className.split(' ')[1]}`}>
                  {STATUS_STYLES[status].short}
                </span>
                <span className="font-semibold">{count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="text-lg font-bold">Revenue, last 6 months</h2>
          <div className="mt-4">
            <MonthlyChart monthly={monthly} />
          </div>
        </section>
        <section className="space-y-4">
          {payments && (
            <div className="rounded-2xl border border-line bg-white p-5">
              <h2 className="text-lg font-bold">Payments</h2>
              <dl className="mt-3 space-y-2 text-[15px]">
                <div className="flex justify-between">
                  <dt className="text-slate">Collected online</dt>
                  <dd className="font-semibold text-leaf tabular-nums">{formatINR(payments.paid)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate">Due (confirmed, unpaid)</dt>
                  <dd className="font-semibold text-marigold-deep tabular-nums">{formatINR(payments.due)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate">Refunded</dt>
                  <dd className="font-semibold text-peacock tabular-nums">{formatINR(payments.refunded)}</dd>
                </div>
              </dl>
            </div>
          )}
          <div className="rounded-2xl border border-line bg-white p-5">
            <h2 className="text-lg font-bold">Bookings by trip type</h2>
            <ul className="mt-3 space-y-2">
              {byCategory.map((c) => (
                <li key={c.category} className="grid grid-cols-[6rem_1fr_2rem] items-center gap-2 text-sm">
                  <span>{CATEGORY_LABELS[c.category] || c.category}</span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-mist">
                    <span className="block h-full rounded-full bg-marigold" style={{ width: `${(c.bookings / categoryMax) * 100}%` }} />
                  </span>
                  <span className="text-right tabular-nums">{c.bookings}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <section>
        <h2 className="text-xl font-bold">Top packages</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[480px] text-left text-[15px]">
            <thead className="border-b border-line text-sm text-slate">
              <tr>
                <th className="px-4 py-3 font-semibold">Package</th>
                <th className="px-4 py-3 text-right font-semibold">Bookings</th>
                <th className="px-4 py-3 text-right font-semibold">Confirmed revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {topPackages.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <Link to={`/packages/${p.slug}`} className="font-semibold hover:text-peacock">
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.bookings}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatINR(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-bold">Latest bookings</h2>
          <Link to="/admin/bookings" className="link text-sm">
            All bookings
          </Link>
        </div>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[640px] text-left text-[15px]">
            <thead className="border-b border-line text-sm text-slate">
              <tr>
                <th className="px-4 py-3 font-semibold">Ref</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Package</th>
                <th className="px-4 py-3 font-semibold">Travel date</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {recentBookings.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3 font-semibold">{b.booking_ref}</td>
                  <td className="px-4 py-3">{b.customer_name}</td>
                  <td className="px-4 py-3">{b.package_title}</td>
                  <td className="px-4 py-3">{formatDate(b.travel_date)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatINR(b.total_amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`stamp rotate-0 text-xs ${STATUS_STYLES[b.status].className}`}>
                      {STATUS_STYLES[b.status].short}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
