// Newsletter sign-ups, with a one-click copy of all addresses for a mail tool.
import { Copy } from 'lucide-react';
import { EmptyState, ErrorState, Loader } from '../../components/States.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useApi } from '../../lib/api.js';
import { formatDate } from '../../lib/format.js';

export default function AdminSubscribers() {
  const toast = useToast();
  const { data, error, loading, reload } = useApi('/admin/subscribers');

  if (loading && !data) return <Loader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;
  if (data.subscribers.length === 0) return <EmptyState title="No subscribers yet">Sign-ups from the footer form appear here.</EmptyState>;

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(data.subscribers.map((s) => s.email).join(', '));
      toast(`${data.subscribers.length} email addresses copied`);
    } catch {
      toast('Could not copy. Select the addresses manually.', 'error');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-slate">{data.subscribers.length} subscribers</p>
        <button className="btn-ghost" onClick={copyAll}>
          <Copy className="size-4" aria-hidden />
          Copy all emails
        </button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[520px] text-left text-[15px]">
          <thead className="border-b border-line text-sm text-slate">
            <tr>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Customer account</th>
              <th className="px-4 py-3 font-semibold">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.subscribers.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-semibold">{s.email}</td>
                <td className="px-4 py-3">{s.customer_name || <span className="text-slate">Not registered</span>}</td>
                <td className="px-4 py-3">{formatDate(s.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
