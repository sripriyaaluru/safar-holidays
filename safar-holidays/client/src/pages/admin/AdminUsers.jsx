import { ErrorState, Loader } from '../../components/States.jsx';
import { useApi } from '../../lib/api.js';
import { formatDate, formatINR } from '../../lib/format.js';

export default function AdminUsers() {
  const { data, error, loading, reload } = useApi('/admin/users');

  if (loading && !data) return <Loader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full min-w-[720px] text-left text-[15px]">
        <thead className="border-b border-line text-sm text-slate">
          <tr>
            <th className="px-4 py-3 font-semibold">Name</th>
            <th className="px-4 py-3 font-semibold">Contact</th>
            <th className="px-4 py-3 font-semibold">Joined</th>
            <th className="px-4 py-3 text-right font-semibold">Bookings</th>
            <th className="px-4 py-3 text-right font-semibold">Spent</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {data.users.map((u) => (
            <tr key={u.id}>
              <td className="px-4 py-3">
                <span className="font-semibold">{u.name}</span>
                {u.role === 'admin' && (
                  <span className="ml-2 rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-white">Admin</span>
                )}
              </td>
              <td className="px-4 py-3">
                {u.email}
                {u.phone && <p className="text-sm text-slate">{u.phone}</p>}
              </td>
              <td className="px-4 py-3">{formatDate(u.created_at)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{u.bookings}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatINR(u.total_spent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
