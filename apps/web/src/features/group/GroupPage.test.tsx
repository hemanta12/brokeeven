import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../test-utils';
import { GroupPage } from './GroupPage';

// Group View joins a realtime room on mount (useGroupRealtime) — none of
// these tests exercise live updates, so stub the socket to avoid a real
// network connection attempt from jsdom.
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    emit: vi.fn(),
    on: vi.fn(),
    disconnect: vi.fn(),
    io: { on: vi.fn() }
  }))
}));

const baseGroup = {
  id: 'g1',
  name: 'Trip',
  label: null,
  joinCode: 'ABC123',
  createdAt: '2026-01-01',
  people: [
    { id: 'p1', groupId: 'g1', name: 'Alice', email: null, removedAt: null, createdAt: '2026-01-01' },
    { id: 'p2', groupId: 'g1', name: 'Bob', email: null, removedAt: null, createdAt: '2026-01-01' }
  ],
  expenses: [
    {
      id: 'e1',
      groupId: 'g1',
      title: 'Dinner',
      description: null,
      amount: '20.00',
      date: '2026-01-05',
      payerId: 'p1',
      splitMethod: 'equal',
      splits: [
        { id: 's1', expenseId: 'e1', personId: 'p1', amount: '10.00', percentAtEntry: null },
        { id: 's2', expenseId: 'e1', personId: 'p2', amount: '10.00', percentAtEntry: null }
      ]
    }
  ],
  settlements: [],
  balances: [{ fromPersonId: 'p2', toPersonId: 'p1', amount: '10.00' }]
};

function stubGroupFetch(body: unknown = baseGroup) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 })));
}

describe('GroupPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('shows a loading state, then the group name and member list', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: 'g1',
            name: 'Trip',
            label: null,
            joinCode: 'ABC123',
            createdAt: '2026-01-01',
            people: [{ id: 'p1', groupId: 'g1', name: 'Alice', email: null, removedAt: null, createdAt: '2026-01-01' }],
            expenses: [],
            settlements: [],
            balances: []
          }),
          { status: 200 }
        )
      )
    );

    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Trip' })).toBeInTheDocument();
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
  });

  it('shows a not-found state for an unknown code', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Group not found' }), { status: 404 }))
    );

    renderWithProviders(<GroupPage />, { route: '/g/MISSING', path: '/g/:code' });

    expect(await screen.findByRole('heading', { name: 'Not found' })).toBeInTheDocument();
  });

  it('prompts for identity on first visit, then dismisses via Just looking', async () => {
    stubGroupFetch();
    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });

    expect(await screen.findByRole('dialog', { name: 'Who are you?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Just looking' }));

    expect(screen.queryByRole('dialog', { name: 'Who are you?' })).not.toBeInTheDocument();
  });

  it('switches between the Expenses and Balances tabs', async () => {
    stubGroupFetch();
    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });
    // dismiss the identity prompt so it doesn't shadow queries
    fireEvent.click(await screen.findByRole('button', { name: 'Just looking' }));

    expect(screen.getByText(/Dinner/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Balances' }));

    expect(screen.getByText('Bob owes Alice')).toBeInTheDocument();
    expect(screen.getByText('$10.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settle' })).toBeInTheDocument();
  });

  it('opens the Add Expense overlay', async () => {
    stubGroupFetch();
    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });
    fireEvent.click(await screen.findByRole('button', { name: 'Just looking' }));

    fireEvent.click(screen.getByRole('button', { name: 'Add Expense' }));

    const dialog = screen.getByRole('dialog', { name: 'Add expense' });
    expect(within(dialog).getByLabelText('Title')).toBeInTheDocument();
  });

  it('blocks removing a person who is a payer, showing the server message', async () => {
    stubGroupFetch();
    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });
    fireEvent.click(await screen.findByRole('button', { name: 'Just looking' }));

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ error: "Reassign this person's expenses to someone else before removing them" }),
          { status: 409 }
        )
      )
    );

    fireEvent.click(screen.getByRole('button', { name: 'Remove Alice' }));

    expect(await screen.findByText(/Reassign this person's expenses/)).toBeInTheDocument();
  });
});
