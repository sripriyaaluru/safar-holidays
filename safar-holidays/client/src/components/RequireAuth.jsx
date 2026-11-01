// Protects pages that need a logged-in user (or an admin).
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import { Loader } from './States.jsx';

export default function RequireAuth({ admin = false, children }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return <Loader />;
  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}
