/** Loading skeletons, notices, empty and error messages shared by all tabs. */

/**
 * One line of tappable example searches. On narrow screens the row scrolls
 * sideways (swipe on phones) instead of wrapping onto a second line.
 */
export function ExampleRow({ label, items, onPick }: { label: string; items: readonly string[]; onPick: (item: string) => void }) {
  return (
    <div>
      <p className="text-sm text-muted">{label}</p>
      <ul className="chip-row -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
        {items.map((item) => (
          <li key={item} className="shrink-0">
            <button
              type="button"
              onClick={() => onPick(item)}
              className="min-h-10 whitespace-nowrap rounded-full border border-line bg-surface px-4 text-sm hover:border-accent"
            >
              {item}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SkeletonList({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-live="polite" className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <span className="sr-only">Searching…</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex gap-4 rounded-2xl border border-line bg-surface p-3 sm:p-4" aria-hidden="true">
          <div className="skeleton w-24 shrink-0 rounded-xl sm:w-28" style={{ aspectRatio: "23 / 33" }} />
          <div className="flex-1 space-y-3 py-1">
            <div className="skeleton h-5 w-3/4 rounded" />
            <div className="skeleton h-4 w-1/2 rounded" />
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-5/6 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="mb-4 rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-muted">
      {children}
    </p>
  );
}

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div role="status" className="rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <p className="font-display text-lg">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{hint}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-danger/50 px-6 py-8 text-center">
      <p className="font-bold text-danger">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 min-h-10 rounded-full border border-line px-5 text-sm font-medium hover:bg-surface-2"
        >
          Try again
        </button>
      )}
    </div>
  );
}
