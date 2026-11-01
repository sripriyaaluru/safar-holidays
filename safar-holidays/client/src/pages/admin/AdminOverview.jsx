import { Link } from 'react-router';
import { ErrorState, Loader } from '../../components/States.jsx';
import { useApi } from '../../lib/api.js';
import { STATUS_STYLES, formatDate, formatINR } from '../../lib/format.js';

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

  const { totals, byStatus, topPackages, recentBookings } = data;

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
        <Stat label="Customers" value={totals.customers} />
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
