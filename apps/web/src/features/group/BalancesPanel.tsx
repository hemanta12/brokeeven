import { BalanceRow } from '../../components/BalanceRow';
import { EmptyState } from '../../shared/RouteStates';
import { useUpdateSettleMode } from './api';
import { SettleModeChoice } from './SettleModeChoice';
import { minimizeTransactions } from './settleUp';
import type { Balance, Person, SettleMode } from './types';

function balanceKey(balance: Pick<Balance, 'fromPersonId' | 'toPersonId'>): string {
  return `${balance.fromPersonId}:${balance.toPersonId}`;
}

interface BalancesPanelProps {
  code: string;
  balances: Balance[];
  people: Person[];
  currency: string;
  settleMode: SettleMode;
  identityPersonId: string | null;
  closed: boolean;
  pulsingIds: Set<string>;
  // Takes the row the viewer tapped plus the list it belongs to, so Settle Up
  // measures "already owed" against the same surface the row came from.
  onSettle: (balance: Balance, reference: Balance[]) => void;
}

export function BalancesPanel({
  code,
  balances,
  people,
  currency,
  settleMode,
  identityPersonId,
  closed,
  pulsingIds,
  onSettle
}: BalancesPanelProps) {
  const updateSettleMode = useUpdateSettleMode(code);

  const nameOf = (id: string) => people.find((person) => person.id === id)?.name ?? 'Someone';

  const plan: Balance[] = minimizeTransactions(balances).map((transfer) => ({
    fromPersonId: transfer.fromPersonId,
    toPersonId: transfer.toPersonId,
    amount: (transfer.amountCents / 100).toFixed(2)
  }));

  // Self-suppressing: never offer a second way that saves nobody a payment.
  const offersFewest = plan.length > 0 && plan.length < balances.length;

  // Optimistic: the in-flight value wins so the selection moves on tap, and a
  // failure snaps it back.
  const pending = updateSettleMode.isPending ? updateSettleMode.variables : undefined;
  const mode: SettleMode = offersFewest ? (pending ?? settleMode) : 'direct';
  const rows = mode === 'simplified' ? plan : balances;

  function direction(balance: Balance): 'owe' | 'owed' | 'neutral' {
    if (balance.fromPersonId === identityPersonId) return 'owe';
    if (balance.toPersonId === identityPersonId) return 'owed';
    return 'neutral';
  }

  // The viewer's own rows lead; everyone else's stay as read-only context.
  const yours = rows.filter((row) => direction(row) !== 'neutral');
  const others = rows.filter((row) => direction(row) === 'neutral');
  const showHeadings = yours.length > 0 && others.length > 0;

  function renderRows(list: Balance[]) {
    return (
      <ul className="flex flex-col gap-2">
        {list.map((row) => {
          const key = balanceKey(row);
          return (
            <li key={key} className={`entry-card ${pulsingIds.has(key) ? 'row-pulse' : ''}`}>
              <BalanceRow
                fromName={nameOf(row.fromPersonId)}
                toName={nameOf(row.toPersonId)}
                amount={Number(row.amount)}
                currency={currency}
                direction={direction(row)}
                fromIsViewer={row.fromPersonId === identityPersonId}
                toIsViewer={row.toPersonId === identityPersonId}
                verb={mode === 'simplified' ? 'pays' : 'owes'}
                onSettle={closed || direction(row) === 'neutral' ? undefined : () => onSettle(row, rows)}
              />
            </li>
          );
        })}
      </ul>
    );
  }

  if (balances.length === 0) {
    /* Settled group: no balances, but a settlement may still need undoing. */
    return <EmptyState message="No balances yet. Add an expense to get started." />;
  }

  return (
    <div>
      {offersFewest && !closed && (
        <SettleModeChoice
          mode={mode}
          directCount={balances.length}
          fewestCount={plan.length}
          pending={updateSettleMode.isPending}
          error={updateSettleMode.isError ? updateSettleMode.error.message : undefined}
          onChange={(next) => updateSettleMode.mutate(next)}
        />
      )}

      <div>
        {showHeadings ? (
          <>
            <h3 className="mb-1.5 font-sans text-label font-medium text-ink">Yours to settle</h3>
            {renderRows(yours)}
            <h3 className="mb-1.5 mt-5 font-sans text-label font-medium text-dim">Everyone else</h3>
            {renderRows(others)}
          </>
        ) : (
          renderRows(rows)
        )}
      </div>
    </div>
  );
}
