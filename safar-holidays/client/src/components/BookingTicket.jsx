// The booking panel on a package page, styled like a boarding pass.
import { useEffect, useState } from 'react';
import { Minus, Plus, TicketPercent, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import { addDays, dateFromToday, formatDate, formatINR, tripTotal } from '../lib/format.js';

function Stepper({ label, hint, value, min, max, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="font-semibold">{label}</p>
        {hint && <p className="text-sm text-slate">{hint}</p>}
      </div>
      <div className="flex items-center gap-3" role="group" aria-label={label}>
        <button
          type="button"
          className="grid size-9 place-items-center rounded-full border border-line hover:border-ink disabled:opacity-40"
          onClick={() => onChange(value - 1)}
          disabled={value <= min}
          aria-label={`Fewer ${label.toLowerCase()}`}
        >
          <Minus className="size-4" />
        </button>
        <output className="w-6 text-center font-display text-lg font-bold" aria-live="polite">
          {value}
        </output>
        <button
          type="button"
          className="grid size-9 place-items-center rounded-full border border-line hover:border-ink disabled:opacity-40"
          onClick={() => onChange(value + 1)}
          disabled={value >= max}
          aria-label={`More ${label.toLowerCase()}`}
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

export default function BookingTicket({ pkg }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    travel_date: '',
    adults: 2,
    children: 0,
    contact_phone: user?.phone || '',
    special_requests: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState(null); // { code, discount, description }
  const [couponState, setCouponState] = useState({ busy: false, error: '' });

  async function applyCoupon(code = couponInput) {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      setCouponState({ busy: false, error: 'Enter a coupon code.' });
      return;
    }
    setCouponState({ busy: true, error: '' });
    try {
      const q = await api('/bookings/quote', {
        method: 'POST',
        body: { package_id: pkg.id, adults: form.adults, children: form.children, coupon_code: clean },
      });
      setCoupon({ code: q.code, discount: q.discount, description: q.description });
      setCouponInput(q.code);
      setCouponState({ busy: false, error: '' });
    } catch (err) {
      setCoupon(null);
      setCouponState({ busy: false, error: err.message });
    }
  }

  // The discount depends on the group size, so check the coupon again when it changes.
  useEffect(() => {
    if (coupon) applyCoupon(coupon.code);
  }, [form.adults, form.children]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user?.phone) setForm((f) => (f.contact_phone ? f : { ...f, contact_phone: user.phone }));
  }, [user]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const travellers = form.adults + form.children;
  const subtotal = tripTotal(pkg.price, form.adults, form.children);
  const discount = coupon ? Math.min(coupon.discount, subtotal) : 0;
  const total = subtotal - discount;
  const endDate = form.travel_date ? addDays(form.travel_date, pkg.duration_days - 1) : '';

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.travel_date) {
      setError('Choose a start date for your trip.');
      return;
    }
    setBusy(true);
    try {
      const { booking } = await api('/bookings', { method: 'POST', body: { package_id: pkg.id, ...form, coupon_code: coupon?.code || '' } });
      toast(`Booking ${booking.booking_ref} sent. We will confirm it within 24 hours.`);
      navigate('/trips');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form id="book" onSubmit={onSubmit} className="ticket scroll-mt-24" aria-labelledby="book-title">
      <div className="space-y-5 p-5 sm:p-6">
        <div>
          <h2 id="book-title" className="text-xl font-bold">
            Book this trip
          </h2>
          <p className="mt-2">
            <span className="font-display text-3xl font-extrabold">{formatINR(pkg.price)}</span>
            <span className="text-slate"> per adult</span>
          </p>
          <p className="text-sm text-slate">Children under 12 travel at half price.</p>
        </div>

        <label className="block">
          <span className="field-label">Start date</span>
          <input
            type="date"
            className="field"
            min={dateFromToday(3)}
            max={dateFromToday(365)}
            value={form.travel_date}
            onChange={(e) => set('travel_date', e.target.value)}
            required
          />
        </label>

        <Stepper
          label="Adults"
          value={form.adults}
          min={1}
          max={pkg.max_group_size - form.children}
          onChange={(v) => set('adults', v)}
        />
        <Stepper
          label="Children"
          hint="Under 12"
          value={form.children}
          min={0}
          max={pkg.max_group_size - form.adults}
          onChange={(v) => set('children', v)}
        />

        <label className="block">
          <span className="field-label">Phone number</span>
          <input
            type="tel"
            className="field"
            placeholder="98765 43210"
            value={form.contact_phone}
            onChange={(e) => set('contact_phone', e.target.value)}
            autoComplete="tel"
            required
          />
        </label>

        <label className="block">
          <span className="field-label">
            Special requests <span className="font-normal text-slate">(optional)</span>
          </span>
          <textarea
            className="field min-h-20"
            placeholder="Vegetarian meals, ground-floor room, celebrating an anniversary…"
            value={form.special_requests}
            onChange={(e) => set('special_requests', e.target.value)}
            maxLength={500}
          />
        </label>

        <div>
          <span className="field-label">Coupon code</span>
          {coupon ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-leaf/40 bg-leaf/5 px-3.5 py-2.5">
              <p className="text-sm">
                <span className="font-display font-bold text-leaf">{coupon.code}</span>
                <span className="block text-slate">{coupon.description}</span>
              </p>
              <button
                type="button"
                className="rounded-full p-1 hover:bg-white"
                onClick={() => {
                  setCoupon(null);
                  setCouponInput('');
                }}
                aria-label="Remove coupon"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <label className="flex-1">
                <span className="sr-only">Coupon code</span>
                <input
                  className="field uppercase"
                  placeholder="WELCOME10"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (user) applyCoupon();
                    }
                  }}
                  maxLength={20}
                  aria-invalid={Boolean(couponState.error)}
                  aria-describedby="coupon-msg"
                  disabled={!user}
                />
              </label>
              <button
                type="button"
                className="btn-ghost px-4"
                onClick={() => applyCoupon()}
                disabled={!user || couponState.busy}
              >
                <TicketPercent className="size-4" aria-hidden />
                {couponState.busy ? '…' : 'Apply'}
              </button>
            </div>
          )}
          <p id="coupon-msg" className={`mt-1 text-sm ${couponState.error ? 'font-semibold text-sindoor' : 'text-slate'}`}>
            {couponState.error || (!user ? 'Log in to use a coupon.' : '')}
          </p>
        </div>
      </div>

      <div className="ticket-tear" aria-hidden />

      <div className="rounded-b-[22px] bg-marigold-soft p-5 sm:p-6">
        <dl className="space-y-2 text-[15px]">
          <div className="flex justify-between gap-4">
            <dt className="text-slate">Dates</dt>
            <dd className="text-right font-semibold">
              {form.travel_date ? `${formatDate(form.travel_date)} to ${formatDate(endDate)}` : 'Choose a start date'}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate">Travellers</dt>
            <dd className="font-semibold">
              {form.adults} {form.adults === 1 ? 'adult' : 'adults'}
              {form.children > 0 && `, ${form.children} ${form.children === 1 ? 'child' : 'children'}`}
            </dd>
          </div>
          {discount > 0 && (
            <>
              <div className="flex justify-between gap-4">
                <dt className="text-slate">Subtotal</dt>
                <dd className="tabular-nums">{formatINR(subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-4 text-leaf">
                <dt>Coupon {coupon.code}</dt>
                <dd className="font-semibold tabular-nums">−{formatINR(discount)}</dd>
              </div>
            </>
          )}
          <div className="flex items-baseline justify-between gap-4 border-t border-ink/10 pt-3">
            <dt className="font-semibold">Total</dt>
            <dd className="font-display text-2xl font-extrabold">{formatINR(total)}</dd>
          </div>
        </dl>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-sindoor">
            {error}
          </p>
        )}

        {user ? (
          <button type="submit" className="btn-dark mt-5 w-full py-3" disabled={busy}>
            {busy ? 'Sending booking…' : `Book for ${travellers} ${travellers === 1 ? 'traveller' : 'travellers'}`}
          </button>
        ) : (
          <button
            type="button"
            className="btn-dark mt-5 w-full py-3"
            onClick={() => navigate(`/login?next=${encodeURIComponent(location.pathname)}`)}
          >
            Log in to book
          </button>
        )}
        <p className="mt-3 text-center text-sm text-slate">
          You pay nothing now. We confirm availability first, then share payment details.
        </p>
      </div>
    </form>
  );
}
