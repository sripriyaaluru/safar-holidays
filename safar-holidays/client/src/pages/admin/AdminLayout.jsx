import { Inbox, LayoutDashboard, Luggage, Ticket, Users } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';

const NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/bookings', label: 'Bookings', icon: Ticket },
  { to: '/admin/packages', label: 'Packages', icon: Luggage },
  { to: '/admin/enquiries', label: 'Enquiries', icon: Inbox },
  { to: '/admin/users', label: 'Customers', icon: Users },
];

export default function AdminLayout() {
  return (
    <div className="container-page pt-8">
      <h1 className="text-3xl font-extrabold sm:text-4xl">Admin</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-[190px_1fr]">
        <nav aria-label="Admin" className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:px-0">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-[15px] font-semibold ${
                  isActive ? 'bg-ink text-white' : 'text-ink-soft hover:bg-mist'
                }`
              }
            >
              <Icon className="size-[18px]" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
