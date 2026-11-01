// Review list and the form for travellers who booked the trip.
import { useState } from 'react';
import { Star } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import { formatDate } from '../lib/format.js';
import Stars from './Stars.jsx';

function ReviewForm({ packageId, existing, onSaved }) {
  const toast = useToast();
  const [rating, setRating] = useState(existing?.rating || 0);
  const [comment, setComment] = useState(existing?.comment || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!rating) {
      setError('Choose a rating from 1 to 5 stars.');
      return;
    }
    setBusy(true);
    try {
      await api(`/packages/${packageId}/reviews`, { method: 'POST', body: { rating, comment } });
      toast(existing ? 'Review updated' : 'Review posted. Thank you!');
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-3xl border border-line bg-white p-5">
      <h3 className="text-lg font-bold">{existing ? 'Update your review' : 'Review this trip'}</h3>
      <fieldset className="mt-3">
        <legend className="sr-only">Your rating</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer rounded p-0.5 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-peacock">
              <input
                type="radio"
                name="rating"
                value={n}
                checked={rating === n}
                onChange={() => setRating(n)}
                className="sr-only"
              />
              <Star
                className={`size-7 ${n <= rating ? 'fill-marigold text-marigold' : 'fill-mist text-line'}`}
                aria-hidden
              />
              <span className="sr-only">
                {n} {n === 1 ? 'star' : 'stars'}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-3 block">
        <span className="sr-only">Your review</span>
        <textarea
          className="field min-h-24"
          placeholder="What did you enjoy? What should other travellers know?"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          required
        />
      </label>
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-sindoor">
          {error}
        </p>
      )}
      <button className="btn-dark mt-3" disabled={busy}>
        {busy ? 'Saving…' : existing ? 'Update review' : 'Post review'}
      </button>
    </form>
  );
}

export default function Reviews({ pkg, reviews, viewer, onChanged }) {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <section id="reviews" className="scroll-mt-24">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-2xl font-bold">Reviews</h2>
        <Stars rating={pkg.rating} count={pkg.review_count} />
      </div>

      <div className="mt-5 space-y-4">
        {viewer?.canReview && <ReviewForm packageId={pkg.id} existing={viewer.myReview} onSaved={onChanged} />}
        {user && viewer && !viewer.canReview && (
          <p className="text-slate">You can review this trip once you have booked it.</p>
        )}
        {!user && (
          <p className="text-slate">
            Travelled with us?{' '}
            <Link className="link" to={`/login?next=${encodeURIComponent(location.pathname)}`}>
              Log in
            </Link>{' '}
            to review this trip.
          </p>
        )}

        {reviews.length === 0 ? (
          <p className="text-slate">No reviews yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {reviews.map((r) => (
              <li key={r.id} className="py-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{r.user_name}</p>
                  <p className="text-sm text-slate">{formatDate(r.created_at)}</p>
                </div>
                <div className="mt-1">
                  <Stars rating={r.rating} showNumber={false} />
                </div>
                <p className="mt-2 text-ink-soft">{r.comment}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
