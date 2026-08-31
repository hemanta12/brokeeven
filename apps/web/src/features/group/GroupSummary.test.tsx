import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GroupSummary } from './GroupSummary';
import type { Balance, Expense } from './types';

const ME = 'p-me';

function balance(fromPersonId: string, toPersonId: string, amount: string): Balance {
  return { fromPersonId, toPersonId, amount };
}

let expenseSeq = 0;
function expense(payerId: string, amount: string, splits: Array<[string, string]>): Expense {
  expenseSeq += 1;
  const id = `e${expenseSeq}`;
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

describe('GroupSummary', () => {
  // The scenario that drove the design: 5 expenses, the viewer fronted 3.
  it('reports what the viewer paid, what was theirs, and what comes back', () => {
    render(
      <GroupSummary
        balances={[balance('p-alice', ME, '120.00'), balance('p-bob', ME, '80.00')]}
        expenses={[
          expense(ME, '150.00', [[ME, '50.00'], ['p-alice', '50.00'], ['p-bob', '50.00']]),
          expense(ME, '90.00', [[ME, '30.00'], ['p-alice', '30.00'], ['p-bob', '30.00']]),
          expense(ME, '60.00', [[ME, '20.00'], ['p-alice', '20.00'], ['p-bob', '20.00']]),
          expense('p-alice', '30.00', [[ME, '10.00'], ['p-alice', '10.00'], ['p-bob', '10.00']]),
          expense('p-bob', '30.00', [[ME, '10.00'], ['p-alice', '10.00'], ['p-bob', '10.00']]),
        ]}
        personId={ME}
      />
    );

    expect(screen.getByText('You paid')).toBeInTheDocument();
    expect(screen.getByText('$300.00')).toBeInTheDocument();
    expect(screen.getByText('Your share')).toBeInTheDocument();
    expect(screen.getByText('$120.00')).toBeInTheDocument();
    expect(screen.getByText('Your balance')).toBeInTheDocument();
    expect(screen.getByText('+$200.00')).toBeInTheDocument();
  });

  // Settling moves the balance but not what was paid or consumed, which is
  // why the third figure reads from `balances` rather than paid − share.
  it('tracks the balance after a settlement, not paid minus share', () => {
    render(
      <GroupSummary
        // Alice has repaid 120 of the 200; only Bob's 80 is left.
        balances={[balance('p-bob', ME, '80.00')]}
        expenses={[expense(ME, '300.00', [[ME, '100.00'], ['p-alice', '120.00'], ['p-bob', '80.00']])]}
        personId={ME}
      />
    );

    expect(screen.getByText('$300.00')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('+$80.00')).toBeInTheDocument();
    // The naive paid − share figure, which would still claim 200.
    expect(screen.queryByText('+$200.00')).not.toBeInTheDocument();
  });

  it('signs the balance negative when the viewer owes on net', () => {
    render(
      <GroupSummary
        // Alice fronted it all and has since been paid back 15 of the 40.
        balances={[balance(ME, 'p-alice', '25.00')]}
        expenses={[expense('p-alice', '100.00', [[ME, '40.00'], ['p-alice', '60.00']])]}
        personId={ME}
      />
    );

    expect(screen.getByText('Your balance')).toBeInTheDocument();
    expect(screen.getByText('$0.00')).toBeInTheDocument();
    expect(screen.getByText('$40.00')).toBeInTheDocument();
    // One stable label; the sign carries the direction.
    expect(screen.getByText('−$25.00')).toBeInTheDocument();
  });

  it('shows a zero balance when the viewer is square but has spent', () => {
    render(
      <GroupSummary
        balances={[]}
        expenses={[expense(ME, '50.00', [[ME, '50.00']])]}
        personId={ME}
      />
    );

    expect(screen.getByText('Your balance')).toBeInTheDocument();
    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  it('breaks the net into gross sides when money moves both ways', () => {
    render(
      <GroupSummary
        balances={[balance('p-alice', ME, '50.00'), balance(ME, 'p-bob', '80.00')]}
        expenses={[expense(ME, '150.00', [[ME, '30.00'], ['p-alice', '60.00'], ['p-bob', '60.00']])]}
        personId={ME}
      />
    );

    expect(screen.getByText('Your balance')).toBeInTheDocument();
    expect(screen.getByText('−$30.00')).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();
    expect(screen.getByText('$80.00')).toBeInTheDocument();
    expect(screen.getByText('to you')).toBeInTheDocument();
    expect(screen.getByText('you owe')).toBeInTheDocument();
  });

  it('renders nothing when none of the group is the viewer’s', () => {
    const { container } = render(
      <GroupSummary
        balances={[balance('p-alice', 'p-bob', '25.00')]}
        expenses={[expense('p-alice', '25.00', [['p-alice', '25.00']])]}
        personId={ME}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
