import { Link } from 'react-router';

export default function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <p className="font-display text-7xl font-extrabold text-line">404</p>
      <h1 className="mt-4 text-3xl font-bold">This page took a wrong turn</h1>
      <p className="mt-2 text-slate">The link may be old, or the page may have moved.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link to="/" className="btn-dark">
          Go to home page
        </Link>
        <Link to="/packages" className="btn-ghost">
          Browse packages
        </Link>
      </div>
    </div>
  );
}
