import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GroupSummary } from './GroupSummary';
import type { Balance, Expense } from './types';

const ME = 'p-me';

function balance(fromPersonId: string, toPersonId: string, amount: string): Balance {
  return { fromPersonId, toPersonId, amount };
}

let seq = 0;
function expense(payerId: string, amount: string, splits: Array<[string, string]>): Expense {
  seq += 1;
  const id = `e${seq}`;
  return {
    id,
    groupId: 'g1',
    title: 'Camping',
    description: null,
    amount,
    date: '2026-08-31',
    payerId,
    splitMethod: 'equal',
    createdByUserId: null,
    splits: splits.map(([personId, splitAmount], index) => ({
      id: `${id}-s${index}`,
      expenseId: id,
      personId,
      amount: splitAmount,
      percentAtEntry: null,
    })),
  };
}

const EXPENSES = [
  expense(ME, '150.00', [[ME, '50.00'], ['p-alice', '50.00'], ['p-bob', '50.00']]),
  expense('p-alice', '90.00', [[ME, '30.00'], ['p-alice', '30.00'], ['p-bob', '30.00']]),
];

describe('GroupSummary', () => {
  it('sums each side of the balances and shows the spend it sits against', () => {
    render(
      <GroupSummary
        balances={[
          balance('p-alice', ME, '120.00'),
          balance('p-bob', ME, '80.00'),
          balance(ME, 'p-cara', '30.00'),
        ]}
        expenses={EXPENSES}
        personId={ME}
        currency="USD"
        onSettleUp={vi.fn()}
      />
    );

    expect(screen.getByText('You’re owed')).toBeInTheDocument();
    expect(screen.getByText('$200.00')).toBeInTheDocument();
    expect(screen.getByText('You owe')).toBeInTheDocument();
    expect(screen.getByText('$30.00')).toBeInTheDocument();
    expect(screen.getByText('Total group expense')).toBeInTheDocument();
    expect(screen.getByText('$240.00')).toBeInTheDocument();
    expect(screen.getByText('Your share')).toBeInTheDocument();
    expect(screen.getByText('$80.00')).toBeInTheDocument();
  });

  it('jumps to settle up and reports how many payments are left', () => {
    const onSettleUp = vi.fn();
    render(
      <GroupSummary
        balances={[balance('p-alice', ME, '50.00'), balance(ME, 'p-bob', '80.00')]}
        expenses={EXPENSES}
        personId={ME}
        currency="USD"
        onSettleUp={onSettleUp}
      />
    );

    expect(screen.getByText('2 payments left to settle')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /settle up/i }));
    expect(onSettleUp).toHaveBeenCalledTimes(1);
  });

  it('counts only the balances the viewer is a party to', () => {
    render(
      <GroupSummary
        balances={[
          balance('p-alice', ME, '50.00'), // mine
          balance('p-bob', 'p-cara', '80.00'), // not mine
        ]}
        expenses={EXPENSES}
        personId={ME}
        currency="USD"
        onSettleUp={vi.fn()}
      />
    );

    expect(screen.getByText('1 payment left to settle')).toBeInTheDocument();
  });

  it('keeps the payments-left status but drops the jump link when already on Balances', () => {
    render(
      <GroupSummary
        balances={[balance('p-alice', ME, '50.00')]}
        expenses={EXPENSES}
        personId={ME}
        currency="USD"
      />
    );

    // Status stays so the card is the same height on every tab.
    expect(screen.getByText('1 payment left to settle')).toBeInTheDocument();
    // The redundant "go to Balances" action does not.
    expect(screen.queryByRole('button', { name: /settle up/i })).not.toBeInTheDocument();
  });

  it('shows an all-settled state once every balance is cleared', () => {
    render(
      <GroupSummary balances={[]} expenses={EXPENSES} personId={ME} currency="USD" onSettleUp={vi.fn()} />
    );

    expect(screen.getByText('You’re all settled up')).toBeInTheDocument();
    expect(screen.queryByText(/left to settle/)).not.toBeInTheDocument();
  });

  it('renders nothing when the viewer has no share and no open balance', () => {
    const { container } = render(
      <GroupSummary
        balances={[balance('p-alice', 'p-bob', '25.00')]}
        expenses={[expense('p-alice', '25.00', [['p-alice', '25.00']])]}
        personId={ME}
        currency="USD"
        onSettleUp={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
