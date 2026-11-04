// Printable tax invoice for a paid booking.
import { Printer } from 'lucide-react';
import { Link, useParams } from 'react-router';
import Logo from '../components/Logo.jsx';
import { ErrorState, Loader } from '../components/States.jsx';
import { useApi } from '../lib/api.js';
import { addDays, formatDate, formatINR } from '../lib/format.js';

const GST_RATE = 5; // Tour operator services: 5% GST, included in the package price

export default function Invoice() {
  const { id } = useParams();
  const { data, error, loading, reload } = useApi(`/bookings/${id}`);

  if (loading && !data) return <Loader label="Loading invoice" />;
  if (error) {
    return (
      <div className="container-page py-16">
        <ErrorState message={error} onRetry={reload} />
      </div>
    );
  }
  if (!data) return null;

  const { booking, payments, customer } = data;
  const payment = payments.find((p) => p.kind === 'payment');
  const refunds = payments.filter((p) => p.kind === 'refund');
  const subtotal = booking.total_amount + booking.discount_amount;
  const childPrice = Math.round(booking.price_per_person * 0.5);
  const taxable = Math.round((booking.total_amount * 100) / (100 + GST_RATE));
  const gst = booking.total_amount - taxable;

  if (!payment) {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-lg">An invoice is created once the booking is paid.</p>
        <Link to="/trips" className="btn-dark mt-6">
          Back to my trips
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page max-w-3xl pt-8">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link to="/trips" className="text-sm font-semibold text-slate hover:text-ink">
          ← Back to my trips
        </Link>
        <button className="btn-dark" onClick={() => window.print()}>
          <Printer className="size-4" aria-hidden />
          Print or save as PDF
        </button>
      </div>

      <article className="mt-6 rounded-3xl border border-line bg-white p-6 sm:p-10 print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
          <div>
            <Logo />
            <p className="mt-3 text-sm text-slate">
              Safar Holidays Pvt. Ltd.
              <br />
              MG Road, Bengaluru, Karnataka 560001
              <br />
              GSTIN 29ABCDE1234F1Z5 (sample)
            </p>
          </div>
          <div className="text-right">
            <h1 className="text-3xl font-extrabold">Tax invoice</h1>
            <p className="mt-2 text-sm">
              Invoice no. <strong>INV-{booking.booking_ref.slice(4)}</strong>
            </p>
            <p className="text-sm">Date: {formatDate(booking.paid_at || payment.created_at)}</p>
            {booking.payment_status === 'refunded' && (
              <span className="stamp mt-3 border-peacock text-peacock">Refunded</span>
            )}
            {booking.payment_status === 'paid' && <span className="stamp mt-3 border-leaf text-leaf">Paid</span>}
          </div>
        </header>

        <section className="grid gap-6 border-b border-line py-6 sm:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate">Billed to</h2>
            <p className="mt-1 font-semibold">{customer.name}</p>
            <p className="text-sm">{customer.email}</p>
            <p className="text-sm">{booking.contact_phone}</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate">Trip</h2>
            <p className="mt-1 font-semibold">{booking.package_title}</p>
            <p className="text-sm">
              {formatDate(booking.travel_date)} to {formatDate(addDays(booking.travel_date, booking.duration_days - 1))}
            </p>
            <p className="text-sm">Booking ref {booking.booking_ref}</p>
          </div>
        </section>

        <table className="mt-6 w-full text-left text-[15px]">
          <thead className="border-b border-line text-sm text-slate">
            <tr>
              <th className="py-2 font-semibold">Description</th>
              <th className="py-2 text-right font-semibold">Qty</th>
              <th className="py-2 text-right font-semibold">Rate</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            <tr>
              <td className="py-2.5">Adult, {booking.package_title}</td>
              <td className="py-2.5 text-right tabular-nums">{booking.adults}</td>
              <td className="py-2.5 text-right tabular-nums">{formatINR(booking.price_per_person)}</td>
              <td className="py-2.5 text-right tabular-nums">{formatINR(booking.price_per_person * booking.adults)}</td>
            </tr>
            {booking.children > 0 && (
              <tr>
                <td className="py-2.5">Child under 12 (50%)</td>
                <td className="py-2.5 text-right tabular-nums">{booking.children}</td>
                <td className="py-2.5 text-right tabular-nums">{formatINR(childPrice)}</td>
                <td className="py-2.5 text-right tabular-nums">{formatINR(childPrice * booking.children)}</td>
              </tr>
            )}
          </tbody>
        </table>

        <dl className="ml-auto mt-4 max-w-xs space-y-1.5 text-[15px]">
          <div className="flex justify-between">
            <dt className="text-slate">Subtotal</dt>
            <dd className="tabular-nums">{formatINR(subtotal)}</dd>
          </div>
          {booking.discount_amount > 0 && (
            <div className="flex justify-between text-leaf">
              <dt>Discount ({booking.coupon_code})</dt>
              <dd className="tabular-nums">−{formatINR(booking.discount_amount)}</dd>
            </div>
          )}
          <div className="flex justify-between text-sm text-slate">
            <dt>Taxable value</dt>
            <dd className="tabular-nums">{formatINR(taxable)}</dd>
          </div>
          <div className="flex justify-between text-sm text-slate">
            <dt>GST {GST_RATE}% (included)</dt>
            <dd className="tabular-nums">{formatINR(gst)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2 font-display text-xl font-extrabold">
            <dt>Total paid</dt>
            <dd className="tabular-nums">{formatINR(booking.total_amount)}</dd>
          </div>
          {refunds.map((r) => (
            <div key={r.id} className="flex justify-between text-peacock">
              <dt>Refund {formatDate(r.created_at)}</dt>
              <dd className="tabular-nums">−{formatINR(r.amount)}</dd>
            </div>
          ))}
        </dl>

        <section className="mt-8 rounded-2xl bg-mist p-4 text-sm">
          <p>
            <strong>Payment:</strong> {payment.reference} · Transaction {payment.transaction_id} ·{' '}
            {formatDate(payment.created_at)}
          </p>
          {refunds.map((r) => (
            <p key={r.id}>
              <strong>Refund:</strong> {formatINR(r.amount)} · Transaction {r.transaction_id}
            </p>
          ))}
        </section>

        <p className="mt-8 text-center text-sm text-slate">
          This is a computer-generated invoice for a student project and needs no signature.
        </p>
      </article>
    </div>
  );
}
