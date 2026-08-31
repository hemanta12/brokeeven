import { Link } from 'react-router-dom';

import { SignInButton } from '../auth/SignInButton';
import { useMyGroups, useSession } from '../auth/api';
import { formatCurrency, formatDate } from '../../shared/format';
import { EmptyState, ErrorState, LoadingState } from '../../shared/RouteStates';

function BalanceLine({ direction, amount }: { direction: 'owe' | 'owed' | 'settled'; amount: string }) {
  if (direction === 'settled') {
    return <span className="font-sans text-label text-ink-forest/60">Settled up</span>;
  }
  return (
    <span className={`font-mono text-row-amount tabular-nums ${direction === 'owe' ? 'text-debt-red' : 'text-ink-forest'}`}>
      {direction === 'owe' ? 'You owe ' : 'You are owed '}
      {formatCurrency(Number(amount))}
    </span>
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
          <h1 className="font-display text-display font-semibold leading-[1.15] tracking-[-0.025em] text-ink-forest">
            My groups
          </h1>
          <p className="mt-2 font-sans text-body text-ink-forest/70">
            Sign in to see every group you are part of in one place, on any device. Groups you already opened in
            this browser come with you.
          </p>
        </div>
        <SignInButton />
        <p className="font-sans text-label text-ink-forest/60">
          You do not need an account to use BrokeEven —{' '}
          <Link to="/join" className="underline">
            join with a code
          </Link>{' '}
          instead.
        </p>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-5">
      <h1 className="font-display text-display font-semibold leading-[1.15] tracking-[-0.025em] text-ink-forest">
        My groups
      </h1>

      {isPending && <LoadingState />}
      {isError && <ErrorState message={error.message} onRetry={() => void refetch()} />}

      {data && data.groups.length === 0 && (
        <div className="flex flex-col gap-3">
          <EmptyState message="No groups yet. Groups show up here once you say who you are in one." />
          <p className="font-sans text-body text-ink-forest">
            <Link to="/create" className="underline">
              Create a group
            </Link>{' '}
            or{' '}
            <Link to="/join" className="underline">
              join with a code
            </Link>
            .
          </p>
        </div>
      )}

      {data && data.groups.length > 0 && (
        <ul className="flex flex-col divide-y divide-ink-forest/10">
          {data.groups.map((group) => (
            <li key={group.id}>
              <Link
                to={`/g/${group.joinCode}`}
                className="focus-ring flex items-baseline justify-between gap-4 rounded-lg py-3.5 transition-colors duration-100 hover:bg-ledger-paper"
              >
                <span className="min-w-0">
                  <span className="block truncate font-sans text-body font-medium text-ink-forest">{group.name}</span>
                  <span className="mt-0.5 block font-sans text-label text-ink-forest/60">
                    {group.memberCount} {group.memberCount === 1 ? 'person' : 'people'} · {group.expenseCount}{' '}
                    {group.expenseCount === 1 ? 'expense' : 'expenses'} · {formatDate(group.lastActivityAt)}
                  </span>
                </span>
                <BalanceLine direction={group.netDirection} amount={group.netAmount} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
