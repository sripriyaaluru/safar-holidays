// The traveller's account page: summary, edit details and change password.
import { useEffect, useState } from 'react';
import { Award, Heart, Luggage, PiggyBank, Star } from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api, useApi } from '../lib/api.js';
import { formatDate, formatINR } from '../lib/format.js';

const PHONE_RE = /^[0-9+\-\s]{7,16}$/;

/** Rates a password from 0 to 4 for the strength meter. */
export function passwordStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) score++;
  return score;
}
const STRENGTH = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLOR = ['bg-sindoor', 'bg-sindoor', 'bg-marigold', 'bg-leaf', 'bg-leaf'];

function DetailsForm() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '' });
  const [state, setState] = useState({ busy: false, error: '' });

  useEffect(() => setForm({ name: user.name, phone: user.phone || '' }), [user]);

  async function onSubmit(e) {
    e.preventDefault();
    if (form.name.trim().length < 2) return setState({ busy: false, error: 'Enter your full name.' });
    if (form.phone && !PHONE_RE.test(form.phone)) return setState({ busy: false, error: 'Enter a valid phone number.' });
    setState({ busy: true, error: '' });
    try {
      const { user: next } = await api('/auth/me', { method: 'PUT', body: form });
      updateUser(next);
      toast('Profile updated');
      setState({ busy: false, error: '' });
    } catch (err) {
      setState({ busy: false, error: err.message });
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-3xl border border-line bg-white p-6" noValidate>
      <h2 className="text-xl font-bold">Your details</h2>
      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="field-label">Full name</span>
          <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
        </label>
        <label className="block">
          <span className="field-label">Email</span>
          <input className="field bg-mist" value={user.email} disabled aria-describedby="email-hint" />
          <span id="email-hint" className="mt-1 block text-sm text-slate">
            Email is your login and cannot be changed.
          </span>
        </label>
        <label className="block">
          <span className="field-label">Phone</span>
          <input type="tel" className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" />
        </label>
      </div>
      {state.error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-sindoor">
          {state.error}
        </p>
      )}
      <button className="btn-dark mt-5" disabled={state.busy}>
        {state.busy ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}

function PasswordForm() {
  const toast = useToast();
  const empty = { current_password: '', new_password: '', confirm: '' };
  const [form, setForm] = useState(empty);
  const [state, setState] = useState({ busy: false, error: '' });
  const strength = passwordStrength(form.new_password);

  async function onSubmit(e) {
    e.preventDefault();
    if (form.new_password.length < 8) return setState({ busy: false, error: 'New password must be at least 8 characters.' });
    if (!/[A-Za-z]/.test(form.new_password) || !/[0-9]/.test(form.new_password)) {
      return setState({ busy: false, error: 'Use at least one letter and one number.' });
    }
    if (form.new_password !== form.confirm) return setState({ busy: false, error: 'The two new passwords do not match.' });
    setState({ busy: true, error: '' });
    try {
      await api('/auth/password', {
        method: 'PUT',
        body: { current_password: form.current_password, new_password: form.new_password },
      });
      toast('Password changed');
      setForm(empty);
      setState({ busy: false, error: '' });
    } catch (err) {
      setState({ busy: false, error: err.message });
    }
  }

  const field = (key, label, autoComplete) => (
    <label className="block">
      <span className="field-label">{label}</span>
      <input
        type="password"
        className="field"
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        autoComplete={autoComplete}
        required
      />
    </label>
  );

  return (
    <form onSubmit={onSubmit} className="rounded-3xl border border-line bg-white p-6" noValidate>
      <h2 className="text-xl font-bold">Change password</h2>
      <div className="mt-5 space-y-4">
        {field('current_password', 'Current password', 'current-password')}
        {field('new_password', 'New password', 'new-password')}
        {form.new_password && (
          <div aria-live="polite">
            <div className="flex gap-1" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full ${i < strength ? STRENGTH_COLOR[strength] : 'bg-mist'}`} />
              ))}
            </div>
            <p className="mt-1 text-sm text-slate">Strength: {STRENGTH[strength]}</p>
          </div>
        )}
        {field('confirm', 'Repeat new password', 'new-password')}
      </div>
      {state.error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-sindoor">
          {state.error}
        </p>
      )}
      <button className="btn-dark mt-5" disabled={state.busy}>
        {state.busy ? 'Saving…' : 'Change password'}
      </button>
    </form>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const { data } = useApi('/auth/me/summary');

  const stats = data
    ? [
        [Luggage, 'Trips booked', data.bookings, `${data.upcoming} upcoming`],
        [Award, 'Traveller level', data.tier, `${data.completed} completed trips`],
        [PiggyBank, 'Saved with coupons', formatINR(data.saved), `Spent ${formatINR(data.spent)}`],
        [Star, 'Reviews written', data.reviews, ''],
        [Heart, 'Saved trips', data.wishlist, ''],
      ]
    : [];

  return (
    <div className="container-page max-w-5xl pt-10">
      <h1 className="text-4xl font-extrabold sm:text-5xl">Hi, {user.name.split(' ')[0]}</h1>
      <p className="mt-2 text-slate">Member since {formatDate(user.created_at)}</p>

      {data && (
        <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5">
          {stats.map(([Icon, label, value, sub]) => (
            <li key={label} className="rounded-2xl border border-line bg-white p-4">
              <Icon className="size-5 text-peacock" aria-hidden />
              <p className="mt-3 text-sm text-slate">{label}</p>
              <p className="font-display text-2xl font-extrabold">{value}</p>
              {sub && <p className="text-xs text-slate">{sub}</p>}
            </li>
          ))}
        </ul>
      )}
      {data?.tier === 'Explorer' && (
        <p className="mt-3 text-sm text-slate">
          Complete 2 trips to reach Silver and 5 to reach Gold.{' '}
          <Link to="/packages" className="link">
            Find your next trip
          </Link>
        </p>
      )}

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <DetailsForm />
        <PasswordForm />
      </div>
    </div>
  );
}
