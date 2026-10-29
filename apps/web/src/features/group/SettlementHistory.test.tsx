import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../test-utils';
import { SettlementHistory } from './SettlementHistory';
import type { Person, Settlement } from './types';

const person = (id: string, name: string): Person => ({
  id,
  groupId: 'g1',
  name,
  paymentHandle: null,
  userId: null,
  removedAt: null,
  createdAt: '2026-01-01'
});
const PEOPLE = [person('a', 'Alice'), person('b', 'Bob'), person('c', 'Cara')];

const SETTLEMENT = {
  id: 's1',
  groupId: 'g1',
  fromPersonId: 'a',
  toPersonId: 'b',
  amount: '18.00',
  note: 'cash',
  settledAt: '2026-01-05T00:00:00.000Z'
} as unknown as Settlement;

function setup(identityPersonId: string | null, readOnly = false) {
  const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(null, { status: 204 })));
  vi.stubGlobal('fetch', fetchMock);
  renderWithProviders(
    <SettlementHistory
      code="ABC123"
      settlements={[SETTLEMENT]}
      people={PEOPLE}
      identityPersonId={identityPersonId}
      currency="USD"
      readOnly={readOnly}
    />
  );
  return { fetchMock };
}

describe('SettlementHistory', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('offers Undo to the person who paid', () => {
    setup('a');

    expect(screen.getByText('You paid Bob')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
  });

  it('offers Undo to the person who was paid', () => {
    setup('b');

    expect(screen.getByText('Alice paid you')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
  });

  it('marks the payments that are yours: signed amount, in direction', () => {
    setup('a');

    expect(screen.getByText('−$18.00')).toBeInTheDocument();
  });

  it('shows money you received with a plus', () => {
    setup('b');

    expect(screen.getByText('+$18.00')).toBeInTheDocument();
  });

  it('leaves payments between other people plain and unsigned', () => {
    setup('c');

    const amount = screen.getByText('$18.00');
    expect(amount).toHaveClass('text-dim');
    expect(amount.textContent).not.toMatch(/[+−]/);
  });

  it('hides Undo from someone the payment is not between', () => {
    setup('c');

    expect(screen.getByText('Alice paid Bob')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
  });

  it('hides Undo when the viewer has not picked who they are', () => {
    setup(null);

    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
  });

  it('hides Undo on a closed group, even for the people involved', () => {
    setup('a', true);

    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
  });

  it('deletes the settlement when Undo is pressed', async () => {
    const { fetchMock } = setup('a');

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/settlements/s1');
    expect(init.method).toBe('DELETE');
  });
});
