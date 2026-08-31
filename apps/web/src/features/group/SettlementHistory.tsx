import { Button } from '../../components/Button';
import { formatCurrency, formatDateGroupLabel } from '../../shared/format';
import { useDeleteSettlement } from '../settlement/api';
import type { Person, Settlement } from './types';

interface SettlementHistoryProps {
  code: string;
  settlements: Settlement[];
  people: Person[];
  identityPersonId: string | null;
}

// Recording a settlement was, until now, the only irreversible write in the
// app — expenses and people can both be edited and deleted. These rows were
// already being sent with every group fetch and rendered nowhere.
export function SettlementHistory({ code, settlements, people, identityPersonId }: SettlementHistoryProps) {
  const deleteSettlement = useDeleteSettlement(code);

  if (settlements.length === 0) return null;

  const nameFor = (personId: string) => people.find((person) => person.id === personId)?.name ?? 'someone';

  // Newest first: a mistake is almost always the one just recorded.
  const ordered = [...settlements].sort(
    (a, b) => new Date(b.settledAt).getTime() - new Date(a.settledAt).getTime()
  );

  return (
    <section aria-label="Settled payments" className="mt-6">
      <h3 className="mb-2 font-sans text-label font-medium text-ink-forest/70">Settled</h3>
      <ul className="flex flex-col gap-2">
        {ordered.map((settlement) => {
          const from = settlement.fromPersonId === identityPersonId ? 'You' : nameFor(settlement.fromPersonId);
          const to = settlement.toPersonId === identityPersonId ? 'you' : nameFor(settlement.toPersonId);
          const isUndoing = deleteSettlement.isPending && deleteSettlement.variables === settlement.id;
          return (
            <li key={settlement.id} className="entry-card px-4 py-3">
              <div className="flex min-h-11 items-center justify-between gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-sans text-body text-ink-forest">
                    {from} paid {to}{' '}
                    <span className="font-sans font-medium tabular-nums">
                      {formatCurrency(Number(settlement.amount))}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate font-sans text-label text-ink-forest/70">
                    {formatDateGroupLabel(settlement.settledAt)} · {settlement.note}
                  </span>
                </span>
                <Button
                  variant="secondary"
                  onClick={() => deleteSettlement.mutate(settlement.id)}
                  disabled={isUndoing}
                  className="shrink-0 px-3.5! text-[0.8125rem]!"
                >
                  {isUndoing ? 'Undoing…' : 'Undo'}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      {deleteSettlement.isError && (
        <p role="alert" className="mt-2 font-sans text-label text-debt-red">
          {deleteSettlement.error.message}
        </p>
      )}
    </section>
  );
}
