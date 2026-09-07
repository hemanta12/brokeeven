import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../test-utils';
import { GroupPage } from './GroupPage';
import { setIdentity } from '../../shared/identity';

// Group View joins a realtime room on mount; stub the socket so jsdom doesn't
// attempt a real connection.
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
  currency: 'USD',
  settleMode: 'direct',
  createdAt: '2026-01-01',
  people: [
    { id: 'p1', groupId: 'g1', name: 'Alice', userId: null, removedAt: null, createdAt: '2026-01-01' },
    { id: 'p2', groupId: 'g1', name: 'Bob', userId: null, removedAt: null, createdAt: '2026-01-01' }
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
      createdByUserId: null,
      splits: [
        { id: 's1', expenseId: 'e1', personId: 'p1', amount: '10.00', percentAtEntry: null },
        { id: 's2', expenseId: 'e1', personId: 'p2', amount: '10.00', percentAtEntry: null }
      ]
    }
  ],
  settlements: [],
  balances: [{ fromPersonId: 'p2', toPersonId: 'p1', amount: '10.00' }]
};

// A Response body reads once, so mockResolvedValue would break any test whose
// mutation triggers a refetch. mockImplementation builds a fresh Response per call.
function stubGroupFetch(body: unknown = baseGroup) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify(body), { status: 200 })))
  );
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
            people: [{ id: 'p1', groupId: 'g1', name: 'Alice', userId: null, removedAt: null, createdAt: '2026-01-01' }],
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

    // The close button triggers Overlay's exit transition first; the dialog
    // unmounts once that settles, not synchronously.
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Who are you?' })).not.toBeInTheDocument());
  });

  it('switches between the Expenses and Balances tabs', async () => {
    // Claim Alice's seat: "Bob owes Alice" then involves the viewer, so the
    // row carries a Settle action.
    setIdentity('ABC123', 'p1');
    stubGroupFetch();
    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });

    expect(await screen.findByText(/Dinner/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Balances' }));

    expect(screen.getByText('Bob owes you')).toBeInTheDocument();
    expect(screen.getByText('+$10.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settle' })).toBeInTheDocument();
  });

  it('shows a balance between two other people without a Settle action', async () => {
    // Claim Cara's seat; the only balance is Alice -> Bob, nothing to do with her.
    setIdentity('ABC123', 'p3');
    stubGroupFetch({
      ...baseGroup,
      people: [
        ...baseGroup.people,
        { id: 'p3', groupId: 'g1', name: 'Cara', userId: null, removedAt: null, createdAt: '2026-01-01' },
      ],
      balances: [{ fromPersonId: 'p1', toPersonId: 'p2', amount: '10.00' }],
    });
    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });

    fireEvent.click(await screen.findByRole('tab', { name: 'Balances' }));

    expect(screen.getByText('Alice owes Bob')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Settle' })).not.toBeInTheDocument();
  });

  it('groups expenses under a plain day heading, carrying no running total', async () => {
    stubGroupFetch();
    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });
    fireEvent.click(await screen.findByRole('button', { name: 'Just looking' }));

    // Match the day loosely: the heading drops the current year, so a full-label
    // assertion would rot in January.
    const dayHeading = screen.getByRole('heading', { level: 3, name: /Jan 5/ });
    expect(dayHeading).not.toHaveTextContent('$');
    expect(screen.getByText('Alice paid')).toBeInTheDocument();
  });

  it('shows a copy confirmation after sharing the invite link', async () => {
    stubGroupFetch();
    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });
    fireEvent.click(await screen.findByRole('button', { name: 'Just looking' }));

    fireEvent.click(screen.getByRole('button', { name: 'Group info' }));
    const dialog = screen.getByRole('dialog', { name: 'Group info' });
    expect(within(dialog).getByText('ABC123')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Copy link' }));

    expect(await screen.findByRole('button', { name: 'Copied!' })).toBeInTheDocument();
  });

  it('shows a long group title in full, not truncated, below the header controls', async () => {
    stubGroupFetch({ ...baseGroup, name: 'A very long weekend trip with friends' });
    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });
    fireEvent.click(await screen.findByRole('button', { name: 'Just looking' }));

    const title = screen.getByRole('heading', { name: 'A very long weekend trip with friends' });
    expect(title).not.toHaveClass('truncate');
    expect(screen.getByRole('button', { name: 'Group info' })).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole('button', { name: 'People (2)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit members' }));

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
    expect(screen.getByText('Remove Alice?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    expect(await screen.findByText(/Reassign this person's expenses/)).toBeInTheDocument();
  });

  it('keeps editing members and adding a person mutually exclusive', async () => {
    stubGroupFetch();
    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });
    fireEvent.click(await screen.findByRole('button', { name: 'Just looking' }));

    fireEvent.click(screen.getByRole('button', { name: 'People (2)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit members' }));
    // In edit mode the add trigger is removed entirely, not just disabled.
    expect(screen.queryByRole('button', { name: 'Add new member' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel editing members' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add new member' }));
    expect(screen.getByRole('button', { name: 'Edit members' })).toBeDisabled();
  });

  it('does not show a spurious required error after successfully adding a person', async () => {
    stubGroupFetch();
    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });
    fireEvent.click(await screen.findByRole('button', { name: 'Just looking' }));

    fireEvent.click(screen.getByRole('button', { name: 'People (2)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add new member' }));
    const nameInput = screen.getByLabelText('Name');
    fireEvent.change(nameInput, { target: { value: 'Charlie' } });
    // A real submit click blurs the input on its way to the button, marking
    // the field touched before the form ever clears it.
    fireEvent.blur(nameInput);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(nameInput).toHaveValue(''));
    expect(screen.queryByText('Name is required.')).not.toBeInTheDocument();
  });

  it('shows a "Saved" confirmation after successfully renaming a person', async () => {
    stubGroupFetch();
    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });
    fireEvent.click(await screen.findByRole('button', { name: 'Just looking' }));
    fireEvent.click(screen.getByRole('button', { name: 'People (2)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit members' }));

    const aliceInput = screen.getByLabelText('Edit Alice');
    fireEvent.change(aliceInput, { target: { value: 'Alicia' } });
    fireEvent.click(within(aliceInput.closest('form')!).getByRole('button', { name: 'Save name' }));

    expect(await screen.findByText('✓ Saved')).toBeInTheDocument();
  });

  it('asks for inline confirmation before removing a person, and Cancel backs out without removing', async () => {
    stubGroupFetch();
    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });
    fireEvent.click(await screen.findByRole('button', { name: 'Just looking' }));
    fireEvent.click(screen.getByRole('button', { name: 'People (2)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit members' }));

    fireEvent.click(screen.getByRole('button', { name: 'Remove Alice' }));
    expect(screen.getByText('Remove Alice?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Remove Alice?')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Edit Alice')).toBeInTheDocument();
  });

  it('toggles bulk member edit mode, editing every person at once, then cancels', async () => {
    stubGroupFetch();
    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });
    fireEvent.click(await screen.findByRole('button', { name: 'Just looking' }));

    fireEvent.click(screen.getByRole('button', { name: 'People (2)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit members' }));

    expect(screen.getByLabelText('Edit Alice')).toBeInTheDocument();
    expect(screen.getByLabelText('Edit Bob')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel editing members' }));

    expect(screen.queryByLabelText('Edit Alice')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit members' })).toBeInTheDocument();
  });
});
