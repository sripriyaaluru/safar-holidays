// Heart button that adds a package to the user's saved list.
import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function SaveButton({ packageId, title, className = '', withLabel = false }) {
  const { user, savedIds, toggleSaved } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const saved = savedIds.has(packageId);

  async function onClick(e) {
    e.preventDefault();
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    setBusy(true);
    try {
      const nowSaved = await toggleSaved(packageId);
      toast(nowSaved ? `${title} saved to your list` : `${title} removed from your list`);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from saved trips` : `Save ${title}`}
      className={
        withLabel
          ? `btn-ghost ${className}`
          : `grid size-10 place-items-center rounded-full bg-white/95 text-ink shadow-sm hover:bg-white ${className}`
      }
    >
      <Heart className={`size-5 ${saved ? 'fill-sindoor text-sindoor' : ''}`} aria-hidden />
      {withLabel && (saved ? 'Saved' : 'Save trip')}
    </button>
  );
}
