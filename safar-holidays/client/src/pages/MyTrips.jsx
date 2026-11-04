import { useState } from 'react';
import { Link } from 'react-router';
import Cover from '../components/Cover.jsx';
import { EmptyState, ErrorState, Loader } from '../components/States.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api, useApi } from '../lib/api.js';
import {
  PAYMENT_STYLES,
  STATUS_STYLES,
  addDays,
  dateFromToday,
  daysUntil,
  formatDate,
  formatINR,
  refundEstimate,
} from '../lib/format.js';

function TripTicket({ booking, onCancelled }) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const status = STATUS_STYLES[booking.status];
  const endDate = addDays(booking.travel_date, booking.duration_days - 1);
  const canCancel = ['pending', 'confirmed'].includes(booking.status) && booking.travel_date > dateFromToday(0);
  const isUpcoming = ['pending', 'confirmed'].includes(booking.status) && booking.travel_date >= dateFromToday(0);
  const daysLeft = daysUntil(booking.travel_date);
  const refund = refundEstimate(booking);
  const payment = PAYMENT_STYLES[booking.payment_status] || PAYMENT_STYLES.unpaid;
  const canPay = booking.status === 'confirmed' && booking.payment_status === 'unpaid' && isUpcoming;
  const hasInvoice = ['paid', 'refunded'].includes(booking.payment_status);

  async function cancel() {
    setBusy(true);
    try {
      const { booking: updated, refund: r } = await api(`/bookings/${booking.id}/cancel`, { method: 'PATCH' });
      toast(
        r.amount > 0
          ? `Booking ${updated.booking_ref} cancelled. ${formatINR(r.amount)} will be refunded.`
          : `Booking ${updated.booking_ref} cancelled`,
      );
      onCancelled(updated);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <article className="ticket md:flex">
      <div className="flex gap-4 p-5 sm:p-6 md:flex-1">
        <Cover
          src={booking.image_url}
          alt=""
          label={booking.destination}
          small
          className="size-24 shrink-0 rounded-2xl sm:size-28"
        />
        <div className="min-w-0">
          {isUpcoming && daysLeft >= 0 && (
            <p className="mb-1 inline-block rounded-full bg-peacock-soft px-2.5 py-0.5 text-xs font-bold text-peacock">
              {daysLeft === 0 ? 'Starts today' : daysLeft === 1 ? 'Starts tomorrow' : `Starts in ${daysLeft} days`}
            </p>
          )}
          <p className="text-sm text-slate">{booking.destination}</p>
          <h2 className="text-xl font-bold">
            <Link to={`/packages/${booking.package_slug}`} className="hover:text-peacock">
              {booking.package_title}
            </Link>
          </h2>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[15px]">
            <dt className="text-slate">Dates</dt>
            <dd className="font-semibold">
              {formatDate(booking.travel_date)} to {formatDate(endDate)}
            </dd>
            <dt className="text-slate">Travellers</dt>
            <dd>
              {booking.adults} {booking.adults === 1 ? 'adult' : 'adults'}
              {booking.children > 0 && `, ${booking.children} ${booking.children === 1 ? 'child' : 'children'}`}
            </dd>
            <dt className="text-slate">Booked on</dt>
            <dd>{formatDate(booking.created_at)}</dd>
            <dt className="text-slate">Payment</dt>
            <dd className={`font-semibold ${payment.className}`}>
              {payment.label}
              {booking.refund_amount > 0 && ` (${formatINR(booking.refund_amount)})`}
            </dd>
          </dl>
        </div>
      </div>

      <div className="ticket-tear md:hidden" aria-hidden />
      <div className="ticket-tear-v hidden md:block" aria-hidden />

      <div className="flex flex-col gap-3 p-5 sm:p-6 md:w-64">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-slate">Booking ref</p>
            <p className="whitespace-nowrap font-display text-lg font-bold tracking-wide">{booking.booking_ref}</p>
          </div>
          <span className={`stamp ${status.className}`}>{status.short}</span>
        </div>
        <p>
          <span className="text-sm text-slate">Total </span>
          <span className="font-display text-xl font-extrabold">{formatINR(booking.total_amount)}</span>
          {booking.discount_amount > 0 && (
            <span className="block text-sm text-leaf">
              Saved {formatINR(booking.discount_amount)} with {booking.coupon_code}
            </span>
          )}
        </p>
        {booking.status === 'pending' && (
          <p className="text-sm text-slate">We will confirm availability within 24 hours.</p>
        )}

        <div className="mt-auto space-y-2">
          {canPay && !confirming && (
            <Link to={`/trips/${booking.id}/pay`} className="btn-primary w-full py-2">
              Pay {formatINR(booking.total_amount)}
            </Link>
          )}
          {hasInvoice && (
            <Link to={`/trips/${booking.id}/invoice`} className="btn-ghost w-full py-2">
              View invoice
            </Link>
          )}
          {canCancel && !confirming && (
            <button className="btn-danger w-full py-2" onClick={() => setConfirming(true)}>
              Cancel booking
            </button>
          )}
          {confirming && (
            <div className="rounded-xl bg-mist p-3">
              <p className="text-sm font-semibold">Cancel this booking?</p>
              <p className="mt-1 text-sm text-slate">
                {booking.payment_status === 'paid'
                  ? `Refund: ${formatINR(refund.amount)} (${refund.percent}%) as per our policy.`
                  : 'Nothing has been paid, so there is no charge.'}
              </p>
              <div className="mt-2 flex gap-2">
                <button className="btn-danger flex-1 px-3 py-1.5 text-sm" onClick={cancel} disabled={busy}>
                  {busy ? 'Cancelling…' : 'Yes, cancel'}
                </button>
                <button className="btn-ghost flex-1 px-3 py-1.5 text-sm" onClick={() => setConfirming(false)}>
                  Keep it
                </button>
              </div>
            </div>
          )}
          {booking.status === 'completed' && (
            <Link to={`/packages/${booking.package_slug}#reviews`} className="btn-ghost w-full py-2">
              Review this trip
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export default function MyTrips() {
  const { data, error, loading, reload, setData } = useApi('/bookings/my');

  function replaceBooking(updated) {
    setData((d) => ({ ...d, bookings: d.bookings.map((b) => (b.id === updated.id ? { ...b, ...updated } : b)) }));
  }

  const today = dateFromToday(0);
  const bookings = data?.bookings || [];
  const upcoming = bookings.filter((b) => ['pending', 'confirmed'].includes(b.status) && b.travel_date >= today);
  const past = bookings.filter((b) => !upcoming.includes(b));

  return (
    <div className="container-page max-w-4xl pt-10">
      <h1 className="text-4xl font-extrabold sm:text-5xl">My trips</h1>

      {loading && !data && <Loader label="Loading your trips" />}
      {error && (
        <div className="mt-8">
          <ErrorState message={error} onRetry={reload} />
        </div>
      )}

      {data && bookings.length === 0 && (
        <div className="mt-8">
          <EmptyState title="No trips booked yet" action={<Link to="/packages" className="btn-primary">Browse packages</Link>}>
            When you book a package it will show up here with its booking reference and status.
          </EmptyState>
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="mt-8">
          <h2 className="text-2xl font-bold">Upcoming</h2>
          <div className="mt-4 space-y-5">
            {upcoming.map((b) => (
              <TripTicket key={b.id} booking={b} onCancelled={replaceBooking} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold">Past and cancelled</h2>
          <div className="mt-4 space-y-5">
            {past.map((b) => (
              <TripTicket key={b.id} booking={b} onCancelled={replaceBooking} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
