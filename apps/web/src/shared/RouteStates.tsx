export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <p role="status" aria-live="polite">
      {label}
    </p>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p>{message}</p>;
}

export function ErrorState({ message = 'Something went wrong.', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert">
      <p>{message}</p>
      {onRetry && <button onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function NotFoundState({ message = "We couldn't find that page." }: { message?: string }) {
  return (
    <div>
      <h1>Not found</h1>
      <p>{message}</p>
    </div>
  );
}
