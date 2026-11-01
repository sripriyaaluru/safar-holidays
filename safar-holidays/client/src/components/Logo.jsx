import { Link } from 'react-router';

export default function Logo({ light = false }) {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="Safar Holidays home">
      <svg viewBox="0 0 64 64" className="size-9" aria-hidden>
        <rect width="64" height="64" rx="14" fill={light ? '#ffffff' : '#1B2A4A'} />
        <path
          d="M14 40c8-14 22-20 36-18-9 3-16 9-20 18"
          fill="none"
          stroke="#F4A300"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle cx="44" cy="20" r="5" fill="#F4A300" />
      </svg>
      <span className={`font-display text-[22px] font-extrabold leading-none ${light ? 'text-white' : 'text-ink'}`}>
        Safar
        <span className={`ml-1 text-sm font-semibold ${light ? 'text-white/70' : 'text-slate'}`}>Holidays</span>
      </span>
    </Link>
  );
}
