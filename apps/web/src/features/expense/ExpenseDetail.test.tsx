import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExpenseDetail } from './ExpenseDetail';

const people = [
  { id: 'p1', groupId: 'g1', name: 'Alice', email: null, removedAt: null, createdAt: '2026-01-01' },
  { id: 'p2', groupId: 'g1', name: 'Bob', email: null, removedAt: null, createdAt: '2026-01-01' }
];

describe('ExpenseDetail', () => {
  it('centers the normalized title summary while showing payer and splits', () => {
    render(
      <ExpenseDetail
        expense={{
          id: 'e1', groupId: 'g1', title: 'DINNER', description: 'Shared meal', amount: '20.00', date: '2026-01-05',
          payerId: 'p1', splitMethod: 'equal',
          splits: [
            { id: 's1', expenseId: 'e1', personId: 'p1', amount: '10.00', percentAtEntry: null },
            { id: 's2', expenseId: 'e1', personId: 'p2', amount: '10.00', percentAtEntry: null }
          ]
        }}
        people={people}
        identityPersonId="p1"
        onClose={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Dinner' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dinner' }).parentElement).toHaveClass('overlay-header-centered');
    expect(screen.getByText('Mon, Jan 5, 2026')).toBeInTheDocument();
    expect(screen.getByText('Alice (you)')).toBeInTheDocument();
    expect(screen.getAllByText('$10.00')).toHaveLength(2);
  });
});
