import { Link } from 'react-router-dom';

const linkBase = 'focus-ring inline-flex items-center justify-center rounded-lg px-4 font-sans font-semibold transition-transform duration-150 active:scale-[0.97]';

export function HomePage() {
  return (
    /* Grid, not flex: three rows of 1fr / auto / 1fr make the two flanking
       rows always equal height, so the middle row (the "Split with one
       person" button) lands exactly at the vertical center of the screen
       regardless of how tall the title/subtitle or the two other buttons
       render — the browser solves that arithmetic per-layout instead of us
       hardcoding pixel offsets that would drift the moment copy wraps or a
       font metric shifts. */
    <main className="grid min-h-[calc(100vh-var(--navbar-height))] grid-rows-[1fr_auto_1fr] gap-3 text-center">
      <div className="flex w-full flex-col items-center justify-end gap-12 self-end">
        <div>
          <h1 className="font-display text-display font-semibold tracking-[-0.025em] leading-[1.15] text-ink-forest">BrokeEven</h1>
          <p className="mt-2 font-sans text-body text-ink-forest/70">
            Split bills with your people. No signup, no paywall.
          </p>
        </div>
        <Link
          to="/create"
          className={`${linkBase} h-[52px] w-full bg-ink-forest text-paper-white hover:bg-[color-mix(in_srgb,var(--color-ink-forest)_92%,black)]`}
        >
          Create a Group
        </Link>
      </div>

      <Link to="/quick" className={`${linkBase} h-[52px] w-full border border-ink-forest text-ink-forest hover:bg-ledger-paper`}>
        Split with one person
      </Link>

      <Link to="/join" className={`${linkBase} h-10 w-full self-start text-ink-forest hover:underline`}>
        Join with a code
      </Link>
    </main>
  );
}
