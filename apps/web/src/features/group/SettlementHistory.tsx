import { Amount } from '../../components/Amount';
import { capitalizeFirst, formatDateGroupLabel } from '../../shared/format';
import { useDeleteSettlement } from '../settlement/api';
import type { Person, Settlement } from './types';

interface SettlementHistoryProps {
  code: string;
  settlements: Settlement[];
  people: Person[];
  identityPersonId: string | null;
  currency: string;
  // Closed group: show the history, drop the Undo control. Otherwise Undo is for
  // the two people the payment is between.
  readOnly?: boolean;
}

export function SettlementHistory({
  code,
  settlements,
  people,
  identityPersonId,
  currency,
  readOnly = false
}: SettlementHistoryProps) {
  const deleteSettlement = useDeleteSettlement(code);

  if (settlements.length === 0) return null;

  const nameFor = (personId: string) => people.find((person) => person.id === personId)?.name ?? 'someone';

  // Newest first: a mistake is almost always the one just recorded.
  const ordered = [...settlements].sort(
    (a, b) => new Date(b.settledAt).getTime() - new Date(a.settledAt).getTime()
  );

  return (
    <section aria-label="Settled payments" className="mt-6">
      <h3 className="mb-1.5 font-sans text-label font-medium text-dim">Settled</h3>
      {/* One grouped list, not a card per payment: this is history, so it sits back
          from the live "Yours to settle" rows above it. */}
      <ul className="divide-y divide-line rounded-inner border border-line bg-surface px-3.5">
        {ordered.map((settlement) => {
          const from = settlement.fromPersonId === identityPersonId ? 'You' : nameFor(settlement.fromPersonId);
          const to = settlement.toPersonId === identityPersonId ? 'you' : nameFor(settlement.toPersonId);
          const isUndoing = deleteSettlement.isPending && deleteSettlement.variables === settlement.id;
          const iPaid = identityPersonId !== null && settlement.fromPersonId === identityPersonId;
          const iReceived = identityPersonId !== null && settlement.toPersonId === identityPersonId;
          const mine = iPaid || iReceived;
          // Only the two people the payment is between may take it back.
          const canUndo = !readOnly && mine;
          return (
            <li key={settlement.id} className="flex min-h-14 items-center justify-between gap-3 py-2">
              <span className="min-w-0 flex-1">
                <span className={`block truncate font-sans text-label ${mine ? 'font-semibold text-ink' : 'font-medium text-dim'}`}>
                  {from} paid {to}
                </span>
                {/* Undo sits in the caption line, not beside the amount, so every
                    amount stays on the same right edge. */}
                <span className="flex items-center gap-1.5 font-sans text-micro text-dim">
                  <span className="truncate">
                    {formatDateGroupLabel(settlement.settledAt)} · {capitalizeFirst(settlement.note)}
                  </span>
                  {canUndo && (
                    <button
                      type="button"
                      onClick={() => deleteSettlement.mutate(settlement.id)}
                      disabled={isUndoing}
                      className="focus-ring relative shrink-0 rounded px-1 font-sans text-micro font-semibold text-accent underline underline-offset-2 before:absolute before:-inset-x-1 before:-inset-y-3 before:content-[''] hover:text-accent-hover disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {isUndoing ? 'Undoing…' : 'Undo'}
                    </button>
                  )}
                </span>
              </span>
              {/* Yours carry a sign and direction colour, like the balance rows above;
                  everyone else's stay plain and muted. */}
              <Amount
                value={Number(settlement.amount)}
                currency={currency}
                direction={iPaid ? 'down' : iReceived ? 'up' : 'flat'}
                signed={mine}
                className={`shrink-0 text-row-amount ${mine ? 'font-semibold' : 'font-medium'}`}
              />
            </li>
          );
        })}
      </ul>
      {deleteSettlement.isError && (
        <p role="alert" className="mt-2 font-sans text-label text-down">
          {deleteSettlement.error.message}
        </p>
      )}
    </section>
  );
}
