// Bell icon with unread count and a drop-down list of recent notifications.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { api } from '../lib/api.js';
import { timeAgo } from '../lib/format.js';

const POLL_MS = 60000;

export default function NotificationBell() {
  const [data, setData] = useState({ notifications: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const location = useLocation();

  const load = useCallback(() => {
    api('/notifications')
      .then(setData)
      .catch(() => {});
  }, []);

  // Load now, on every page change, and once a minute.
  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load, location.pathname]);

  useEffect(() => setOpen(false), [location.pathname]);

  // Close when clicking outside or pressing Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function markAll() {
    await api('/notifications/read-all', { method: 'POST' }).catch(() => {});
    setData((d) => ({ unread: 0, notifications: d.notifications.map((n) => ({ ...n, is_read: true })) }));
  }

  async function markOne(n) {
    if (n.is_read) return;
    await api(`/notifications/${n.id}/read`, { method: 'PATCH' }).catch(() => {});
    setData((d) => ({
      unread: Math.max(0, d.unread - 1),
      notifications: d.notifications.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)),
    }));
  }

  return (
    <div className="relative" ref={box}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative grid size-10 place-items-center rounded-full hover:bg-mist"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Notifications${data.unread ? `, ${data.unread} unread` : ''}`}
      >
        <Bell className="size-5" aria-hidden />
        {data.unread > 0 && (
          <span className="absolute right-1 top-1 grid min-w-[18px] place-items-center rounded-full bg-sindoor px-1 text-[11px] font-bold leading-[18px] text-white">
            {data.unread > 9 ? '9+' : data.unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-line bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-display font-bold">Notifications</p>
            {data.unread > 0 && (
              <button onClick={markAll} className="link text-sm">
                Mark all read
              </button>
            )}
          </div>
          {data.notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate">No notifications yet.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-line overflow-y-auto">
              {data.notifications.map((n) => (
                <li key={n.id}>
                  <Link
                    to={n.link || '#'}
                    onClick={() => markOne(n)}
                    className={`block px-4 py-3 hover:bg-paper ${n.is_read ? '' : 'bg-marigold-soft/50'}`}
                  >
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      {!n.is_read && <span className="size-2 shrink-0 rounded-full bg-sindoor" aria-label="Unread" />}
                      {n.title}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-soft">{n.message}</p>
                    <p className="mt-1 text-xs text-slate">{timeAgo(n.created_at)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
