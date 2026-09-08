import { useState } from 'react';

import { Avatar } from '../../components/Avatar';
import { Overlay } from '../../shared/Overlay';
import { Amount } from '../../components/Amount';
import { formatDate, formatExpenseTitle } from '../../shared/format';
import { canEdit } from '../group/ownership';
import type { Expense, Person } from '../group/types';

interface ExpenseDetailProps {
  expense: Expense;
  people: Person[];
  identityPersonId: string | null;
  viewerUserId: string | null;
  currency: string;
  // Closed group: hide Edit/Delete regardless of ownership.
  readOnly?: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deletePending?: boolean;
  deleteError?: string;
}

function TrashGlyph() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="h-4 w-4">
      <path
        d="M4.5 6h11M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6M6 6l.6 8.6A1.5 1.5 0 0 0 8.1 16h3.8a1.5 1.5 0 0 0 1.5-1.4L14 6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ExpenseDetail({
  expense,
  people,
  identityPersonId,
  viewerUserId,
  currency,
  readOnly = false,
  onClose,
  onEdit,
  onDelete,
  deletePending,
  deleteError
}: ExpenseDetailProps) {
  const payer = people.find((person) => person.id === expense.payerId);
  const editable = !readOnly && canEdit(expense.createdByUserId, viewerUserId);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <Overlay
      title={formatExpenseTitle(expense.title)}
      stackedHeader
      isDirty={false}
      onClose={onClose}
      blockingConfirm={
        confirmingDelete
          ? {
              message: 'Delete this expense?',
              confirmLabel: deletePending ? 'Deleting…' : 'Delete',
              cancelLabel: 'Cancel',
              danger: true,
              pending: deletePending,
              error: deleteError,
              onConfirm: onDelete,
              onCancel: () => setConfirmingDelete(false)
            }
          : null
      }
      headerAction={
        editable ? (
          <div className="flex items-center gap-1.5">
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
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              aria-label="Delete"
              className="focus-ring flex h-11 w-11 items-center justify-center rounded-full bg-down/10 text-down transition-transform duration-100 hover:bg-down/20 active:scale-90"
            >
              <TrashGlyph />
            </button>
          </div>
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

        {/* Hidden, not disabled: the server 403s this for non-owners anyway. */}
        {!editable && (
          <div className="modal-footer">
            <p className="w-full text-center font-sans text-label text-dim">
              {readOnly ? 'This group is closed.' : 'Only the person who added this can edit it.'}
            </p>
          </div>
        )}
      </div>
    </Overlay>
  );
}
