import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { EmptyState, ErrorState, Loader } from '../../components/States.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Download } from 'lucide-react';
import { api, download, useApi } from '../../lib/api.js';
import { PAYMENT_STYLES, STATUS_STYLES, dateFromToday, formatDate, formatINR } from '../../lib/format.js';

const TABS = ['', 'pending', 'confirmed', 'completed', 'cancelled'];

export default function AdminBookings() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const payment = params.get('payment') || '';
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const query = new URLSearchParams(Object.entries({ status, payment, search: debounced }).filter(([, v]) => v)).toString();

  async function exportCsv() {
    try {
      await download(`/admin/bookings.csv${query ? `?${query}` : ''}`, `bookings-${dateFromToday(0)}.csv`);
      toast('Bookings exported');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function setFilter(key, value) {
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
  const { data, error, loading, reload, setData } = useApi(`/admin/bookings${query ? `?${query}` : ''}`);

  async function changeStatus(booking, newStatus) {
    try {
      const res = await api(`/admin/bookings/${booking.id}`, { method: 'PATCH', body: { status: newStatus } });
      setData((d) => ({
        ...d,
        bookings: d.bookings.map((b) => (b.id === booking.id ? { ...b, ...res } : b)),
      }));
      toast(`${booking.booking_ref} marked as ${STATUS_STYLES[newStatus].short.toLowerCase()}`);
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
          {TABS.map((t) => (
            <button
              key={t || 'all'}
              role="tab"
              aria-selected={status === t}
              onClick={() => setFilter('status', t)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
                status === t ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-ink'
              }`}
            >
              {t ? STATUS_STYLES[t].short : 'All'}
            </button>
          ))}
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
        <label>
          <span className="sr-only">Payment</span>
          <select className="field py-2" value={payment} onChange={(e) => setFilter('payment', e.target.value)}>
            <option value="">Any payment</option>
            <option value="unpaid">Not paid</option>
            <option value="paid">Paid</option>
            <option value="refunded">Refunded</option>
          </select>
        </label>
        <label className="min-w-0 flex-1 sm:w-56">
          <span className="sr-only">Search bookings</span>
          <input
            type="search"
            className="field py-2"
            placeholder="Ref, customer or package"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button className="btn-ghost py-2" onClick={exportCsv}>
          <Download className="size-4" aria-hidden />
          CSV
        </button>
        </div>
      </div>

      <div className="mt-5">
        {loading && !data && <Loader />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {data && data.bookings.length === 0 && <EmptyState title="No bookings match">Try another status or search.</EmptyState>}
        {data && data.bookings.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[980px] text-left text-[15px]">
              <thead className="border-b border-line text-sm text-slate">
                <tr>
                  <th className="px-4 py-3 font-semibold">Booking</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Package</th>
                  <th className="px-4 py-3 font-semibold">Travel date</th>
                  <th className="px-4 py-3 font-semibold">People</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Payment</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line align-top">
                {data.bookings.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{b.booking_ref}</p>
                      <p className="text-sm text-slate">Booked {formatDate(b.created_at)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{b.customer_name}</p>
                      <p className="text-sm text-slate">{b.customer_email}</p>
                      <p className="text-sm text-slate">{b.contact_phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/packages/${b.package_slug}`} className="hover:text-peacock">
                        {b.package_title}
                      </Link>
                      {b.special_requests && (
                        <p className="mt-1 max-w-56 text-sm text-slate">Note: {b.special_requests}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">{formatDate(b.travel_date)}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {b.adults}A{b.children > 0 && ` + ${b.children}C`}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatINR(b.total_amount)}
                      {b.coupon_code && <p className="text-xs text-leaf">{b.coupon_code}</p>}
                    </td>
                    <td className={`px-4 py-3 text-sm font-semibold ${(PAYMENT_STYLES[b.payment_status] || PAYMENT_STYLES.unpaid).className}`}>
                      {(PAYMENT_STYLES[b.payment_status] || PAYMENT_STYLES.unpaid).label}
                      {b.refund_amount > 0 && <p className="text-xs font-normal">{formatINR(b.refund_amount)} back</p>}
                    </td>
                    <td className="px-4 py-3">
                      <label>
                        <span className="sr-only">Status for {b.booking_ref}</span>
                        <select
                          className={`field w-36 py-1.5 font-semibold ${STATUS_STYLES[b.status].className.split(' ')[1]}`}
                          value={b.status}
                          onChange={(e) => changeStatus(b, e.target.value)}
                        >
                          {Object.entries(STATUS_STYLES).map(([value, s]) => (
                            <option key={value} value={value}>
                              {s.short}
                            </option>
                          ))}
                        </select>
                      </label>
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
