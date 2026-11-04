// Footer sign-up for travel deals.
import { useState } from 'react';
import { api } from '../lib/api.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ busy: false, error: '', done: '' });

  async function onSubmit(e) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setState({ busy: false, error: 'Enter a valid email address.', done: '' });
      return;
    }
    setState({ busy: true, error: '', done: '' });
    try {
      const { message } = await api('/newsletter', { method: 'POST', body: { email } });
      setState({ busy: false, error: '', done: message });
      setEmail('');
    } catch (err) {
      setState({ busy: false, error: err.message, done: '' });
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <h2 className="font-display text-base font-bold text-white">Deals in your inbox</h2>
      <p className="mt-2 text-[15px]">One email a month with new trips and coupon codes.</p>
      <div className="mt-3 flex gap-2">
        <label className="flex-1">
          <span className="sr-only">Email address</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="w-full rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[15px] text-white placeholder:text-white/50 focus:border-marigold focus:outline-none"
            aria-invalid={Boolean(state.error)}
            aria-describedby="newsletter-msg"
          />
        </label>
        <button className="btn-primary px-4 py-2" disabled={state.busy}>
          {state.busy ? '…' : 'Join'}
        </button>
      </div>
      <p id="newsletter-msg" role="status" className={`mt-2 min-h-5 text-sm ${state.error ? 'text-marigold' : 'text-white/80'}`}>
        {state.error || state.done}
      </p>
    </form>
  );
}
