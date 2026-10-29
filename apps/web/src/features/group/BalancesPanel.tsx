import { BalanceRow } from '../../components/BalanceRow';
import { EmptyState } from '../../shared/RouteStates';
import { SETTLE_MODE_LABEL, effectiveSettleMode, minimizeTransactions } from './settleUp';
import type { Balance, Person, SettleMode } from './types';

function balanceKey(balance: Pick<Balance, 'fromPersonId' | 'toPersonId'>): string {
  return `${balance.fromPersonId}:${balance.toPersonId}`;
}

interface BalancesPanelProps {
  balances: Balance[];
  people: Person[];
  currency: string;
  settleMode: SettleMode;
  identityPersonId: string | null;
  closed: boolean;
  pulsingIds: Set<string>;
  onChangeSettleMode: () => void;
  // Takes the row the viewer tapped plus the list it belongs to, so Settle Up
  // measures "already owed" against the same surface the row came from.
  onSettle: (balance: Balance, reference: Balance[]) => void;
}

export function BalancesPanel({
  balances,
  people,
  currency,
  settleMode,
  identityPersonId,
  closed,
  pulsingIds,
  onChangeSettleMode,
  onSettle
}: BalancesPanelProps) {
  const nameOf = (id: string) => people.find((person) => person.id === id)?.name ?? 'Someone';

  const plan: Balance[] = minimizeTransactions(balances).map((transfer) => ({
    fromPersonId: transfer.fromPersonId,
    toPersonId: transfer.toPersonId,
    amount: (transfer.amountCents / 100).toFixed(2)
  }));

  const mode = effectiveSettleMode(balances, settleMode);
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
      {/* Read-only: changing it affects everyone, so the control lives in Settings. */}
      <div className="mb-3 flex items-center justify-between gap-2.5 rounded-inner bg-sunken py-0.5 pl-3 pr-1 font-sans text-label text-dim">
        <span>
          Paying back: <b className="font-semibold text-ink">{SETTLE_MODE_LABEL[mode]}</b>
        </span>
        {!closed && (
          <button
            type="button"
            onClick={onChangeSettleMode}
            aria-label="Change in Settings"
            className="focus-ring min-h-11 rounded-full px-3 font-sans text-label font-semibold text-accent transition-colors duration-150 hover:bg-accent-wash active:bg-accent-wash"
          >
            Change
          </button>
        )}
      </div>

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
