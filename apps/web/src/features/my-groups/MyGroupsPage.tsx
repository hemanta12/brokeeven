import { Link } from 'react-router-dom';

import { buttonClass } from '../../components/Button';
import { SignInPrompt } from '../auth/SignInPrompt';
import { useMyGroups, useSession, type MyGroup } from '../auth/api';
import { Amount } from '../../components/Amount';
import { AvatarCluster } from '../../components/Avatar';
import { CornerDecor } from '../../components/CornerDecor';
import { capitalizeFirst, formatUpdatedLabel } from '../../shared/format';
import { EmptyState, ErrorState, LoadingState } from '../../shared/RouteStates';

// Plain coloured text, not a pill: a pill shape reads as a tappable button,
// especially sitting inside a row that already is a link. The caption above
// the figure is what carries the direction now, so colour is never the only
// cue and the sign is no longer doing that job alone.
function BalanceAmount({ direction, amount }: { direction: MyGroup['netDirection']; amount: string }) {
  // The only place in the app, besides the settled receipt, where the product
  // name appears as a status.
  if (direction === 'settled') {
    return <span className="font-sans text-row-amount font-semibold text-dim">Even.</span>;
  }
  return (
    <Amount
      value={Number(amount)}
      direction={direction === 'owed' ? 'up' : 'down'}
      label={direction === 'owed' ? 'you’re owed' : 'you owe'}
      className="text-row-amount font-semibold"
    />
  );
}

function totalFor(groups: MyGroup[], direction: MyGroup['netDirection']): number {
  return groups
    .filter((group) => group.netDirection === direction)
    .reduce((sum, group) => sum + Number(group.netAmount), 0);
}

// The screen's dark device, the same --color-band the landing proof band and
// the group header use, so all three read as one product. Unlike the group
// page nothing straddles its lower edge: the two running totals sit on a pair
// of white cards fully inside the band, side by side, and the list starts
// clean below. Amounts use the documented accent / down tokens ("You're owed"
// / "You owe"), which are contrast-verified on white.
function BandHeader({ groups }: { groups?: MyGroup[] }) {
  const owed = groups ? totalFor(groups, 'owed') : null;
  const owe = groups ? totalFor(groups, 'owe') : null;
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

      {/* A pair of white cards, side by side, fully inside the band. White is
          the app's card surface and pops hard on the forest; the amounts take
          the documented accent / down tokens. */}
      {groups && !settled && (
        <dl className="relative mt-7 grid grid-cols-2 gap-2.5">
          <div className="rounded-card bg-surface px-4 py-3 shadow-sheet">
            <dt className="font-sans text-micro text-dim">You&rsquo;re owed</dt>
            <dd className="mt-1">
              <Amount value={owed ?? 0} direction="up" className="block truncate text-title font-semibold" />
            </dd>
          </div>
          <div className="rounded-card bg-surface px-4 py-3 shadow-sheet">
            <dt className="font-sans text-micro text-dim">You owe</dt>
            <dd className="mt-1">
              <Amount value={owe ?? 0} direction="down" className="block truncate text-title font-semibold" />
            </dd>
          </div>
        </dl>
      )}
    </header>
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

        {hasGroups && (
          <ul className="mt-4 flex flex-col gap-2.5 px-4 sm:px-6">
            {groups.map((group) => (
              /* nikita's group card (sketch 013): name, direction and amount on
                 the top row; a full-bleed hairline over a footer that carries
                 the next step and the member cluster + count. Two sibling links
                 rather than a button nested inside a link, so both targets stay
                 real anchors. */
              <li
                key={group.id}
                className="rounded-card border border-line bg-surface px-4 pb-3 pt-3.5 shadow-card transition-shadow duration-150 hover:shadow-card-hover"
              >
                <Link
                  to={`/g/${group.joinCode}`}
                  className="focus-ring flex min-h-11 items-start gap-3 rounded-inner"
                >
                  {/* min-w-0 is what lets the name clamp instead of shoving the
                      amount off its own column. Members live in the footer next
                      to the count, so the name gets the full row width here. */}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start gap-2">
                      <span className="min-w-0 font-sans text-body font-semibold leading-snug text-ink line-clamp-2">
                        {group.name}
                      </span>
                      {/* "Individual" is auto-set on every quick 1:1 group and says
                          nothing the name and people count don't already. */}
                      {group.label && group.label !== 'Individual' && (
                        <span className="mt-0.5 shrink-0 rounded-full border border-accent px-2 py-0.5 font-sans text-micro leading-none text-accent">
                          {capitalizeFirst(group.label)}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate font-sans text-micro text-dim">
                      Updated {formatUpdatedLabel(group.lastActivityAt)}
                    </span>
                  </span>
                  <span className="shrink-0">
                    <BalanceAmount direction={group.netDirection} amount={group.netAmount} />
                  </span>
                </Link>
                <div className="-mx-4 mt-3 flex items-center justify-between gap-3 border-t border-line px-4 pt-3">
                  {/* The one behaviour change in the redesign: the most common
                      next step no longer costs a navigation through the group
                      page. GroupPage reads ?add=expense and opens the modal. */}
                  {/* Ink, not accent: an accent-green link sitting next to an
                      accent-green balance figure made colour ambiguous between
                      "money" and "tap me". The + icon keeps the accent cue. */}
                  <Link
                    to={`/g/${group.joinCode}?add=expense`}
                    className="focus-ring flex min-h-11 items-center gap-1.5 rounded-full pr-2 font-sans text-label font-semibold text-ink"
                  >
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true" className="h-3.5 w-3.5 text-accent">
                      <path d="M10 4v12M4 10h12" strokeLinecap="round" />
                    </svg>
                    Add expense
                  </Link>
                  <span className="flex shrink-0 items-center gap-2">
                    <AvatarCluster names={group.members} total={group.memberCount} />
                    <span className="font-sans text-micro text-dim">
                      {group.memberCount} {group.memberCount === 1 ? 'person' : 'people'}
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
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
