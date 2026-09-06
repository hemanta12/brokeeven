import { Button } from '../../components/Button';
import { Amount } from '../../components/Amount';
import { formatDateGroupLabel } from '../../shared/format';
import { useDeleteSettlement } from '../settlement/api';
import type { Person, Settlement } from './types';

interface SettlementHistoryProps {
  code: string;
  settlements: Settlement[];
  people: Person[];
  identityPersonId: string | null;
}

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
      <h3 className="mb-2 font-sans text-label font-medium text-dim">Settled</h3>
      <ul className="flex flex-col gap-2">
        {ordered.map((settlement) => {
          const from = settlement.fromPersonId === identityPersonId ? 'You' : nameFor(settlement.fromPersonId);
          const to = settlement.toPersonId === identityPersonId ? 'you' : nameFor(settlement.toPersonId);
          const isUndoing = deleteSettlement.isPending && deleteSettlement.variables === settlement.id;
          return (
            <li key={settlement.id} className="entry-card px-4 py-3">
              <div className="flex min-h-11 items-center justify-between gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-sans text-body text-ink">
                    {from} paid {to}{' '}
                    <Amount value={Number(settlement.amount)} className="font-medium" />
                  </span>
                  <span className="mt-0.5 block truncate font-sans text-label text-dim">
                    {formatDateGroupLabel(settlement.settledAt)} · {settlement.note}
                  </span>
                </span>
                <Button
                  variant="secondary"
                  onClick={() => deleteSettlement.mutate(settlement.id)}
                  disabled={isUndoing}
                  size="sm"
                  className="shrink-0"
                >
                  {isUndoing ? 'Undoing…' : 'Undo'}
                </Button>
              </div>
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
