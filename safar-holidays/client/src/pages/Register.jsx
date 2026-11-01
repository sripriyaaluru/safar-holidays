import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { safeNext } from './Login.jsx';

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const next = params.get('next');
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await register(form);
      toast(`Account created. Welcome, ${user.name.split(' ')[0]}!`);
      navigate(safeNext(next, '/packages'), { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="container-page flex justify-center pt-12">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-extrabold">Create an account</h1>
        <p className="mt-2 text-slate">
          Already have one?{' '}
          <Link className="link" to={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`}>
            Log in
          </Link>
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5 rounded-3xl border border-line bg-white p-6">
          <label className="block">
            <span className="field-label">Full name</span>
            <input className="field" value={form.name} onChange={set('name')} autoComplete="name" required />
          </label>
          <label className="block">
            <span className="field-label">Email</span>
            <input type="email" className="field" value={form.email} onChange={set('email')} autoComplete="email" required />
          </label>
          <label className="block">
            <span className="field-label">
              Phone <span className="font-normal text-slate">(optional)</span>
            </span>
            <input type="tel" className="field" value={form.phone} onChange={set('phone')} autoComplete="tel" />
          </label>
          <label className="block">
            <span className="field-label">Password</span>
            <input
              type="password"
              className="field"
              value={form.password}
              onChange={set('password')}
              autoComplete="new-password"
              minLength={6}
              required
              aria-describedby="password-hint"
            />
            <span id="password-hint" className="mt-1 block text-sm text-slate">
              At least 6 characters.
            </span>
          </label>
          {error && (
            <p role="alert" className="text-sm font-semibold text-sindoor">
              {error}
            </p>
          )}
          <button className="btn-primary w-full py-3" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
