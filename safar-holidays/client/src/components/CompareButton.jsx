// "Compare" toggle shown on package cards and the package page.
import { GitCompareArrows } from 'lucide-react';
import { MAX_COMPARE, useCompare } from '../context/CompareContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function CompareButton({ pkg, className = '' }) {
  const { has, toggle } = useCompare();
  const toast = useToast();
  const active = has(pkg.id);

  function onClick(e) {
    e.preventDefault();
    const result = toggle(pkg);
    if (result === 'full') toast(`You can compare up to ${MAX_COMPARE} trips. Remove one first.`, 'error');
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold transition-colors ${
        active ? 'border-peacock bg-peacock text-white' : 'border-line bg-white text-ink-soft hover:border-ink'
      } ${className}`}
    >
      <GitCompareArrows className="size-4" aria-hidden />
      {active ? 'Comparing' : 'Compare'}
      <span className="sr-only"> {pkg.title}</span>
    </button>
  );
}
