import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../test-utils';
import { ExpenseModal } from './ExpenseModal';

vi.mock('./api', () => ({
  useCreateExpense: () => ({ isError: false, isPending: false, mutateAsync: vi.fn() }),
  useUpdateExpense: () => ({ isError: false, isPending: false, mutateAsync: vi.fn() })
}));

describe('ExpenseModal', () => {
  it('opens existing titles in normalized casing and keeps paired controls together', () => {
    renderWithProviders(
      <ExpenseModal
        code="ABC123"
        people={[
          { id: 'p1', groupId: 'g1', name: 'A very long payer name', userId: null, removedAt: null, createdAt: '2026-01-01' }
        ]}
        identityPersonId="p1"
        currency="USD"
        expense={{
          id: 'e1', groupId: 'g1', title: 'DINNER', description: null, amount: '20.00', date: '2026-01-05',
          payerId: 'p1', splitMethod: 'equal',
          createdByUserId: null,
          splits: [{ id: 's1', expenseId: 'e1', personId: 'p1', amount: '20.00', percentAtEntry: null }]
        }}
        onClose={vi.fn()}
      />
    );

    const dialog = screen.getByRole('dialog', { name: 'Edit expense' });
    expect(within(dialog).getByLabelText('Title')).toHaveValue('Dinner');
    const pairedFields = within(dialog).getByLabelText('Paid by').parentElement?.parentElement;
    expect(pairedFields).toHaveClass('paid-by-date');
    expect(within(dialog).getByLabelText('Date')).toBeInTheDocument();
  });
});
