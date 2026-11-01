import { useEffect, useState } from 'react';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';

export default function Contact() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    subject: '',
    message: '',
  });
  const [status, setStatus] = useState({ busy: false, error: '', done: '' });

  // The saved login is restored after the page loads, so fill in any empty fields then.
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      name: f.name || user.name,
      email: f.email || user.email,
      phone: f.phone || user.phone || '',
    }));
  }, [user]);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setStatus({ busy: true, error: '', done: '' });
    try {
      const { message } = await api('/enquiries', { method: 'POST', body: form });
      setStatus({ busy: false, error: '', done: message });
    } catch (err) {
      setStatus({ busy: false, error: err.message, done: '' });
    }
  }

  return (
    <div className="container-page pt-10">
      <h1 className="text-4xl font-extrabold sm:text-5xl">Plan a trip with us</h1>
      <p className="mt-3 max-w-2xl text-lg text-slate">
        Need a group quote, a custom honeymoon, or help with visas? Send us the details and a travel planner will
        reply within one working day.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="rounded-3xl border border-line bg-white p-5 sm:p-8">
          {status.done ? (
            <div role="status">
              <h2 className="text-2xl font-bold">Message sent</h2>
              <p className="mt-2 text-slate">{status.done}</p>
              <button
                className="btn-ghost mt-6"
                onClick={() => {
                  setForm((f) => ({ ...f, subject: '', message: '' }));
                  setStatus({ busy: false, error: '', done: '' });
                }}
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="field-label">Your name</span>
                <input className="field" value={form.name} onChange={set('name')} required autoComplete="name" />
              </label>
              <label className="block">
                <span className="field-label">Email</span>
                <input type="email" className="field" value={form.email} onChange={set('email')} required autoComplete="email" />
              </label>
              <label className="block">
                <span className="field-label">
                  Phone <span className="font-normal text-slate">(optional)</span>
                </span>
                <input type="tel" className="field" value={form.phone} onChange={set('phone')} autoComplete="tel" />
              </label>
              <label className="block">
                <span className="field-label">Subject</span>
                <input className="field" placeholder="Group trip to Goa in March" value={form.subject} onChange={set('subject')} required />
              </label>
              <label className="block sm:col-span-2">
                <span className="field-label">Message</span>
                <textarea
                  className="field min-h-36"
                  placeholder="Where you want to go, rough dates, number of travellers and budget."
                  value={form.message}
                  onChange={set('message')}
                  required
                />
              </label>
              {status.error && (
                <p role="alert" className="text-sm font-semibold text-sindoor sm:col-span-2">
                  {status.error}
                </p>
              )}
              <div className="sm:col-span-2">
                <button className="btn-primary" disabled={status.busy}>
                  {status.busy ? 'Sending…' : 'Send message'}
                </button>
              </div>
            </form>
          )}
        </div>

        <aside className="space-y-6">
          {[
            [Phone, 'Call us', '+91 98765 43210'],
            [Mail, 'Email', 'support@example.com'],
            [Clock, 'Office hours', 'Monday to Saturday, 9:30 am to 7 pm'],
            [MapPin, 'Visit', 'MG Road, Bengaluru, Karnataka'],
          ].map(([Icon, title, text]) => (
            <div key={title} className="flex gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-peacock-soft text-peacock">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <h2 className="font-display text-base font-bold">{title}</h2>
                <p className="text-slate">{text}</p>
              </div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
