import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

/** Only allow redirects to pages on this site. */
export function safeNext(value, fallback = '/') {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : fallback;
}

const DEMO_ACCOUNTS = [
  { label: 'Customer', email: 'priya@example.com', password: 'User@123' },
  { label: 'Admin', email: 'admin@example.com', password: 'Admin@123' },
];

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const next = params.get('next');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login(form.email, form.password);
      toast(`Welcome back, ${user.name.split(' ')[0]}`);
      navigate(safeNext(next, user.role === 'admin' ? '/admin' : '/'), { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="container-page flex justify-center pt-12">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-extrabold">Log in</h1>
        <p className="mt-2 text-slate">
          New here?{' '}
          <Link className="link" to={`/register${next ? `?next=${encodeURIComponent(next)}` : ''}`}>
            Create an account
          </Link>
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5 rounded-3xl border border-line bg-white p-6">
          <label className="block">
            <span className="field-label">Email</span>
            <input
              type="email"
              className="field"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
              required
            />
          </label>
          <label className="block">
            <span className="field-label">Password</span>
            <input
              type="password"
              className="field"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="current-password"
              required
            />
          </label>
          {error && (
            <p role="alert" className="text-sm font-semibold text-sindoor">
              {error}
            </p>
          )}
          <button className="btn-dark w-full py-3" disabled={busy}>
            {busy ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <div className="mt-6 rounded-2xl bg-mist p-4 text-sm">
          <p className="font-semibold">Demo accounts for testing</p>
          <ul className="mt-2 space-y-2">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {a.label}: {a.email} / {a.password}
                </span>
                <button
                  type="button"
                  className="link"
                  onClick={() => setForm({ email: a.email, password: a.password })}
                >
                  Fill in
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
