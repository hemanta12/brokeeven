import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

// The cents are their own span, so match the whole paragraph rather than one text node.
const netFigure = (text: string) =>
  screen.getByText((_, element) => element?.tagName === 'P' && element.textContent === text);

const baseGroup = {
  id: 'g1',
  name: 'Trip',
  label: null,
  joinCode: 'ABC123',
  currency: 'USD',
  settleMode: 'direct',
  createdAt: '2026-01-01',
  people: [
    { id: 'p1', groupId: 'g1', name: 'Alice', paymentHandle: null, userId: null, removedAt: null, createdAt: '2026-01-01' },
    { id: 'p2', groupId: 'g1', name: 'Bob', paymentHandle: null, userId: null, removedAt: null, createdAt: '2026-01-01' }
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
  // The page opens on the current month; pin "today" to the fixtures' month.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 0, 15, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
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
            people: [{ id: 'p1', groupId: 'g1', name: 'Alice', paymentHandle: null, userId: null, removedAt: null, createdAt: '2026-01-01' }],
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

    fireEvent.click(screen.getByRole('tab', { name: /^Balances/ }));

    expect(screen.getByText('Bob owes you')).toBeInTheDocument();
    expect(screen.getByText('+$10.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark received' })).toBeInTheDocument();
  });

  it('shows a balance between two other people without a Settle action', async () => {
    // Claim Cara's seat; the only balance is Alice -> Bob, nothing to do with her.
    setIdentity('ABC123', 'p3');
    stubGroupFetch({
      ...baseGroup,
      people: [
        ...baseGroup.people,
        { id: 'p3', groupId: 'g1', name: 'Cara', paymentHandle: null, userId: null, removedAt: null, createdAt: '2026-01-01' },
      ],
      balances: [{ fromPersonId: 'p1', toPersonId: 'p2', amount: '10.00' }],
    });
    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });

    fireEvent.click(await screen.findByRole('tab', { name: /^Balances/ }));

    expect(screen.getByText('Alice owes Bob')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^(Pay|Mark received)$/ })).not.toBeInTheDocument();
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
    setIdentity('ABC123', 'p1');
    stubGroupFetch();
    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });
    await screen.findByRole('tab', { name: 'Expenses' });

    fireEvent.click(screen.getByRole('button', { name: 'Group settings' }));
    const dialog = screen.getByRole('dialog', { name: 'Group settings' });
    expect(within(dialog).getByText('ABC123')).toBeInTheDocument();
    const inviteRow = within(dialog).getByText('Invite link').parentElement?.parentElement as HTMLElement;
    fireEvent.click(within(inviteRow).getByRole('button', { name: 'Copy' }));

    expect(await screen.findByRole('button', { name: 'Copied!' })).toBeInTheDocument();
  });

  describe('expense date filter', () => {
    // Today is pinned to Jan 2026; the extra expense is in December 2025.
    const withDecember = () => ({
      ...baseGroup,
      expenses: [
        ...baseGroup.expenses,
        { ...baseGroup.expenses[0], id: 'e2', title: 'Holiday dinner', date: '2025-12-20' },
      ],
    });

    it('opens on this month and counts only that month', async () => {
      setIdentity('ABC123', 'p1');
      stubGroupFetch(withDecember());
      renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });

      expect(await screen.findByText('Dinner')).toBeInTheDocument();
      expect(screen.queryByText('Holiday dinner')).not.toBeInTheDocument();
      expect(screen.getByText('1 expense in Jan 2026')).toBeInTheDocument();
      expect(screen.queryByText(/all time/i)).not.toBeInTheDocument();
    });

    it('steps to the previous month with the arrow', async () => {
      setIdentity('ABC123', 'p1');
      stubGroupFetch(withDecember());
      renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });
      await screen.findByText('Dinner');

      fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
      expect(screen.getByText('Holiday dinner')).toBeInTheDocument();
      expect(screen.queryByText('Dinner')).not.toBeInTheDocument();
    });

    it('shows No expenses in the month, with a way to show all time', async () => {
      setIdentity('ABC123', 'p1');
      stubGroupFetch({
        ...baseGroup,
        expenses: [{ ...baseGroup.expenses[0], date: '2025-12-20' }],
      });
      renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });

      expect(await screen.findByText('No expenses in Jan 2026.')).toBeInTheDocument();
      expect(screen.queryByText('Dinner')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Show all time' }));

      expect(screen.getByText('Dinner')).toBeInTheDocument();
    });

    it('keeps the net amount and the tab badge all-time while the ring follows the period', async () => {
      setIdentity('ABC123', 'p1');
      stubGroupFetch({
        ...baseGroup,
        expenses: [{ ...baseGroup.expenses[0], date: '2025-12-20' }],
      });
      renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });
      await screen.findByText('No expenses in Jan 2026.');

      expect(netFigure('$10.00')).toBeInTheDocument();
      expect(screen.getByText('Coming back to you')).toBeInTheDocument();
      expect(screen.getByLabelText('1 open payment')).toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'Your share $0.00 of the group total $0.00' })).toBeInTheDocument();
    });

    it('switches to the Expenses tab when a period is picked', async () => {
      setIdentity('ABC123', 'p1');
      stubGroupFetch(withDecember());
      renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });
      await screen.findByText('Dinner');
      fireEvent.click(screen.getByRole('tab', { name: /^Balances/ }));
      expect(screen.queryByText('Dinner')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Jan 2026/ }));
      fireEvent.click(screen.getByRole('menuitemradio', { name: /All time/ }));

      expect(screen.getByRole('tab', { name: 'Expenses' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Holiday dinner')).toBeInTheDocument();
    });

    it('leaves the list unfiltered until the viewer picks who they are', async () => {
      stubGroupFetch(withDecember());
      renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });
      fireEvent.click(await screen.findByRole('button', { name: 'Just looking' }));

      expect(screen.getByText('Dinner')).toBeInTheDocument();
      expect(screen.getByText('Holiday dinner')).toBeInTheDocument();
    });
  });

  it('has two tabs and no Activity tab or header bell', async () => {
    setIdentity('ABC123', 'p1');
    stubGroupFetch();
    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });
    await screen.findByText(/Dinner/);

    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Expenses', 'Balances1']);
    expect(screen.queryByRole('button', { name: /Activity/ })).not.toBeInTheDocument();
  });

  it('badges the Balances tab with the viewer\'s open payments and hides it for a bystander', async () => {
    setIdentity('ABC123', 'p1');
    stubGroupFetch();
    const { unmount } = renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });

    expect(await screen.findByLabelText('1 open payment')).toBeInTheDocument();
    unmount();

    localStorage.clear();
    setIdentity('ABC123', 'p3');
    stubGroupFetch({
      ...baseGroup,
      people: [
        ...baseGroup.people,
        { id: 'p3', groupId: 'g1', name: 'Cara', paymentHandle: null, userId: null, removedAt: null, createdAt: '2026-01-01' },
      ],
    });
    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });
    await screen.findByText(/Dinner/);

    expect(screen.queryByLabelText(/open payment/)).not.toBeInTheDocument();
  });

  it('labels the row button Pay for what you owe, and opens the Pay back sheet', async () => {
    setIdentity('ABC123', 'p2');
    stubGroupFetch();
    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });

    fireEvent.click(await screen.findByRole('tab', { name: /^Balances/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Pay' }));

    expect(screen.getByRole('dialog', { name: 'Pay back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'I’ve paid Alice' })).toBeInTheDocument();
  });

  it('shows the paying-back mode read-only on Balances, with a Change link into Settings', async () => {
    setIdentity('ABC123', 'p1');
    stubGroupFetch();
    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });

    fireEvent.click(await screen.findByRole('tab', { name: /^Balances/ }));

    expect(screen.getByText('Each balance')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Change in Settings' }));
    expect(screen.getByRole('dialog', { name: 'Group settings' })).toBeInTheDocument();
  });

  it('drops the Change link once the group is closed', async () => {
    setIdentity('ABC123', 'p1');
    stubGroupFetch({ ...baseGroup, closedAt: '2026-02-01T00:00:00.000Z' });
    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });

    fireEvent.click(await screen.findByRole('tab', { name: /^Balances/ }));

    expect(screen.getByText('Each balance')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Change in Settings' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/open payment/)).not.toBeInTheDocument();
  });

  it('keeps Close group and the paying-back choice out of the Balances tab', async () => {
    setIdentity('ABC123', 'p1');
    stubGroupFetch();
    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });

    fireEvent.click(await screen.findByRole('tab', { name: /^Balances/ }));

    expect(screen.queryByRole('button', { name: 'Close group' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  it('shows a long group title in full, not truncated, below the header controls', async () => {
    stubGroupFetch({ ...baseGroup, name: 'A very long weekend trip with friends' });
    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });
    fireEvent.click(await screen.findByRole('button', { name: 'Just looking' }));

    const title = screen.getByRole('heading', { name: 'A very long weekend trip with friends' });
    expect(title).not.toHaveClass('truncate');
    expect(screen.getByRole('button', { name: 'Group settings' })).toBeInTheDocument();
  });

  describe('changes need a picked name', () => {
    async function renderUnpicked(body: unknown = baseGroup) {
      stubGroupFetch(body);
      renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });
      fireEvent.click(await screen.findByRole('button', { name: 'Just looking' }));
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Who are you?' })).not.toBeInTheDocument());
    }

    it('asks who you are instead of opening Add Expense, then carries on once you pick', async () => {
      await renderUnpicked();

      fireEvent.click(screen.getByRole('button', { name: 'Add Expense' }));

      expect(screen.queryByRole('dialog', { name: 'Add expense' })).not.toBeInTheDocument();
      const prompt = screen.getByRole('dialog', { name: 'Who are you?' });
      fireEvent.click(within(prompt).getByText('Alice'));
      fireEvent.click(within(prompt).getByRole('button', { name: 'Continue' }));

      expect(await screen.findByRole('dialog', { name: 'Add expense' })).toBeInTheDocument();
    });

    it('drops the plan to add an expense if you stay anonymous', async () => {
      await renderUnpicked();

      fireEvent.click(screen.getByRole('button', { name: 'Add Expense' }));
      fireEvent.click(screen.getByRole('button', { name: 'Just looking' }));

      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Who are you?' })).not.toBeInTheDocument());
      expect(screen.queryByRole('dialog', { name: 'Add expense' })).not.toBeInTheDocument();
    });

    it('asks before opening Settings', async () => {
      await renderUnpicked();

      fireEvent.click(screen.getByRole('button', { name: 'Group settings' }));

      expect(screen.queryByRole('dialog', { name: 'Group settings' })).not.toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: 'Who are you?' })).toBeInTheDocument();
    });

    it('shows the roster read-only, with the reason, and no add or edit controls', async () => {
      await renderUnpicked();

      fireEvent.click(screen.getByRole('button', { name: 'People (2)' }));

      const panel = screen.getByRole('dialog', { name: /People/ });
      expect(within(panel).getByText(/Pick who you are/)).toBeInTheDocument();
      expect(within(panel).queryByRole('button', { name: /Add person/i })).not.toBeInTheDocument();
    });

    it('holds ?add=expense back until a name is picked', async () => {
      stubGroupFetch();
      renderWithProviders(<GroupPage />, { route: '/g/ABC123?add=expense', path: '/g/:code' });

      const prompt = await screen.findByRole('dialog', { name: 'Who are you?' });
      expect(screen.queryByRole('dialog', { name: 'Add expense' })).not.toBeInTheDocument();
      fireEvent.click(within(prompt).getByText('Alice'));
      fireEvent.click(within(prompt).getByRole('button', { name: 'Continue' }));

      expect(await screen.findByRole('dialog', { name: 'Add expense' })).toBeInTheDocument();
    });
  });

  it('opens the Add Expense overlay', async () => {
    setIdentity('ABC123', 'p1');
    stubGroupFetch();
    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });
    await screen.findByRole('tab', { name: 'Expenses' });

    fireEvent.click(screen.getByRole('button', { name: 'Add Expense' }));

    const dialog = screen.getByRole('dialog', { name: 'Add expense' });
    expect(within(dialog).getByLabelText('Title')).toBeInTheDocument();
  });

  it('blocks removing a person who is a payer, showing the server message', async () => {
    setIdentity('ABC123', 'p1');
    stubGroupFetch();
    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });
    await screen.findByRole('tab', { name: 'Expenses' });

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
    setIdentity('ABC123', 'p1');
    stubGroupFetch();
    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });
    await screen.findByRole('tab', { name: 'Expenses' });

    fireEvent.click(screen.getByRole('button', { name: 'People (2)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit members' }));
    // In edit mode the add trigger is removed entirely, not just disabled.
    expect(screen.queryByRole('button', { name: 'Add new member' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add new member' }));
    expect(screen.getByRole('button', { name: 'Edit members' })).toBeDisabled();
  });

  it('does not show a spurious required error after successfully adding a person', async () => {
    setIdentity('ABC123', 'p1');
    stubGroupFetch();
    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });
    await screen.findByRole('tab', { name: 'Expenses' });

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
    setIdentity('ABC123', 'p1');
    stubGroupFetch();
    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });
    await screen.findByRole('tab', { name: 'Expenses' });
    fireEvent.click(screen.getByRole('button', { name: 'People (2)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit members' }));

    const aliceGroup = screen.getByRole('group', { name: 'Edit Alice' });
    const aliceInput = within(aliceGroup).getByLabelText('Name');
    fireEvent.change(aliceInput, { target: { value: 'Alicia' } });
    fireEvent.click(within(aliceGroup).getByRole('button', { name: 'Save name' }));

    expect(await screen.findByText('✓ Saved')).toBeInTheDocument();
  });

  it('asks for inline confirmation before removing a person, and Cancel backs out without removing', async () => {
    setIdentity('ABC123', 'p1');
    stubGroupFetch();
    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });
    await screen.findByRole('tab', { name: 'Expenses' });
    fireEvent.click(screen.getByRole('button', { name: 'People (2)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit members' }));

    fireEvent.click(screen.getByRole('button', { name: 'Remove Alice' }));
    expect(screen.getByText('Remove Alice?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Remove Alice?')).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Edit Alice' })).toBeInTheDocument();
  });

  it('toggles bulk member edit mode, editing every person at once, then cancels', async () => {
    setIdentity('ABC123', 'p1');
    stubGroupFetch();
    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });
    await screen.findByRole('tab', { name: 'Expenses' });

    fireEvent.click(screen.getByRole('button', { name: 'People (2)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit members' }));

    expect(screen.getByRole('group', { name: 'Edit Alice' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Edit Bob' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));

    expect(screen.queryByRole('group', { name: 'Edit Alice' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit members' })).toBeInTheDocument();
  });

  it('shows a member\'s payment handle in the roster without opening Edit, and hides the row for members with none', async () => {
    stubGroupFetch({
      ...baseGroup,
      people: [
        { ...baseGroup.people[0], paymentHandle: '@alice' },
        baseGroup.people[1]
      ]
    });
    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });
    fireEvent.click(await screen.findByRole('button', { name: 'Just looking' }));
    fireEvent.click(screen.getByRole('button', { name: 'People (2)' }));

    expect(screen.getByText('(@alice)')).toBeInTheDocument();
  });

  it('saves the name and payment handle fields independently', async () => {
    setIdentity('ABC123', 'p1');
    stubGroupFetch();
    renderWithProviders(<GroupPage />, { route: '/g/ABC123', path: '/g/:code' });
    await screen.findByRole('tab', { name: 'Expenses' });
    fireEvent.click(screen.getByRole('button', { name: 'People (2)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit members' }));

    const aliceGroup = screen.getByRole('group', { name: 'Edit Alice' });
    // Name unchanged: its Save button stays disabled.
    expect(within(aliceGroup).getByRole('button', { name: 'Save name' })).toBeDisabled();

    const handleInput = within(aliceGroup).getByLabelText('Optional: @');
    fireEvent.change(handleInput, { target: { value: '@alice' } });
    const saveHandle = within(aliceGroup).getByRole('button', { name: 'Save handle' });
    expect(saveHandle).toBeEnabled();
    fireEvent.click(saveHandle);

    expect(await within(aliceGroup).findByText('✓ Saved')).toBeInTheDocument();
    // Renaming was never touched, so only the handle route should have been called.
    const calledUrls = vi.mocked(fetch).mock.calls.map((call) => String(call[0]));
    expect(calledUrls.some((url) => url.endsWith('/people/p1/handle'))).toBe(true);
    expect(calledUrls.some((url) => url.endsWith('/people/p1/name'))).toBe(false);
  });
});
