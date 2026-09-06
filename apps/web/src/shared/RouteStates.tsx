export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <p role="status" aria-live="polite" className="font-sans text-body text-dim">
      {label}
    </p>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="font-sans text-body text-dim">{message}</p>;
}

export function ErrorState({ message = 'Something broke. Try again.', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2 font-sans text-body text-down">
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="focus-ring rounded-lg underline hover:opacity-70 active:opacity-50">
          Try again
        </button>
      )}
    </div>
  );
}

export function NotFoundState({ message = 'Page not found. Check the link and try again.' }: { message?: string }) {
  return (
    <div>
      <h1 className="heading text-display">Not found</h1>
      <p className="mt-2 font-sans text-body text-dim">{message}</p>
    </div>
  );
}
