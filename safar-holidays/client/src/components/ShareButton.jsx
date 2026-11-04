// Shares a page with the phone's share sheet, or copies the link on desktop.
import { Share2 } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';

export default function ShareButton({ title, text }) {
  const toast = useToast();

  async function onClick() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast('Link copied. Paste it anywhere to share this trip.');
    } catch (err) {
      if (err?.name !== 'AbortError') toast('Could not share. Copy the address from your browser instead.', 'error');
    }
  }

  return (
    <button type="button" onClick={onClick} className="btn-ghost">
      <Share2 className="size-4" aria-hidden />
      Share
    </button>
  );
}
