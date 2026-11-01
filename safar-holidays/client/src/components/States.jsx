// Loading, error and empty states shared by every page.
import { CircleAlert, LoaderCircle } from 'lucide-react';

export function Loader({ label = 'Loading' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-20 text-slate" role="status">
      <LoaderCircle className="size-5 animate-spin" aria-hidden />
      <span>{label}…</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-sindoor/30 bg-white p-6 text-center">
      <CircleAlert className="mx-auto size-7 text-sindoor" aria-hidden />
      <p className="mt-3 text-ink">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost mt-4">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-line px-6 py-14 text-center">
      <h3 className="text-xl font-bold">{title}</h3>
      {children && <p className="mx-auto mt-2 max-w-md text-slate">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
