import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import Cover from '../../components/Cover.jsx';
import { ErrorState, Loader } from '../../components/States.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api, useApi } from '../../lib/api.js';
import { CATEGORY_LABELS } from '../../lib/format.js';
import { toPayload } from './packagePayload.js';

const EMPTY = {
  title: '',
  destination: '',
  country: 'India',
  region: 'domestic',
  category: 'beach',
  duration_days: 4,
  price: 15000,
  image_url: '',
  summary: '',
  description: '',
  highlights: [],
  inclusions: [],
  exclusions: [],
  itinerary: [{ title: '', details: '' }],
  max_group_size: 15,
  featured: false,
  is_active: true,
};

// Lists are edited as "one item per line" text boxes.
const toLines = (arr) => (arr || []).join('\n');
const fromLines = (text) =>
  text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

function Field({ label, hint, className = '', children }) {
  return (
    <label className={`block ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-sm text-slate">{hint}</span>}
    </label>
  );
}

export default function AdminPackageForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const existing = useApi(isEdit ? '/admin/packages' : null);

  const [form, setForm] = useState(isEdit ? null : { ...EMPTY, lists: { highlights: '', inclusions: '', exclusions: '' } });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isEdit || !existing.data) return;
    const pkg = existing.data.packages.find((p) => String(p.id) === id);
    if (pkg) {
      setForm({
        ...toPayload(pkg),
        itinerary: pkg.itinerary.length ? pkg.itinerary : [{ title: '', details: '' }],
        lists: {
          highlights: toLines(pkg.highlights),
          inclusions: toLines(pkg.inclusions),
          exclusions: toLines(pkg.exclusions),
        },
      });
    }
  }, [existing.data, id, isEdit]);

  if (isEdit && existing.loading && !form) return <Loader />;
  if (existing.error) return <ErrorState message={existing.error} onRetry={existing.reload} />;
  if (!form) return <ErrorState message="We could not find that package." />;

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };
  const setList = (key) => (e) => setForm((f) => ({ ...f, lists: { ...f.lists, [key]: e.target.value } }));
  const setDay = (index, key, value) =>
    setForm((f) => ({ ...f, itinerary: f.itinerary.map((d, i) => (i === index ? { ...d, [key]: value } : d)) }));
  const addDay = () => setForm((f) => ({ ...f, itinerary: [...f.itinerary, { title: '', details: '' }] }));
  const removeDay = (index) => setForm((f) => ({ ...f, itinerary: f.itinerary.filter((_, i) => i !== index) }));

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const body = {
      ...toPayload(form),
      duration_days: Number(form.duration_days),
      price: Number(form.price),
      max_group_size: Number(form.max_group_size),
      highlights: fromLines(form.lists.highlights),
      inclusions: fromLines(form.lists.inclusions),
      exclusions: fromLines(form.lists.exclusions),
      itinerary: form.itinerary.filter((d) => d.title.trim() || d.details.trim()),
    };
    try {
      const { package: saved } = await api(isEdit ? `/packages/${id}` : '/packages', {
        method: isEdit ? 'PUT' : 'POST',
        body,
      });
      toast(isEdit ? `${saved.title} updated` : `${saved.title} added`);
      navigate('/admin/packages');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div>
        <Link to="/admin/packages" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden />
          All packages
        </Link>
        <h2 className="mt-2 text-2xl font-bold">{isEdit ? `Edit ${form.title || 'package'}` : 'Add a package'}</h2>
      </div>

      <fieldset className="grid gap-5 rounded-3xl border border-line bg-white p-5 sm:grid-cols-2 sm:p-6">
        <legend className="sr-only">Basics</legend>
        <Field label="Title" className="sm:col-span-2">
          <input className="field" value={form.title} onChange={set('title')} required />
        </Field>
        <Field label="Destination" hint="Places covered, e.g. Munnar & Alleppey">
          <input className="field" value={form.destination} onChange={set('destination')} required />
        </Field>
        <Field label="Country">
          <input className="field" value={form.country} onChange={set('country')} required />
        </Field>
        <Field label="Region">
          <select className="field" value={form.region} onChange={set('region')}>
            <option value="domestic">Within India</option>
            <option value="international">International</option>
          </select>
        </Field>
        <Field label="Trip type">
          <select className="field" value={form.category} onChange={set('category')}>
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Length (days)">
          <input type="number" min="1" max="30" className="field" value={form.duration_days} onChange={set('duration_days')} required />
        </Field>
        <Field label="Price per adult (₹)">
          <input type="number" min="500" step="1" className="field" value={form.price} onChange={set('price')} required />
        </Field>
        <Field label="Max travellers per booking">
          <input type="number" min="1" max="100" className="field" value={form.max_group_size} onChange={set('max_group_size')} required />
        </Field>
        <div className="flex flex-col justify-end gap-3">
          <label className="flex items-center gap-2.5 font-semibold">
            <input type="checkbox" className="size-5 accent-ink" checked={form.featured} onChange={set('featured')} />
            Show on home page
          </label>
          <label className="flex items-center gap-2.5 font-semibold">
            <input type="checkbox" className="size-5 accent-ink" checked={form.is_active} onChange={set('is_active')} />
            Visible to customers
          </label>
        </div>
      </fieldset>

      <fieldset className="grid gap-5 rounded-3xl border border-line bg-white p-5 sm:grid-cols-[1fr_200px] sm:p-6">
        <legend className="sr-only">Photo and description</legend>
        <Field label="Photo URL" hint="Paste a full image link (https://…). Leave empty for a coloured panel.">
          <input type="url" className="field" value={form.image_url} onChange={set('image_url')} />
        </Field>
        <Cover src={form.image_url} alt="Photo preview" label={form.destination || 'Preview'} className="aspect-[4/3] w-full rounded-2xl" />
        <Field label="Short summary" hint="Shown on package cards. Up to 220 characters." className="sm:col-span-2">
          <input className="field" value={form.summary} onChange={set('summary')} maxLength={220} required />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <textarea className="field min-h-32" value={form.description} onChange={set('description')} required />
        </Field>
      </fieldset>

      <fieldset className="grid gap-5 rounded-3xl border border-line bg-white p-5 sm:grid-cols-3 sm:p-6">
        <legend className="sr-only">Lists</legend>
        <Field label="Highlights" hint="One per line">
          <textarea className="field min-h-36" value={form.lists.highlights} onChange={setList('highlights')} />
        </Field>
        <Field label="Included" hint="One per line">
          <textarea className="field min-h-36" value={form.lists.inclusions} onChange={setList('inclusions')} />
        </Field>
        <Field label="Not included" hint="One per line">
          <textarea className="field min-h-36" value={form.lists.exclusions} onChange={setList('exclusions')} />
        </Field>
      </fieldset>

      <fieldset className="rounded-3xl border border-line bg-white p-5 sm:p-6">
        <legend className="sr-only">Itinerary</legend>
        <h3 className="text-lg font-bold">Day-by-day plan</h3>
        <ol className="mt-4 space-y-4">
          {form.itinerary.map((day, i) => (
            <li key={i} className="grid gap-3 sm:grid-cols-[56px_1fr_auto]">
              <span className="pt-2.5 font-display font-bold">Day {i + 1}</span>
              <div className="grid gap-2">
                <input
                  className="field"
                  placeholder="Title, e.g. Arrive in Kochi"
                  value={day.title}
                  onChange={(e) => setDay(i, 'title', e.target.value)}
                  aria-label={`Day ${i + 1} title`}
                />
                <textarea
                  className="field min-h-16"
                  placeholder="What happens on this day"
                  value={day.details}
                  onChange={(e) => setDay(i, 'details', e.target.value)}
                  aria-label={`Day ${i + 1} details`}
                />
              </div>
              <button
                type="button"
                onClick={() => removeDay(i)}
                className="grid size-10 place-items-center self-start rounded-full text-sindoor hover:bg-sindoor/10"
                aria-label={`Remove day ${i + 1}`}
              >
                <Trash2 className="size-5" />
              </button>
            </li>
          ))}
        </ol>
        <button type="button" onClick={addDay} className="btn-ghost mt-4">
          <Plus className="size-4" aria-hidden />
          Add a day
        </button>
      </fieldset>

      {error && (
        <p role="alert" className="rounded-xl bg-sindoor/10 px-4 py-3 font-semibold text-sindoor">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button className="btn-dark" disabled={busy}>
          {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add package'}
        </button>
        <Link to="/admin/packages" className="btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}
