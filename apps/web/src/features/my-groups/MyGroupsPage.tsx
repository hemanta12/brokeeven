import { Link } from 'react-router-dom';

import { SignInButton } from '../auth/SignInButton';
import { useMyGroups, useSession, type MyGroup } from '../auth/api';
import { formatCurrency, formatDateGroupLabel } from '../../shared/format';
import { EmptyState, ErrorState, LoadingState } from '../../shared/RouteStates';

// Plain coloured text, not a pill — a pill shape reads as a tappable button,
// especially sitting inside a row that already is a link. Matches BalanceRow
// (owe = Debt Red, owed = Ledger Green); the sign carries the direction on its
// own so colour is never the only cue.
const DIRECTION_CLASSES: Record<MyGroup['netDirection'], string> = {
  owe: 'text-debt-red',
  owed: 'text-ledger-green',
  settled: 'text-ink-forest/70',
};

function BalanceAmount({ direction, amount }: { direction: MyGroup['netDirection']; amount: string }) {
  if (direction === 'settled') {
    return <span className="font-sans text-label text-ink-forest/70">Settled</span>;
  }
  return (
    <span className={`font-sans text-row-amount font-medium tabular-nums ${DIRECTION_CLASSES[direction]}`}>
      {direction === 'owed' ? '+' : '−'}
      {formatCurrency(Number(amount))}
    </span>
  );
}

function totalFor(groups: MyGroup[], direction: MyGroup['netDirection']): number {
  return groups
    .filter((group) => group.netDirection === direction)
    .reduce((sum, group) => sum + Number(group.netAmount), 0);
}

// The ledger's running total: the two sides kept apart rather than netted
// into one figure, because owing $80 in one group and being owed $80 in
// another is not the same situation as being square.
function BalanceSummary({ groups }: { groups: MyGroup[] }) {
  const owed = totalFor(groups, 'owed');
  const owe = totalFor(groups, 'owe');

  if (owed === 0 && owe === 0) {
    // A dashed outline on the bare sheet — a settled-up state is really an
    // empty state, and the dashed rule is the app's "nothing here" signifier.
    // Not filled (that reads as a button) and not a mint row.
    return (
      <section
        aria-label="Your balance"
        className="mx-4 mt-4 flex items-center gap-2.5 rounded-[12px] border border-dashed border-ink-forest/25 px-4 py-4 sm:mx-6"
      >
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-brass-ui"
        >
          <path d="M4.5 10.5l3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="min-w-0">
          <p className="font-sans text-body font-semibold text-ink-forest">All settled up</p>
          <p className="mt-0.5 font-sans text-label text-ink-forest/70">
            Nothing outstanding across {groups.length} {groups.length === 1 ? 'group' : 'groups'}.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Your balance"
      className="mx-4 mt-4 flex rounded-[12px] border border-ledger-green/20 bg-ledger-paper sm:mx-6"
    >
      <div className="min-w-0 flex-1 px-4 py-3.5">
        <p className="font-sans text-label text-ink-forest/70">You&rsquo;re owed</p>
        <p className="mt-1 truncate font-sans text-hero-balance font-medium tabular-nums text-ledger-green">
          {formatCurrency(owed)}
        </p>
      </div>
      {/* Hairline, not a gap: the two figures are one reading, and a rule
          between them says "these are two columns of the same ledger". */}
      <div aria-hidden="true" className="my-3 w-px shrink-0 bg-ledger-green/20" />
      <div className="min-w-0 flex-1 px-4 py-3.5">
        <p className="font-sans text-label text-ink-forest/70">You owe</p>
        <p className="mt-1 truncate font-sans text-hero-balance font-medium tabular-nums text-debt-red">
          {formatCurrency(owe)}
        </p>
      </div>
    </section>
  );
}

// Every group the signed-in account has a live person in. A plain reverse-
// chronological list, not a card grid: these are records, and the useful
// comparison between rows is the balance, which only lines up in a column.
export function MyGroupsPage() {
  const { isSignedIn, isPending: sessionPending } = useSession();
  const { data, isPending, isError, error, refetch } = useMyGroups(isSignedIn);

  if (sessionPending) {
    return (
      <main>
        <LoadingState />
      </main>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="flex flex-col gap-5">
        <div>
          <h1 className="heading text-display">
            My groups
          </h1>
          <p className="mt-2 font-sans text-body text-ink-forest/70">
            Sign in to see every group you are part of in one place, on any device. Groups you already opened in
            this browser come with you.
          </p>
        </div>
        <SignInButton />
        <p className="font-sans text-label text-ink-forest/70">
          You do not need an account to use BrokeEven —{' '}
          <Link to="/join" className="underline">
            join with a code
          </Link>{' '}
          instead.
        </p>
      </main>
    );
  }

  const groups = data?.groups ?? [];

  return (
    <main className="flex flex-col pt-2">
      <div className="flex flex-1 flex-col rounded-[14px] bg-paper-white pb-2">
        <header className="px-4 pt-3 sm:px-6">
          <h1 className="heading text-display">
            My groups
          </h1>
        </header>

        {isPending && (
          <div className="px-4 pt-4 sm:px-6">
            <LoadingState />
          </div>
        )}
        {isError && (
          <div className="px-4 pt-4 sm:px-6">
            <ErrorState message={error.message} onRetry={() => void refetch()} />
          </div>
        )}

        {groups.length > 0 && <BalanceSummary groups={groups} />}

        {data && groups.length === 0 && (
          <div className="px-4 pt-4 sm:px-6">
            <EmptyState message="No groups yet. Start one below, or join with a code — groups show up here once you say who you are in one." />
          </div>
        )}

        {groups.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2 px-4 sm:px-6">
            {groups.map((group) => (
              <li key={group.id} className="entry-card entry-card-tappable">
                <Link
                  to={`/g/${group.joinCode}`}
                  className="focus-ring flex min-h-11 items-center gap-3 rounded-[10px] px-3 py-3"
                >
                  {/* A group mark, same on every row — the same people glyph
                      the group page uses for its member list. A per-group
                      initial in a disc reads as a numbered index. */}
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-forest/8 text-ink-forest/70"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="h-[18px] w-[18px]"
                    >
                      <circle cx="7.5" cy="7" r="2.75" />
                      <path d="M2.5 16c.5-2.6 2.5-4 5-4s4.5 1.4 5 4" strokeLinecap="round" />
                      <path
                        d="M13.5 5.2a2.5 2.5 0 0 1 0 4.6M14.8 12.2c1.7.5 2.9 1.8 3.4 3.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  {/* min-w-0 is what lets the name truncate instead of
                      shoving the amount off its own column. */}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="min-w-0 truncate font-sans text-body font-semibold text-ink-forest">
                        {group.name}
                      </span>
                      {group.label && (
                        <span className="shrink-0 rounded-full border border-brass-ui px-2 py-0.5 font-sans text-[0.6875rem] leading-none text-brass-ui">
                          {group.label}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate font-sans text-label text-ink-forest/70">
                      {group.memberCount} {group.memberCount === 1 ? 'person' : 'people'} · {group.expenseCount}{' '}
                      {group.expenseCount === 1 ? 'expense' : 'expenses'} ·{' '}
                      {formatDateGroupLabel(group.lastActivityAt)}
                    </span>
                  </span>
                  <span className="shrink-0">
                    <BalanceAmount direction={group.netDirection} amount={group.netAmount} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="bottom-bar mt-auto">
          <p className="font-sans text-label text-ink-forest/70">
            <Link to="/quick" className="focus-ring rounded underline">
              Split with one person
            </Link>
            <span aria-hidden="true" className="mx-3 text-ink-forest/30">|</span>
            <Link to="/join" className="focus-ring rounded underline">
              Join with a code
            </Link>
          </p>
          <Link
            to="/create"
            className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink-forest px-6 font-sans font-semibold text-paper-white transition-transform duration-150 hover:bg-[color-mix(in_srgb,var(--color-ink-forest)_92%,black)] active:scale-[0.97]"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="h-4 w-4">
              <path d="M10 4v12M4 10h12" strokeLinecap="round" />
            </svg>
            New group
          </Link>
        </div>
      </div>
    </main>
  );
}
