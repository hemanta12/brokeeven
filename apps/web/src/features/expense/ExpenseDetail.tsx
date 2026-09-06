import { useState } from 'react';

import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Overlay } from '../../shared/Overlay';
import { Amount } from '../../components/Amount';
import { ErrorState } from '../../shared/RouteStates';
import { formatDate, formatExpenseTitle } from '../../shared/format';
import { canEdit } from '../group/ownership';
import type { Expense, Person } from '../group/types';

interface ExpenseDetailProps {
  expense: Expense;
  people: Person[];
  identityPersonId: string | null;
  viewerUserId: string | null;
  currency: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deletePending?: boolean;
  deleteError?: string;
}

// Read-only receipt view opened from an expense row. Edit is a quiet header icon,
// not a primary button — editing is a deliberate second step.
export function ExpenseDetail({
  expense,
  people,
  identityPersonId,
  viewerUserId,
  currency,
  onClose,
  onEdit,
  onDelete,
  deletePending,
  deleteError
}: ExpenseDetailProps) {
  const payer = people.find((person) => person.id === expense.payerId);
  const editable = canEdit(expense.createdByUserId, viewerUserId);
  // Two-step inline confirm for delete, same pattern as EditPersonForm.
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <Overlay
      title={formatExpenseTitle(expense.title)}
      stackedHeader
      isDirty={false}
      onClose={onClose}
      headerAction={
        editable ? (
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit"
            className="focus-ring flex h-11 w-11 items-center justify-center rounded-full bg-[var(--field-bg,var(--color-surface))] text-ink transition-transform duration-100 hover:bg-ink/10 active:scale-90"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              aria-hidden="true"
              className="size-5"
            >
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : undefined
      }
    >
      <div className="flex flex-1 flex-col gap-5">
        <p className="-mt-2 text-center font-sans text-label text-dim">{formatDate(expense.date)}</p>

        {expense.description && (
          <p className="border-l-2 border-line-strong pl-3 font-sans text-body italic text-dim">
            {expense.description}
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0">
            <span className="block font-sans text-micro text-dim">Paid by</span>
            <span className="mt-1 flex items-center gap-2 font-sans text-body text-ink">
              {payer ? (
                <>
                  <Avatar name={payer.name} isYou={payer.id === identityPersonId} />
                  <span className="min-w-0 truncate">
                    {payer.id === identityPersonId ? `${payer.name} (you)` : payer.name}
                  </span>
                </>
              ) : (
                <span className="text-dim">someone removed</span>
              )}
            </span>
          </span>
          <Amount
            value={Number(expense.amount)}
            currency={currency}
            className="shrink-0 text-hero-balance font-semibold"
          />
        </div>

        <div className="rounded-card bg-surface p-4 shadow-card">
          <p className="font-sans text-micro text-dim">Split between</p>
          <ul className="mt-1.5 flex flex-col divide-y divide-line">
            {expense.splits.map((split) => {
              const person = people.find((p) => p.id === split.personId);
              return (
                <li key={split.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="flex min-w-0 items-center gap-2 font-sans text-body text-ink">
                    {person && <Avatar name={person.name} isYou={person.id === identityPersonId} />}
                    <span className="min-w-0 truncate">{person?.name ?? 'someone removed'}</span>
                  </span>
                  <Amount value={Number(split.amount)} currency={currency} className="shrink-0 text-row-amount" />
                </li>
              );
            })}
          </ul>
        </div>

        {/* Non-owners get no Edit/Delete — an action that only ever 403s is worse than none. */}
        {!editable && (
          <div className="modal-footer">
            <p className="w-full text-center font-sans text-label text-dim">
              Only the person who added this can edit it.
            </p>
          </div>
        )}

        {editable && (
          <div className="modal-footer">
            {confirmingDelete ? (
              <div className="flex w-full flex-col gap-2">
                <div className="flex w-full gap-3">
                  <Button
                    variant="tertiary"
                    className="flex-1"
                    onClick={() => setConfirmingDelete(false)}
                    disabled={deletePending}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" danger className="flex-1" onClick={onDelete} disabled={deletePending}>
                    {deletePending ? 'Deleting…' : 'Delete expense'}
                  </Button>
                </div>
                {deleteError && <ErrorState message={deleteError} />}
              </div>
            ) : (
              <Button variant="secondary" danger onClick={() => setConfirmingDelete(true)}>
                Delete expense
              </Button>
            )}
          </div>
        )}
      </div>
    </Overlay>
  );
}
