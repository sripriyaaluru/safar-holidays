import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from './Logo.jsx';

const linkClass = ({ isActive }) =>
  `rounded-full px-3 py-2 text-[15px] font-semibold transition-colors ${
    isActive ? 'bg-mist text-ink' : 'text-ink-soft hover:text-ink'
  }`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const links = [
    { to: '/packages', label: 'Packages' },
    ...(user ? [{ to: '/saved', label: 'Saved' }, { to: '/trips', label: 'My trips' }] : []),
    { to: '/contact', label: 'Contact' },
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin' }] : []),
  ];

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <nav className="container-page flex h-16 items-center justify-between gap-4" aria-label="Main">
        <Logo />

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <span className="text-sm text-slate">Hi, {user.name.split(' ')[0]}</span>
              <button onClick={handleLogout} className="btn-ghost py-2">
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="btn-ghost py-2">
                Log in
              </NavLink>
              <NavLink to="/register" className="btn-primary py-2">
                Sign up
              </NavLink>
            </>
          )}
        </div>

        <button
          className="grid size-10 place-items-center rounded-full hover:bg-mist md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </nav>

      {open && (
        <div id="mobile-menu" className="border-t border-line bg-white md:hidden">
          <div className="container-page flex flex-col gap-1 py-3">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={linkClass}>
                {l.label}
              </NavLink>
            ))}
            <div className="mt-2 flex gap-2 border-t border-line pt-3">
              {user ? (
                <button onClick={handleLogout} className="btn-ghost flex-1">
                  Log out
                </button>
              ) : (
                <>
                  <NavLink to="/login" className="btn-ghost flex-1">
                    Log in
                  </NavLink>
                  <NavLink to="/register" className="btn-primary flex-1">
                    Sign up
                  </NavLink>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
