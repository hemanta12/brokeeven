import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { claimIdentity } from './claimIdentity';
import { GroupSummary } from './GroupSummary';
import type { Balance, Expense, Person } from './types';

vi.mock('./claimIdentity', () => ({ claimIdentity: vi.fn() }));

const ME = 'p-me';

function person(id: string, name: string): Person {
  return { id, groupId: 'g1', name, paymentHandle: null, userId: null, removedAt: null, createdAt: '2026-01-01' };
}
const PEOPLE = [person(ME, 'Me'), person('p-sofia', 'Sofia'), person('p-nikita', 'Nikita')];

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
  expense(ME, '150.00', [[ME, '50.00'], ['p-sofia', '50.00'], ['p-nikita', '50.00']]),
  expense('p-sofia', '90.00', [[ME, '30.00'], ['p-sofia', '30.00'], ['p-nikita', '30.00']]),
];

// The cents are their own span, so match the whole paragraph rather than one text node.
const netFigure = (text: string) =>
  screen.getByText((_, element) => element?.tagName === 'P' && element.textContent === text);

function setup(overrides: Partial<React.ComponentProps<typeof GroupSummary>> = {}) {
  const onSettleUp = vi.fn();
  const onClaimed = vi.fn();
  render(
    <GroupSummary
      code="ABC123"
      people={PEOPLE}
      personId={ME}
      balances={[]}
      expenses={EXPENSES}
      currency="USD"
      settleMode="direct"
      onSettleUp={onSettleUp}
      onClaimed={onClaimed}
      {...overrides}
    />
  );
  return { onSettleUp, onClaimed };
}

describe('GroupSummary', () => {
  it('says what you need to pay when the net is negative, with the way to settle', () => {
    const { onSettleUp } = setup({ balances: [balance(ME, 'p-sofia', '42.00')] });

    expect(screen.getByText('You need to pay')).toBeInTheDocument();
    expect(netFigure('$42.00')).toBeInTheDocument();
    expect(screen.getByText('Net position')).toBeInTheDocument();
    expect(screen.getByText('1 payment to sort out')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Settle in Balances/ }));
    expect(onSettleUp).toHaveBeenCalledTimes(1);
  });

  it('says what is coming back when the net is positive', () => {
    setup({ balances: [balance('p-sofia', ME, '120.00'), balance('p-nikita', ME, '80.00')] });

    expect(screen.getByText('Coming back to you')).toBeInTheDocument();
    expect(netFigure('$200.00')).toBeInTheDocument();
    expect(screen.getByText('2 payments to sort out')).toBeInTheDocument();
  });

  it('headlines the card Net position, so a two-way net is not read as "nothing owed"', () => {
    // Pay Sofia $25, Nikita pays you $35: the net is +$10 but a payment is still owed.
    setup({ balances: [balance(ME, 'p-sofia', '25.00'), balance('p-nikita', ME, '35.00')] });

    expect(screen.getByText('Net position')).toBeInTheDocument();
    expect(screen.getByText('Coming back to you')).toBeInTheDocument();
    expect(netFigure('$10.00')).toBeInTheDocument();
    expect(screen.getByText('2 payments to sort out')).toBeInTheDocument();
  });

  it('shows even with no settle link when nothing is open', () => {
    setup();

    expect(screen.getByText('Net position')).toBeInTheDocument();
    expect(screen.getByText('You’re even')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Settle in Balances/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/to sort out/)).not.toBeInTheDocument();
  });

  it('counts plan rows, not raw balances, in Fewest payments mode', () => {
    // me -> sofia -> nikita nets to a single me -> nikita payment.
    setup({
      settleMode: 'simplified',
      balances: [balance(ME, 'p-sofia', '5.00'), balance('p-sofia', 'p-nikita', '5.00')],
    });

    expect(screen.getByText('1 payment to sort out')).toBeInTheDocument();
  });

  it('draws the ring from your share of the period total', () => {
    setup();

    expect(screen.getByRole('img', { name: 'Your share $80.00 of the group total $240.00' })).toBeInTheDocument();
  });

  it('shows $0.00 and no arc for an empty period', () => {
    const { container } = render(
      <GroupSummary
        code="ABC123"
        people={PEOPLE}
        personId={ME}
        balances={[]}
        expenses={[]}
        currency="USD"
        settleMode="direct"
        onSettleUp={vi.fn()}
        onClaimed={vi.fn()}
      />
    );

    const ring = container.querySelector('svg[role="img"]') as SVGElement;
    expect(ring).toHaveAccessibleName('Your share $0.00 of the group total $0.00');
    expect(ring.querySelectorAll('circle')).toHaveLength(1);
  });

  describe('viewer has not picked a person', () => {
    it('asks which one is you and lists everyone', () => {
      setup({ personId: null });

      expect(screen.getByText('Which one is you?')).toBeInTheDocument();
      for (const name of ['Me', 'Sofia', 'Nikita']) {
        expect(screen.getByRole('button', { name: new RegExp(name) })).toBeInTheDocument();
      }
      expect(screen.queryByText('You need to pay')).not.toBeInTheDocument();
    });

    it('claims the picked person and tells the page', () => {
      const { onClaimed } = setup({ personId: null });

      fireEvent.click(screen.getByRole('button', { name: /Sofia/ }));

      expect(claimIdentity).toHaveBeenCalledWith('ABC123', 'p-sofia');
      expect(onClaimed).toHaveBeenCalledTimes(1);
    });
  });
});
