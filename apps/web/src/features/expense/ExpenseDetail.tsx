import { Button } from '../../components/Button';
import { Overlay } from '../../shared/Overlay';
import { formatCurrency, formatDate, formatExpenseTitle } from '../../shared/format';
import { canEdit } from '../group/ownership';
import type { Expense, Person } from '../group/types';

interface ExpenseDetailProps {
  expense: Expense;
  people: Person[];
  identityPersonId: string | null;
  viewerUserId: string | null;
  onClose: () => void;
  onEdit: () => void;
}

// Read-only view opened by tapping an expense row — editing is a deliberate
// second step via the Edit button, not the default. Mirrors the Add/Edit
// Expense field order (title/description/date, then payer, then splits) so
// the two screens read as the same information, just view vs. edit.
export function ExpenseDetail({
  expense,
  people,
  identityPersonId,
  viewerUserId,
  onClose,
  onEdit
}: ExpenseDetailProps) {
  const payer = people.find((person) => person.id === expense.payerId);
  const editable = canEdit(expense.createdByUserId, viewerUserId);

  return (
    <Overlay title={formatExpenseTitle(expense.title)} centerTitle isDirty={false} onClose={onClose}>
      <div className="flex flex-col gap-6">
        <div className="expense-summary rounded-[10px] bg-ledger-paper px-4 py-5 text-center">
          <p className="font-mono text-hero-balance tabular-nums text-ink-forest">
            {formatCurrency(Number(expense.amount))}
          </p>
          <p className="mt-2 font-sans text-label text-ink-forest/70">{formatDate(expense.date)}</p>
        </div>
        {expense.description && <p className="font-sans text-body text-ink-forest/80">{expense.description}</p>}

        <div className="rounded-[10px] bg-paper-white px-3.5 py-3">
          <p className="font-sans text-label font-medium text-ink-forest">Paid by</p>
          <p className="mt-1 font-sans text-body text-ink-forest">
            {payer ? (payer.id === identityPersonId ? `${payer.name} (you)` : payer.name) : 'someone removed'}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="font-sans text-label font-medium text-ink-forest">Split between</p>
          <div className="flex flex-col divide-y divide-ink-forest/10 rounded-[10px] bg-ledger-paper px-3.5">
            {expense.splits.map((split) => {
              const person = people.find((p) => p.id === split.personId);
              return (
                <div key={split.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="font-sans text-body text-ink-forest">{person?.name ?? 'someone removed'}</span>
                  <span className="font-mono text-row-amount tabular-nums text-ink-forest">
                    {formatCurrency(Number(split.amount))}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {editable ? (
          <Button onClick={onEdit} className="h-[52px] w-full">
            Edit
          </Button>
        ) : (
          // No disabled button: an affordance that only ever 403s is worse
          // than none. Say why instead.
          <p className="text-center font-sans text-label text-ink-forest/60">
            Only the person who added this can edit it.
          </p>
        )}
      </div>
    </Overlay>
  );
}
