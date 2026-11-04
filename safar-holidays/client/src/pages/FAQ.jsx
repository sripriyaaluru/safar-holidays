// Frequently asked questions with a live search, built from native <details> elements.
import { useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Link } from 'react-router';
import { REFUND_POLICY } from '../lib/format.js';

const FAQS = [
  {
    group: 'Booking',
    items: [
      ['How do I book a trip?', 'Open any package, choose a start date and the number of travellers in the booking panel, and press Book. You need an account so we can show the booking in My trips.'],
      ['How soon can my trip start?', 'Trips can start from 3 days after today and can be booked up to one year ahead. This gives our team time to confirm hotels and transport.'],
      ['Do children pay less?', 'Yes. Children under 12 travel at half the adult price. The price shown in the booking panel is calculated automatically.'],
      ['Can I book for a big group?', 'Each package has a group size limit shown on its page. For larger groups or company offsites, send us a message on the Contact page for a custom quote.'],
    ],
  },
  {
    group: 'Payments and coupons',
    items: [
      ['When do I pay?', 'You pay nothing when you book. Once our team confirms availability (usually within 24 hours), a Pay button appears in My trips. You can pay by card or UPI.'],
      ['How do coupon codes work?', 'Type the code in the booking panel and press Apply. The discount is checked on our server and shown before you book. Each code can be used once per traveller, and some need a minimum booking amount.'],
      ['Is GST included?', 'Yes. Package prices include 5% GST. Your invoice shows the taxable value and the GST amount separately.'],
      ['Where is my invoice?', 'After you pay, open My trips and select View invoice. You can print it or save it as a PDF.'],
    ],
  },
  {
    group: 'Cancellations and refunds',
    items: [
      ['Can I cancel a booking?', 'Yes, from My trips, any time before the trip starts.'],
      [
        'How much do I get back?',
        `If you have paid, the refund depends on how early you cancel: ${REFUND_POLICY.map((t) => `${t.label.toLowerCase()}: ${t.percent}%`).join('; ')}. If we cancel a trip, you always get a full refund.`,
      ],
      ['How long does a refund take?', 'Refunds are started immediately and normally reach your bank in 5 to 7 working days.'],
    ],
  },
  {
    group: 'Your account',
    items: [
      ['How do I change my phone number or password?', 'Open your profile from the menu (your name at the top). You can update your details and change your password there.'],
      ['What are traveller levels?', 'Explorer, Silver (2 completed trips) and Gold (5 completed trips). Your level is shown on your profile.'],
      ['Can I make the text bigger?', 'Yes. Use the accessibility button (the person icon at the top) to choose a larger text size, high contrast colours or underlined links.'],
    ],
  },
];

export default function FAQ() {
  const [query, setQuery] = useState('');
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQS;
    return FAQS.map((g) => ({
      ...g,
      items: g.items.filter(([question, answer]) => `${question} ${answer}`.toLowerCase().includes(q)),
    })).filter((g) => g.items.length);
  }, [query]);

  return (
    <div className="container-page max-w-3xl pt-10">
      <h1 className="text-4xl font-extrabold sm:text-5xl">Questions and policies</h1>
      <p className="mt-3 text-lg text-slate">Everything about booking, paying and cancelling.</p>

      <label className="relative mt-8 block">
        <span className="sr-only">Search questions</span>
        <Search className="absolute left-3.5 top-3 size-5 text-slate" aria-hidden />
        <input
          type="search"
          className="field pl-11"
          placeholder="Search, for example refund or coupon"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      <div className="mt-8 space-y-10" aria-live="polite">
        {groups.length === 0 && (
          <p className="text-slate">
            No questions match “{query}”. <Link to="/contact" className="link">Ask us directly</Link>.
          </p>
        )}
        {groups.map((g) => (
          <section key={g.group}>
            <h2 className="text-2xl font-bold">{g.group}</h2>
            <div className="mt-4 divide-y divide-line rounded-3xl border border-line bg-white">
              {g.items.map(([q, a]) => (
                <details key={q} className="group px-5 py-4" open={Boolean(query)}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                    {q}
                    <ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="mt-2 text-ink-soft">{a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 rounded-3xl bg-peacock-soft p-6">
        <h2 className="text-xl font-bold">Still have a question?</h2>
        <p className="mt-1 text-ink-soft">Our travel planners reply within one working day.</p>
        <Link to="/contact" className="btn-dark mt-4">
          Contact us
        </Link>
      </div>
    </div>
  );
}
