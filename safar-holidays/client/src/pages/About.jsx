// About the agency: story, numbers pulled live from the API, values and team.
import { Compass, HeartHandshake, Leaf, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router';
import { useApi } from '../lib/api.js';

const VALUES = [
  [Compass, 'Planned by people', 'Every itinerary is written and tested by our own planners, not copied from a catalogue.'],
  [ShieldCheck, 'Clear prices', 'The price you see includes hotels, transfers, sightseeing and GST. No surprises at checkout.'],
  [HeartHandshake, 'One team, start to finish', 'The same planner looks after your trip from the first message to the flight home.'],
  [Leaf, 'Travel lightly', 'We work with local guides and family-run stays wherever we can.'],
];

const TEAM = [
  ['Aarav Kulkarni', 'Founder, India trips'],
  ['Sneha Pillai', 'International holidays'],
  ['Imran Shaikh', 'Groups and events'],
  ['Divya Rao', 'Customer care'],
];

export default function About() {
  const { data } = useApi('/packages/meta');
  const list = useApi('/packages?limit=1');

  const numbers = [
    [list.data?.total ?? '…', 'tour packages'],
    [data?.categories?.length ?? '…', 'kinds of trips'],
    ['24 h', 'booking confirmation'],
    [data ? `${data.avgRating} / 5` : '…', `average rating (${data?.reviewCount ?? 0} reviews)`],
  ];

  return (
    <div>
      <section className="bg-ink py-20 text-white">
        <div className="container-page">
          <p className="font-semibold text-marigold">About Safar Holidays</p>
          <h1 className="mt-3 max-w-3xl text-5xl font-extrabold sm:text-6xl">Holidays planned the way you would plan them</h1>
          <p className="mt-5 max-w-2xl text-lg text-white/80">
            “Safar” means journey. We are a small Bengaluru travel team that has been putting together trips across
            India and abroad for families, couples and groups.
          </p>
        </div>
      </section>

      <section className="container-page -mt-10">
        <ul className="grid grid-cols-2 gap-3 rounded-3xl border border-line bg-white p-6 md:grid-cols-4">
          {numbers.map(([value, label]) => (
            <li key={label} className="text-center">
              <p className="font-display text-3xl font-extrabold text-peacock">{value}</p>
              <p className="text-sm text-slate">{label}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-page mt-20">
        <h2 className="text-3xl font-bold">What we care about</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {VALUES.map(([Icon, title, text]) => (
            <article key={title} className="flex gap-4 rounded-3xl border border-line bg-white p-6">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-marigold-soft text-marigold-deep">
                <Icon className="size-6" aria-hidden />
              </span>
              <div>
                <h3 className="text-xl font-bold">{title}</h3>
                <p className="mt-1 text-slate">{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="container-page mt-20">
        <h2 className="text-3xl font-bold">The planners</h2>
        <ul className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
          {TEAM.map(([name, role]) => (
            <li key={name} className="text-center">
              <div
                className="mx-auto grid size-24 place-items-center rounded-full bg-linear-to-br from-peacock to-ink font-display text-2xl font-bold text-white"
                aria-hidden
              >
                {name
                  .split(' ')
                  .map((w) => w[0])
                  .join('')}
              </div>
              <p className="mt-3 font-semibold">{name}</p>
              <p className="text-sm text-slate">{role}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-page mt-20">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-marigold-soft px-6 py-10 sm:px-10 md:flex-row md:items-center">
          <h2 className="text-3xl font-bold">Ready to pick a trip?</h2>
          <div className="flex gap-3">
            <Link to="/packages" className="btn-dark">
              Browse packages
            </Link>
            <Link to="/contact" className="btn-ghost">
              Talk to a planner
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
