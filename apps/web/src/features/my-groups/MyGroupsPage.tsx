import { Link } from 'react-router-dom';

import { buttonClass } from '../../components/Button';
import { SignInPrompt } from '../auth/SignInPrompt';
import { useMyGroups, useSession, type MyGroup } from '../auth/api';
import { AvatarCluster } from '../../components/Avatar';
import { CornerDecor } from '../../components/CornerDecor';
import { capitalizeFirst, formatCurrency, formatDate, formatUpdatedLabel } from '../../shared/format';
import { EmptyState, ErrorState, LoadingState } from '../../shared/RouteStates';

const DIRECTION_STYLE: Record<MyGroup['netDirection'], { label: string; text: string }> = {
  owed: { label: 'You’re owed', text: 'text-accent' },
  owe: { label: 'You owe', text: 'text-down' },
  settled: { label: 'Even', text: 'text-ink' }
};

// "Individual" is auto-set on quick 1:1 groups; a real label wins over both.
function spineLabel(group: MyGroup): string {
  if (group.label && group.label !== 'Individual') return capitalizeFirst(group.label);
  if (group.label === 'Individual') return '1:1';
  return 'Group';
}

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
  const style = DIRECTION_STYLE[direction];
  return (
    <span className="block text-right">
      <span className="block font-sans text-micro font-semibold uppercase tracking-[0.06em] text-dim">
        {style.label}
      </span>
      <span className={`mt-0.5 block font-mono text-row-amount font-semibold ${style.text}`}>
        {formatCurrency(Number(amount), currency)}
      </span>
    </span>
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

// Closed groups drop Add expense — the server 409s it anyway.
function GroupCard({ group }: { group: MyGroup }) {
  const closed = Boolean(group.closedAt);

  return (
    <li
      className={`flex overflow-hidden rounded-card border border-line ${
        closed ? 'bg-surface/70' : 'bg-surface shadow-card transition-shadow duration-150 hover:shadow-card-hover'
      }`}
    >
      {/* Deliberately grayscale, not a balance-direction accent bar. */}
      <span aria-hidden="true" className="flex w-7 shrink-0 items-center justify-center bg-sunken py-3">
        <span className="[writing-mode:vertical-rl] rotate-180 truncate font-sans text-micro font-semibold uppercase tracking-[0.08em] text-dim">
          {spineLabel(group)}
        </span>
      </span>

      <div className="min-w-0 flex-1 px-4 pb-3 pt-3.5">
        <Link to={`/g/${group.joinCode}`} className="focus-ring flex min-h-11 items-start gap-3 rounded-inner">
          {/* min-w-0 lets the name clamp instead of pushing the amount off its column. */}
          <span className="min-w-0 flex-1">
            <span
              className={`min-w-0 font-sans text-section font-semibold leading-snug line-clamp-2 ${
                closed ? 'text-dim' : 'text-ink'
              }`}
            >
              {group.name}
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
            <Link
              to={`/g/${group.joinCode}?add=expense`}
              className="focus-ring flex min-h-11 items-center gap-2 rounded-full pr-2 font-sans text-label font-semibold text-ink transition-transform duration-100 active:scale-95"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-wash">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true" className="h-3 w-3 text-accent">
                  <path d="M10 4v12M4 10h12" strokeLinecap="round" />
                </svg>
              </span>
              Add expense
            </Link>
          )}
          <AvatarCluster names={group.members} total={group.memberCount} />
        </div>
      </div>
    </li>
  );
}

function totalFor(groups: MyGroup[], direction: MyGroup['netDirection']): number {
  return groups
    .filter((group) => group.netDirection === direction)
    .reduce((sum, group) => sum + Number(group.netAmount), 0);
}

// ponytail: mixed currencies fall back to USD until PRD deferred #3 (consolidated view).
function commonCurrency(groups: MyGroup[]): string {
  const distinct = new Set(groups.map((group) => group.currency));
  return distinct.size === 1 ? ([...distinct][0] ?? 'USD') : 'USD';
}

function BandHeader({ groups }: { groups?: MyGroup[] }) {
  const owed = groups ? totalFor(groups, 'owed') : null;
  const owe = groups ? totalFor(groups, 'owe') : null;
  const netPosition = (owed ?? 0) - (owe ?? 0);
  const bandCurrency = groups ? commonCurrency(groups) : 'USD';
  const settled = owed === 0 && owe === 0;

  return (
    <header className="relative -mx-4 -mt-2 overflow-hidden bg-band px-4 pb-3 pt-5 text-white sm:rounded-t-card sm:px-6">
      <CornerDecor />
      <h1 className="relative heading text-hero-balance font-bold tracking-[-0.035em] text-white">My groups</h1>

      {groups && settled && (
        <div className="relative mt-5 flex items-center gap-2.5 rounded-card bg-surface px-4 py-3.5 shadow-sheet">
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
        // text-accent/text-down fail contrast on this dark band — figures stay white here.
        <div className="relative mt-4">
          <div className="flex items-start gap-10">
            <div>
              <p className="font-sans text-label font-semibold uppercase tracking-[0.08em] text-band-dim">
                Net position
              </p>
              <p
                className={`mt-1 font-mono text-display font-semibold leading-none ${netPosition >= 0 ? 'text-mint' : 'text-down-bright'}`}
              >
                {netPosition >= 0 ? '+' : '−'}
                {formatCurrency(Math.abs(netPosition), bandCurrency)}
              </p>
            </div>
            {/* Always zero — this is the app's fixed goal, not a per-user target. */}
            <div className="ml-auto shrink-0 text-right">
              <p className="font-sans text-label font-semibold uppercase tracking-[0.08em] text-band-dim">Goal</p>
              <p className="mt-1 font-mono text-title font-semibold leading-none text-band-dim">
                {formatCurrency(0, bandCurrency)}
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 items-stretch border-t border-white/15 pt-2 font-sans text-body">
            <span className="flex items-center justify-center gap-2.5 border-r border-white/15">
              <span className="text-label text-band-dim">You&rsquo;re owed</span>
              <span className="font-mono font-semibold text-white">{formatCurrency(owed ?? 0, bandCurrency)}</span>
            </span>
            <span className="flex items-center justify-center gap-2.5">
              <span className="text-label text-band-dim">You owe</span>
              <span className="font-mono font-semibold text-white">{formatCurrency(owe ?? 0, bandCurrency)}</span>
            </span>
          </div>
        </div>
      )}
    </header>
  );
}

// API returns groups newest-activity-first; no re-sort here.
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
          <ul className="mt-4 flex flex-col gap-2.5 sm:px-2">
            {openGroups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </ul>
        )}

        {hasGroups && openGroups.length === 0 && (
          <p className="mt-4 font-sans text-label text-dim sm:px-2">
            Every group is closed. Start a new one below.
          </p>
        )}

        {/* Open by default only when it's the sole content — never an empty page one tap from its list. */}
        {closedGroups.length > 0 && (
          <details open={openGroups.length === 0} className="group mt-6 sm:px-2">
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
