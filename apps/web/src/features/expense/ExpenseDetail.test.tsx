import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExpenseDetail } from './ExpenseDetail';
import type { Expense } from '../group/types';

const people = [
  { id: 'p1', groupId: 'g1', name: 'Alice', paymentHandle: null, userId: null, removedAt: null, createdAt: '2026-01-01' },
  { id: 'p2', groupId: 'g1', name: 'Bob', paymentHandle: null, userId: null, removedAt: null, createdAt: '2026-01-01' }
];

const expense: Expense = {
  id: 'e1', groupId: 'g1', title: 'Dinner', description: null, amount: '20.00', date: '2026-01-05',
  payerId: 'p1', splitMethod: 'equal',
  createdByUserId: null,
  splits: [{ id: 's1', expenseId: 'e1', personId: 'p1', amount: '20.00', percentAtEntry: null }]
};

describe('ExpenseDetail', () => {
  it('drops the normalized title to its own row while showing payer and splits', () => {
    render(
      <ExpenseDetail
        expense={{
          id: 'e1', groupId: 'g1', title: 'DINNER', description: 'Shared meal', amount: '20.00', date: '2026-01-05',
          payerId: 'p1', splitMethod: 'equal',
          createdByUserId: null,
          splits: [
            { id: 's1', expenseId: 'e1', personId: 'p1', amount: '10.00', percentAtEntry: null },
            { id: 's2', expenseId: 'e1', personId: 'p2', amount: '10.00', percentAtEntry: null }
          ]
        }}
        people={people}
        identityPersonId="p1"
        viewerUserId={null}
        currency="USD"
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Dinner' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dinner' }).parentElement).toHaveClass('overlay-header-stacked');
    expect(screen.getByText('Mon, Jan 5, 2026')).toBeInTheDocument();
    expect(screen.getByText('Alice (you)')).toBeInTheDocument();
    expect(screen.getAllByText('$10.00')).toHaveLength(2);
  });

  it("offers no Edit button on an expense someone else created", () => {
    render(
      <ExpenseDetail
        expense={{
          id: 'e1', groupId: 'g1', title: 'Dinner', description: null, amount: '20.00', date: '2026-01-05',
          payerId: 'p1', splitMethod: 'equal',
          createdByUserId: 'someone-else',
          splits: [{ id: 's1', expenseId: 'e1', personId: 'p1', amount: '20.00', percentAtEntry: null }]
        }}
        people={people}
        identityPersonId="p1"
        viewerUserId="me"
        currency="USD"
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.getByText('Only the person who added this can edit it.')).toBeInTheDocument();
  });

  it('asks for confirmation before deleting, and cancel backs out without calling onDelete', () => {
    const onDelete = vi.fn();
    render(
      <ExpenseDetail
        expense={expense}
        people={people}
        identityPersonId="p1"
        viewerUserId={null}
        currency="USD"
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('calls onDelete once the deletion is confirmed', () => {
    const onDelete = vi.fn();
    render(
      <ExpenseDetail
        expense={expense}
        people={people}
        identityPersonId="p1"
        viewerUserId={null}
        currency="USD"
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('disables the confirm row and shows an error while a delete is pending or fails', () => {
    render(
      <ExpenseDetail
        expense={expense}
        people={people}
        identityPersonId="p1"
        viewerUserId={null}
        currency="USD"
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        deletePending
        deleteError="Something broke. Try again."
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Deleting…' })).toBeDisabled();
    expect(screen.getByText('Something broke. Try again.')).toBeInTheDocument();
  });
});
