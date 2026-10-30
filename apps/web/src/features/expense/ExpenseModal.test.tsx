import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Expense, Person } from '../group/types';
import { renderWithProviders } from '../../test-utils';
import { ExpenseModal } from './ExpenseModal';

vi.mock('./api', () => ({
  useCreateExpense: () => ({ isError: false, isPending: false, mutateAsync: vi.fn() }),
  useUpdateExpense: () => ({ isError: false, isPending: false, mutateAsync: vi.fn() })
}));

function person(id: string, name: string): Person {
  return { id, groupId: 'g1', name, paymentHandle: null, userId: null, removedAt: null, createdAt: '2026-01-01' };
}

const people = [person('p1', 'Hemant'), person('p2', 'Priyanka'), person('p3', 'Bhupesh')];

function renderAdd(identityPersonId: string | null = 'p1') {
  renderWithProviders(
    <ExpenseModal code="ABC123" people={people} identityPersonId={identityPersonId} currency="USD" onClose={vi.fn()} />
  );
  return screen.getByRole('dialog', { name: 'Add expense' });
}

describe('ExpenseModal', () => {
  it('opens existing titles in normalized casing and keeps Amount and Date together', () => {
    const expense: Expense = {
      id: 'e1', groupId: 'g1', title: 'DINNER', description: null, amount: '20.00', date: '2026-01-05',
      payerId: 'p1', splitMethod: 'equal',
      createdByUserId: null,
      splits: [{ id: 's1', expenseId: 'e1', personId: 'p1', amount: '20.00', percentAtEntry: null }]
    };
    renderWithProviders(
      <ExpenseModal
        code="ABC123"
        people={[person('p1', 'A very long payer name')]}
        identityPersonId="p1"
        currency="USD"
        expense={expense}
        onClose={vi.fn()}
      />
    );

    const dialog = screen.getByRole('dialog', { name: 'Edit expense' });
    expect(within(dialog).getByLabelText('Title')).toHaveValue('Dinner');
    expect(within(dialog).getByLabelText('Amount')).toHaveValue('20.00');
    expect(within(dialog).getByLabelText('Date')).toHaveValue('2026-01-05');
  });

  it('defaults the payer to you and tags them in the split list', () => {
    const dialog = renderAdd();
    expect(within(dialog).getByLabelText('Paid by')).toHaveValue('p1');
    expect(within(dialog).getByText('paid')).toBeInTheDocument();
  });

  it('keeps the description reachable by name without a visible label', () => {
    const dialog = renderAdd();
    expect(within(dialog).getByLabelText('Description (optional)')).toHaveAttribute('placeholder', 'Description (optional)');
  });

  it('accepts only digits and one decimal point in Amount', () => {
    const dialog = renderAdd();
    const amount = within(dialog).getByLabelText('Amount');
    fireEvent.change(amount, { target: { value: '-12abc.345' } });
    expect(amount).toHaveValue('12.34');
  });

  it('refuses a pasted value that is not a plain number', () => {
    const dialog = renderAdd();
    const amount = within(dialog).getByLabelText('Amount');
    const paste = (text: string) =>
      fireEvent.paste(amount, { clipboardData: { getData: () => text } });
    expect(paste('1e5')).toBe(false);
    expect(paste('$1,234.50')).toBe(true);
  });

  it('flags a zero amount after blur and keeps what was typed', () => {
    const dialog = renderAdd();
    const amount = within(dialog).getByLabelText('Amount');
    fireEvent.change(amount, { target: { value: '0' } });
    fireEvent.blur(amount);
    expect(within(dialog).getByText('Enter an amount above 0.')).toBeInTheDocument();
    expect(amount).toHaveValue('0');
  });

  it('shows per-person amounts only once there is a total, and toggles everyone', () => {
    const dialog = renderAdd();
    expect(within(dialog).queryByText('$0.00')).not.toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText('Amount'), { target: { value: '30' } });
    expect(within(dialog).getAllByText('$10.00')).toHaveLength(3);
    expect(within(dialog).getByText(/3 of 3 people/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear all' }));
    expect(within(dialog).getByText(/0 of 3 people/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Save expense' })).toBeDisabled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Select all' }));
    expect(within(dialog).getByText(/3 of 3 people/)).toBeInTheDocument();
  });
});
