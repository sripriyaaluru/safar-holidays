// Create, edit, switch off and delete coupon codes.
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { EmptyState, ErrorState, Loader } from '../../components/States.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api, useApi } from '../../lib/api.js';
import { couponLabel, dateFromToday, formatDate, formatINR } from '../../lib/format.js';

const EMPTY = {
  code: '',
  description: '',
  discount_type: 'percent',
  discount_value: 10,
  min_amount: 0,
  max_discount: 0,
  valid_until: dateFromToday(90),
  usage_limit: 0,
  is_active: true,
};

function validateCoupon(f) {
  if (!/^[A-Z0-9]{3,20}$/.test(f.code.trim().toUpperCase())) return 'Code must be 3 to 20 letters or numbers, no spaces.';
  if (!(Number(f.discount_value) > 0)) return 'Discount must be more than 0.';
  if (f.discount_type === 'percent' && Number(f.discount_value) > 90) return 'A percentage discount cannot be more than 90%.';
  if (Number(f.min_amount) < 0 || Number(f.max_discount) < 0 || Number(f.usage_limit) < 0) return 'Amounts cannot be negative.';
  return '';
}

function CouponForm({ initial, onSaved, onCancel }) {
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [state, setState] = useState({ busy: false, error: '' });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const isEdit = Boolean(initial.id);

  async function onSubmit(e) {
    e.preventDefault();
    const problem = validateCoupon(form);
    if (problem) return setState({ busy: false, error: problem });
    setState({ busy: true, error: '' });
    const body = {
      code: form.code,
      description: form.description,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      min_amount: Number(form.min_amount) || 0,
      max_discount: Number(form.max_discount) || 0,
      valid_until: form.valid_until || '',
      usage_limit: Number(form.usage_limit) || 0,
      is_active: form.is_active,
    };
    try {
      await api(isEdit ? `/admin/coupons/${initial.id}` : '/admin/coupons', { method: isEdit ? 'PUT' : 'POST', body });
      toast(isEdit ? `Coupon ${body.code.toUpperCase()} updated` : `Coupon ${body.code.toUpperCase()} created`);
      onSaved();
    } catch (err) {
      setState({ busy: false, error: err.message });
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-2xl border border-ink bg-white p-5">
      <h2 className="text-lg font-bold">{isEdit ? `Edit ${initial.code}` : 'New coupon'}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="field-label">Code</span>
          <input className="field uppercase" value={form.code} onChange={set('code')} maxLength={20} required />
        </label>
        <label className="block">
          <span className="field-label">Type</span>
          <select className="field" value={form.discount_type} onChange={set('discount_type')}>
            <option value="percent">Percentage</option>
            <option value="flat">Flat amount (₹)</option>
          </select>
        </label>
        <label className="block">
          <span className="field-label">{form.discount_type === 'percent' ? 'Discount (%)' : 'Discount (₹)'}</span>
          <input type="number" min="1" className="field" value={form.discount_value} onChange={set('discount_value')} />
        </label>
        <label className="block">
          <span className="field-label">Valid until</span>
          <input type="date" className="field" value={form.valid_until || ''} onChange={set('valid_until')} />
        </label>
        <label className="block">
          <span className="field-label">Minimum booking (₹)</span>
          <input type="number" min="0" className="field" value={form.min_amount} onChange={set('min_amount')} />
        </label>
        <label className="block">
          <span className="field-label">Maximum discount (₹)</span>
          <input type="number" min="0" className="field" value={form.max_discount} onChange={set('max_discount')} />
          <span className="mt-1 block text-xs text-slate">0 = no cap</span>
        </label>
        <label className="block">
          <span className="field-label">Usage limit</span>
          <input type="number" min="0" className="field" value={form.usage_limit} onChange={set('usage_limit')} />
          <span className="mt-1 block text-xs text-slate">0 = unlimited</span>
        </label>
        <label className="flex items-center gap-2 self-center pt-5 font-semibold">
          <input type="checkbox" className="size-5 accent-ink" checked={form.is_active} onChange={set('is_active')} />
          Active
        </label>
        <label className="block sm:col-span-2 lg:col-span-4">
          <span className="field-label">Description shown to customers</span>
          <input className="field" value={form.description} onChange={set('description')} maxLength={160} />
        </label>
      </div>
      {state.error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-sindoor">
          {state.error}
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <button className="btn-dark" disabled={state.busy}>
          {state.busy ? 'Saving…' : 'Save coupon'}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function AdminCoupons() {
  const toast = useToast();
  const { data, error, loading, reload } = useApi('/admin/coupons');
  const [editing, setEditing] = useState(null);

  async function remove(c) {
    if (!window.confirm(`Delete coupon ${c.code}? Past bookings keep their discount.`)) return;
    try {
      await api(`/admin/coupons/${c.id}`, { method: 'DELETE' });
      toast(`Coupon ${c.code} deleted`);
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  const today = dateFromToday(0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-slate">{data ? `${data.coupons.length} coupons` : ' '}</p>
        {!editing && (
          <button className="btn-primary" onClick={() => setEditing(EMPTY)}>
            <Plus className="size-4" aria-hidden />
            New coupon
          </button>
        )}
      </div>

      {editing && (
        <CouponForm
          key={editing.id || 'new'}
          initial={editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}

      {loading && !data && <Loader />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && data.coupons.length === 0 && <EmptyState title="No coupons yet">Create one to run an offer.</EmptyState>}
      {data && data.coupons.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[820px] text-left text-[15px]">
            <thead className="border-b border-line text-sm text-slate">
              <tr>
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Offer</th>
                <th className="px-4 py-3 font-semibold">Rules</th>
                <th className="px-4 py-3 text-right font-semibold">Used</th>
                <th className="px-4 py-3 text-right font-semibold">Given away</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line align-top">
              {data.coupons.map((c) => {
                const expired = c.valid_until && c.valid_until < today;
                return (
                  <tr key={c.id} className={c.is_active && !expired ? '' : 'bg-mist/60'}>
                    <td className="px-4 py-3 font-display font-bold tracking-wide">{c.code}</td>
                    <td className="px-4 py-3">
                      {couponLabel(c)}
                      <p className="max-w-60 text-sm text-slate">{c.description}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {c.min_amount > 0 ? `Min ${formatINR(c.min_amount)}` : 'No minimum'}
                      <br />
                      {c.valid_until ? `Until ${formatDate(c.valid_until)}` : 'No end date'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {c.times_used}
                      {c.usage_limit > 0 && <span className="text-slate"> / {c.usage_limit}</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatINR(c.total_discount)}</td>
                    <td className="px-4 py-3 text-sm font-semibold">
                      {expired ? (
                        <span className="text-sindoor">Expired</span>
                      ) : c.is_active ? (
                        <span className="text-leaf">Active</span>
                      ) : (
                        <span className="text-slate">Off</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-3 text-sm">
                        <button className="link" onClick={() => setEditing({ ...c, valid_until: c.valid_until || '' })}>
                          Edit
                        </button>
                        <button className="font-semibold text-sindoor hover:underline" onClick={() => remove(c)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
