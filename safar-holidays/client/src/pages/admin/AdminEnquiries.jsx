import { EmptyState, ErrorState, Loader } from '../../components/States.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api, useApi } from '../../lib/api.js';
import { formatDate } from '../../lib/format.js';

export default function AdminEnquiries() {
  const toast = useToast();
  const { data, error, loading, reload, setData } = useApi('/admin/enquiries');

  async function setStatus(enquiry, status) {
    try {
      await api(`/admin/enquiries/${enquiry.id}`, { method: 'PATCH', body: { status } });
      setData((d) => ({ ...d, enquiries: d.enquiries.map((e) => (e.id === enquiry.id ? { ...e, status } : e)) }));
      toast(status === 'resolved' ? 'Marked as resolved' : 'Moved back to new');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  if (loading && !data) return <Loader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;
  if (data.enquiries.length === 0) return <EmptyState title="No enquiries yet">Messages from the contact form appear here.</EmptyState>;

  return (
    <ul className="space-y-4">
      {data.enquiries.map((e) => (
        <li
          key={e.id}
          className={`rounded-2xl border bg-white p-5 ${e.status === 'new' ? 'border-ink' : 'border-line opacity-80'}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">{e.subject}</h3>
              <p className="text-sm text-slate">
                {e.name}, <a className="link" href={`mailto:${e.email}?subject=${encodeURIComponent('Re: ' + e.subject)}`}>{e.email}</a>
                {e.phone && `, ${e.phone}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate">{formatDate(e.created_at)}</span>
              {e.status === 'new' ? (
                <button className="btn-dark px-4 py-1.5 text-sm" onClick={() => setStatus(e, 'resolved')}>
                  Mark resolved
                </button>
              ) : (
                <button className="btn-ghost px-4 py-1.5 text-sm" onClick={() => setStatus(e, 'new')}>
                  Reopen
                </button>
              )}
            </div>
          </div>
          <p className="mt-3 whitespace-pre-line text-ink-soft">{e.message}</p>
        </li>
      ))}
    </ul>
  );
}
