import { Link } from 'react-router';
import PackageCard from '../components/PackageCard.jsx';
import { EmptyState, ErrorState, Loader } from '../components/States.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../lib/api.js';

export default function Saved() {
  const { savedIds } = useAuth();
  const { data, error, loading, reload } = useApi('/wishlist');
  // Hide cards straight away when the heart is clicked on this page.
  const packages = (data?.packages || []).filter((p) => savedIds.has(p.id));

  return (
    <div className="container-page pt-10">
      <h1 className="text-4xl font-extrabold sm:text-5xl">Saved trips</h1>
      <p className="mt-2 text-slate">Trips you have saved with the heart button.</p>

      <div className="mt-8">
        {loading && !data && <Loader />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {data && packages.length === 0 && (
          <EmptyState title="Nothing saved yet" action={<Link to="/packages" className="btn-primary">Browse packages</Link>}>
            Tap the heart on any package to keep it here while you decide.
          </EmptyState>
        )}
        {packages.length > 0 && (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((p) => (
              <PackageCard key={p.id} pkg={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
