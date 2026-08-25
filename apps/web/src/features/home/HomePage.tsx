import { Link } from 'react-router-dom';

const linkBase = 'focus-ring inline-flex items-center justify-center rounded-lg px-4 font-sans font-semibold transition-transform duration-150 active:scale-[0.97]';

export function HomePage() {
  return (
    <main className="flex flex-col items-center text-center">
      <div>
        <h1 className="font-display text-display font-semibold text-ink-forest">BrokeEven</h1>
        <p className="mt-2 font-sans text-body text-ink-forest/70">
          Split bills with your people. No signup, no paywall.
        </p>
      </div>
      <nav className="mt-9 flex w-full flex-col gap-3">
        <Link
          to="/create"
          className={`${linkBase} h-[52px] bg-ink-forest text-paper-white hover:bg-[color-mix(in_srgb,var(--color-ink-forest)_92%,black)]`}
        >
          Create a Group
        </Link>
        <Link to="/quick" className={`${linkBase} h-[52px] border border-ink-forest text-ink-forest hover:bg-ledger-paper`}>
          Split with one person
        </Link>
        <Link to="/join" className={`${linkBase} h-10 text-brass-ui hover:underline`}>
          Join with a code
        </Link>
      </nav>
    </main>
  );
}
