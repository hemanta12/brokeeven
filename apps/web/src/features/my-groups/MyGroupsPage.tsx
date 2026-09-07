import { Link } from 'react-router-dom';

import { buttonClass } from '../../components/Button';
import { SignInPrompt } from '../auth/SignInPrompt';
import { useMyGroups, useSession, type MyGroup } from '../auth/api';
import { Amount } from '../../components/Amount';
import { AvatarCluster } from '../../components/Avatar';
import { CornerDecor } from '../../components/CornerDecor';
import { capitalizeFirst, formatDate, formatUpdatedLabel } from '../../shared/format';
import { EmptyState, ErrorState, LoadingState } from '../../shared/RouteStates';

// Plain text, not a pill — a pill inside a row that's already a link reads as a button.
function BalanceAmount({
  direction,
  amount,
  currency
}: {
  direction: MyGroup['netDirection'];
  amount: string;
  currency: string;
}) {
  if (direction === 'settled') {
    return <span className="font-sans text-row-amount font-semibold text-dim">Even.</span>;
  }
  return (
    <Amount
      value={Number(amount)}
      currency={currency}
      direction={direction === 'owed' ? 'up' : 'down'}
      label={direction === 'owed' ? 'you’re owed' : 'you owe'}
      className="text-row-amount font-semibold"
    />
  );
}

function LockGlyph() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      className="h-3 w-3 shrink-0"
    >
      <rect x="4.5" y="8.75" width="11" height="7.25" rx="1.75" />
      <path d="M7.25 8.75V6.5a2.75 2.75 0 0 1 5.5 0v2.25" strokeLinecap="round" />
    </svg>
  );
}

// A closed group keeps its figures but loses its lift and its action; Add expense
// would only 409.
function GroupCard({ group }: { group: MyGroup }) {
  const closed = Boolean(group.closedAt);

  return (
    <li
      className={`rounded-card border border-line px-4 pb-3 pt-3.5 ${
        closed ? 'bg-surface/70' : 'bg-surface shadow-card transition-shadow duration-150 hover:shadow-card-hover'
      }`}
    >
      <Link to={`/g/${group.joinCode}`} className="focus-ring flex min-h-11 items-start gap-3 rounded-inner">
        {/* min-w-0 lets the name clamp instead of pushing the amount off its column. */}
        <span className="min-w-0 flex-1">
          <span className="flex items-start gap-2">
            <span
              className={`min-w-0 font-sans text-body font-semibold leading-snug line-clamp-2 ${
                closed ? 'text-dim' : 'text-ink'
              }`}
            >
              {group.name}
            </span>
            {/* "Individual" is auto-set on quick 1:1 groups; not worth showing. */}
            {group.label && group.label !== 'Individual' && (
              <span
                className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 font-sans text-micro leading-none ${
                  closed ? 'border-line-strong text-dim' : 'border-accent text-accent'
                }`}
              >
                {capitalizeFirst(group.label)}
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate font-sans text-micro text-dim">
            Updated {formatUpdatedLabel(group.lastActivityAt)}
          </span>
        </span>
        <span className="shrink-0">
          <BalanceAmount direction={group.netDirection} amount={group.netAmount} currency={group.currency} />
        </span>
      </Link>
      <div className="-mx-4 mt-3 flex items-center justify-between gap-3 border-t border-line px-4 pt-3">
        {closed ? (
          <span className="flex min-h-11 items-center gap-1.5 font-sans text-micro font-semibold uppercase tracking-[0.06em] text-dim">
            <LockGlyph />
            Closed {formatDate(group.closedAt as string)}
          </span>
        ) : (
          /* GroupPage reads ?add=expense and opens the modal directly. */
          /* Ink link, not accent: accent next to the accent balance figure is ambiguous. */
          <Link
            to={`/g/${group.joinCode}?add=expense`}
            className="focus-ring flex min-h-11 items-center gap-1.5 rounded-full pr-2 font-sans text-label font-semibold text-ink"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true" className="h-3.5 w-3.5 text-accent">
              <path d="M10 4v12M4 10h12" strokeLinecap="round" />
            </svg>
            Add expense
          </Link>
        )}
        <span className="flex shrink-0 items-center gap-2">
          <AvatarCluster names={group.members} total={group.memberCount} />
          <span className="font-sans text-micro text-dim">
            {group.memberCount} {group.memberCount === 1 ? 'person' : 'people'}
          </span>
        </span>
      </div>
    </li>
  );
}

function totalFor(groups: MyGroup[], direction: MyGroup['netDirection']): number {
  return groups
    .filter((group) => group.netDirection === direction)
    .reduce((sum, group) => sum + Number(group.netAmount), 0);
}

// ponytail: cross-group totals only make sense in one currency. Mixed currencies
// fall back to USD until the deferred consolidated view (PRD deferred #3).
function commonCurrency(groups: MyGroup[]): string {
  const distinct = new Set(groups.map((group) => group.currency));
  return distinct.size === 1 ? ([...distinct][0] ?? 'USD') : 'USD';
}

function BandHeader({ groups }: { groups?: MyGroup[] }) {
  const owed = groups ? totalFor(groups, 'owed') : null;
  const owe = groups ? totalFor(groups, 'owe') : null;
  const bandCurrency = groups ? commonCurrency(groups) : 'USD';
  const settled = owed === 0 && owe === 0;

  return (
    <header className="relative -mx-4 -mt-2 overflow-hidden bg-band px-4 pb-7 pt-9 text-white sm:rounded-t-card sm:px-6">
      <CornerDecor />
      <h1 className="relative heading text-display text-white">My groups</h1>

      {groups && settled && (
        <div className="relative mt-7 flex items-center gap-2.5 rounded-card bg-surface px-4 py-3.5 shadow-sheet">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-accent"
          >
            <path d="M4.5 10.5l3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="font-sans text-label text-dim">
            <span className="font-semibold text-ink">All settled up</span> across {groups.length}{' '}
            {groups.length === 1 ? 'group' : 'groups'}.
          </p>
        </div>
      )}

      {groups && !settled && (
        <dl className="relative mt-7 grid grid-cols-2 gap-2.5">
          <div className="rounded-card bg-surface px-4 py-3 shadow-sheet">
            <dt className="font-sans text-micro text-dim">You&rsquo;re owed</dt>
            <dd className="mt-1">
              <Amount value={owed ?? 0} currency={bandCurrency} direction="up" className="block truncate text-title font-semibold" />
            </dd>
          </div>
          <div className="rounded-card bg-surface px-4 py-3 shadow-sheet">
            <dt className="font-sans text-micro text-dim">You owe</dt>
            <dd className="mt-1">
              <Amount value={owe ?? 0} currency={bandCurrency} direction="down" className="block truncate text-title font-semibold" />
            </dd>
          </div>
        </dl>
      )}
    </header>
  );
}

// The signed-in account's groups, newest activity first.
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
      <main className="flex flex-col pt-2">
        <BandHeader />
        <div className="flex flex-col gap-4 pt-8">
          <SignInPrompt />
          <p className="text-center font-sans text-label text-dim">
            Or{' '}
            <Link to="/join" className="underline">
              join with a code
            </Link>{' '}
            instead.
          </p>
        </div>
      </main>
    );
  }

  const groups = data?.groups ?? [];
  const hasGroups = groups.length > 0;
  const openGroups = groups.filter((group) => !group.closedAt);
  const closedGroups = groups.filter((group) => group.closedAt);

  return (
    <main className="flex flex-col pt-2">
      <div className="flex flex-1 flex-col pb-2">
        <BandHeader groups={hasGroups ? groups : undefined} />

        {isPending && (
          <div className="px-4 pt-6 sm:px-6">
            <LoadingState />
          </div>
        )}
        {isError && (
          <div className="px-4 pt-6 sm:px-6">
            <ErrorState message={error.message} onRetry={() => void refetch()} />
          </div>
        )}

        {data && !hasGroups && (
          <div className="px-4 pt-6 sm:px-6">
            <EmptyState message="No groups yet. Start one below, or join with a code. Groups show up here once you say who you are in one." />
          </div>
        )}

        {openGroups.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2.5 px-4 sm:px-6">
            {openGroups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </ul>
        )}

        {hasGroups && openGroups.length === 0 && (
          <p className="mt-4 px-4 font-sans text-label text-dim sm:px-6">
            Every group is closed. Start a new one below.
          </p>
        )}

        {/* Native <details>: closed groups are archive, so they cost a tap by default.
            Defaulted open when there is nothing else on the page, so the list never
            renders empty with content one tap away. */}
        {closedGroups.length > 0 && (
          <details open={openGroups.length === 0} className="group mt-6 px-4 sm:px-6">
            <summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-inner font-sans text-label font-medium text-dim [&::-webkit-details-marker]:hidden">
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
                className="h-3.5 w-3.5 transition-transform duration-150 group-open:rotate-90 motion-reduce:transition-none"
              >
                <path d="M7.5 4.5l6 5.5-6 5.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Closed groups
              <span className="rounded-full bg-sunken px-2 py-0.5 font-sans text-micro font-semibold text-dim">
                {closedGroups.length}
              </span>
            </summary>
            <ul className="mt-2.5 flex flex-col gap-2.5">
              {closedGroups.map((group) => (
                <GroupCard key={group.id} group={group} />
              ))}
            </ul>
          </details>
        )}

        <div className="bottom-bar mt-auto">
          <p className="font-sans text-label text-dim">
            <Link to="/quick" className="focus-ring rounded underline">
              Split with one person
            </Link>
            <span aria-hidden="true" className="mx-3 text-line-strong">|</span>
            <Link to="/join" className="focus-ring rounded underline">
              Join with a code
            </Link>
          </p>
          <Link
            to="/create"
            className={buttonClass()}
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
