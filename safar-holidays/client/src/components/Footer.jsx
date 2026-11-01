import { Link } from 'react-router';
import Logo from './Logo.jsx';

export default function Footer() {
  return (
    <footer className="mt-24 bg-ink text-white/80">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <Logo light />
          <p className="mt-4 max-w-sm text-[15px]">
            Hand-planned holidays across India and abroad. One team looks after your trip from the first enquiry to
            the flight home.
          </p>
        </div>
        <div>
          <h2 className="font-display text-base font-bold text-white">Explore</h2>
          <ul className="mt-3 space-y-2 text-[15px]">
            <li><Link className="hover:text-white" to="/packages?region=domestic">Trips in India</Link></li>
            <li><Link className="hover:text-white" to="/packages?region=international">International trips</Link></li>
            <li><Link className="hover:text-white" to="/packages?category=honeymoon">Honeymoon packages</Link></li>
            <li><Link className="hover:text-white" to="/contact">Plan a custom trip</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="font-display text-base font-bold text-white">Talk to us</h2>
          <ul className="mt-3 space-y-2 text-[15px]">
            <li>+91 98765 43210</li>
            <li>support@example.com</li>
            <li>Mon to Sat, 9:30 am to 7 pm</li>
            <li>MG Road, Bengaluru</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="container-page py-5 text-sm text-white/60">
          © {new Date().getFullYear()} Safar Holidays. A student full-stack project.
        </p>
      </div>
    </footer>
  );
}
