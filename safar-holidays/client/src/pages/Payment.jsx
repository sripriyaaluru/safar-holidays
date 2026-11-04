// Simulated online payment for a confirmed booking (card or UPI).
import { useState } from 'react';
import { CreditCard, Lock, Smartphone } from 'lucide-react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import Cover from '../components/Cover.jsx';
import { ErrorState, Loader } from '../components/States.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api, useApi } from '../lib/api.js';
import { addDays, formatDate, formatINR } from '../lib/format.js';

/** Client-side checks mirror the server so mistakes are shown before sending. */
export function luhnValid(number) {
  const digits = number.replace(/\D/g, '');
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

function expiryValid(value) {
  const m = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!m) return false;
  const month = Number(m[1]);
  if (month < 1 || month > 12) return false;
  return new Date(2000 + Number(m[2]), month, 0, 23, 59, 59) >= new Date();
}

function cardBrand(number) {
  const n = number.replace(/\D/g, '');
  if (/^4/.test(n)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'Mastercard';
  if (/^(60|65|81|82)/.test(n)) return 'RuPay';
  if (/^3[47]/.test(n)) return 'Amex';
  return '';
}

const formatCardNumber = (v) =>
  v
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(.{4})/g, '$1 ')
    .trim();

const formatExpiry = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

function validateForm(method, f) {
  const errors = {};
  if (method === 'card') {
    if (f.card_name.trim().length < 2) errors.card_name = 'Enter the name printed on the card.';
    if (!luhnValid(f.card_number)) errors.card_number = 'This card number is not valid.';
    if (!expiryValid(f.expiry)) errors.expiry = 'Enter a future date as MM/YY.';
    if (!/^\d{3,4}$/.test(f.cvv)) errors.cvv = '3 or 4 digits.';
  } else if (!/^[a-z0-9._-]{2,256}@[a-z]{2,64}$/i.test(f.upi_id.trim())) {
    errors.upi_id = 'Enter a UPI ID such as name@okbank.';
  }
  return errors;
}

function Input({ label, error, id, className = '', ...props }) {
  return (
    <label className={`block ${className}`} htmlFor={id}>
      <span className="field-label">{label}</span>
      <input
        id={id}
        className={`field ${error ? 'border-sindoor' : ''}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-err` : undefined}
        {...props}
      />
      {error && (
        <span id={`${id}-err`} className="mt-1 block text-sm font-semibold text-sindoor">
          {error}
        </span>
      )}
    </label>
  );
}

export default function Payment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, error, loading, reload } = useApi(`/bookings/${id}`);
  const [method, setMethod] = useState('card');
  const [form, setForm] = useState({ card_name: '', card_number: '', expiry: '', cvv: '', upi_id: '' });
  const [errors, setErrors] = useState({});
  const [state, setState] = useState({ busy: false, error: '' });

  if (loading && !data) return <Loader label="Loading booking" />;
  if (error) {
    return (
      <div className="container-page py-16">
        <ErrorState message={error} onRetry={reload} />
      </div>
    );
  }
  if (!data) return null;

  const { booking } = data;
  if (booking.payment_status !== 'unpaid') return <Navigate to={`/trips/${booking.id}/invoice`} replace />;
  const notReady = booking.status !== 'confirmed';
  const set = (key, fmt = (v) => v) => (e) => setForm((f) => ({ ...f, [key]: fmt(e.target.value) }));
  const brand = cardBrand(form.card_number);

  async function onSubmit(e) {
    e.preventDefault();
    const found = validateForm(method, form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setState({ busy: true, error: '' });
    const body =
      method === 'card'
        ? { method, card_name: form.card_name, card_number: form.card_number, expiry: form.expiry, cvv: form.cvv }
        : { method, upi_id: form.upi_id };
    try {
      const res = await api(`/bookings/${booking.id}/pay`, { method: 'POST', body });
      toast(`Payment successful. Transaction ${res.transaction_id}`);
      navigate(`/trips/${booking.id}/invoice`, { replace: true });
    } catch (err) {
      setState({ busy: false, error: err.message });
    }
  }

  return (
    <div className="container-page max-w-5xl pt-10">
      <Link to="/trips" className="text-sm font-semibold text-slate hover:text-ink">
        ← Back to my trips
      </Link>
      <h1 className="mt-3 text-4xl font-extrabold">Secure payment</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <form onSubmit={onSubmit} noValidate className="rounded-3xl border border-line bg-white p-5 sm:p-8">
          <div role="tablist" aria-label="Payment method" className="grid grid-cols-2 gap-2 rounded-2xl bg-mist p-1">
            {[
              ['card', 'Card', CreditCard],
              ['upi', 'UPI', Smartphone],
            ].map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={method === value}
                onClick={() => {
                  setMethod(value);
                  setErrors({});
                }}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 font-semibold ${
                  method === value ? 'bg-white shadow-sm' : 'text-slate'
                }`}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>

          {method === 'card' ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Input
                id="card_name"
                label="Name on card"
                className="sm:col-span-2"
                autoComplete="cc-name"
                value={form.card_name}
                onChange={set('card_name')}
                error={errors.card_name}
              />
              <div className="relative sm:col-span-2">
                <Input
                  id="card_number"
                  label="Card number"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="4111 1111 1111 1111"
                  value={form.card_number}
                  onChange={set('card_number', formatCardNumber)}
                  error={errors.card_number}
                />
                {brand && (
                  <span className="absolute right-3 top-[38px] rounded bg-mist px-2 py-0.5 text-xs font-bold">{brand}</span>
                )}
              </div>
              <Input
                id="expiry"
                label="Expiry (MM/YY)"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="08/29"
                value={form.expiry}
                onChange={set('expiry', formatExpiry)}
                error={errors.expiry}
              />
              <Input
                id="cvv"
                label="CVV"
                type="password"
                inputMode="numeric"
                autoComplete="cc-csc"
                maxLength={4}
                value={form.cvv}
                onChange={set('cvv', (v) => v.replace(/\D/g, ''))}
                error={errors.cvv}
              />
            </div>
          ) : (
            <div className="mt-6">
              <Input
                id="upi_id"
                label="UPI ID"
                placeholder="yourname@okaxis"
                autoComplete="off"
                value={form.upi_id}
                onChange={set('upi_id')}
                error={errors.upi_id}
              />
              <p className="mt-2 text-sm text-slate">You would normally approve the request in your UPI app.</p>
            </div>
          )}

          {state.error && (
            <p role="alert" className="mt-5 rounded-xl bg-sindoor/10 px-3 py-2 text-sm font-semibold text-sindoor">
              {state.error}
            </p>
          )}
          {notReady && (
            <p className="mt-5 rounded-xl bg-marigold-soft px-3 py-2 text-sm font-semibold">
              Payment opens once our team confirms this booking.
            </p>
          )}

          <button className="btn-dark mt-6 w-full py-3" disabled={state.busy || notReady}>
            <Lock className="size-4" aria-hidden />
            {state.busy ? 'Processing…' : `Pay ${formatINR(booking.total_amount)}`}
          </button>

          <details className="mt-5 text-sm text-slate">
            <summary className="cursor-pointer font-semibold">Test details for the demo</summary>
            <p className="mt-2">
              This is a simulated payment gateway: no money is taken. Use card 4111 1111 1111 1111 with any future
              expiry and any CVV. Card 4000 0000 0000 0002 is always declined. Any UPI ID like test@okaxis works.
            </p>
          </details>
        </form>

        <aside className="ticket h-fit overflow-hidden">
          <Cover src={booking.image_url} alt="" label={booking.destination} className="aspect-[16/9] w-full rounded-t-[22px]" />
          <div className="space-y-2 p-5 text-[15px]">
            <p className="text-sm text-slate">{booking.booking_ref}</p>
            <h2 className="text-xl font-bold">{booking.package_title}</h2>
            <p>
              {formatDate(booking.travel_date)} to {formatDate(addDays(booking.travel_date, booking.duration_days - 1))}
            </p>
            <p className="text-slate">
              {booking.adults} adults{booking.children > 0 && `, ${booking.children} children`}
            </p>
          </div>
          <div className="ticket-tear" aria-hidden />
          <dl className="space-y-1.5 bg-marigold-soft p-5 text-[15px]">
            {booking.discount_amount > 0 && (
              <>
                <div className="flex justify-between">
                  <dt className="text-slate">Subtotal</dt>
                  <dd>{formatINR(booking.total_amount + booking.discount_amount)}</dd>
                </div>
                <div className="flex justify-between text-leaf">
                  <dt>Coupon {booking.coupon_code}</dt>
                  <dd>−{formatINR(booking.discount_amount)}</dd>
                </div>
              </>
            )}
            <div className="flex items-baseline justify-between border-t border-ink/10 pt-2">
              <dt className="font-semibold">Amount due</dt>
              <dd className="font-display text-2xl font-extrabold">{formatINR(booking.total_amount)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
