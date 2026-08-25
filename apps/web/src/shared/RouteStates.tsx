export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <p role="status" aria-live="polite" className="font-sans text-body text-ink-forest/70">
      {label}
    </p>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="font-sans text-body text-ink-forest/70">{message}</p>;
}

export function ErrorState({ message = 'Something went wrong.', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2 font-sans text-body text-debt-red">
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="focus-ring rounded-lg underline">
          Try again
        </button>
      )}
    </div>
  );
}

export function NotFoundState({ message = "We couldn't find that page." }: { message?: string }) {
  return (
    <div>
      <h1 className="font-display text-display font-semibold text-ink-forest">Not found</h1>
      <p className="mt-2 font-sans text-body text-ink-forest/70">{message}</p>
    </div>
  );
}
