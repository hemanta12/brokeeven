import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../test-utils';
import type { Balance, Person } from '../group/types';
import { SettleUpModal } from './SettleUpModal';

function person(id: string, name: string, paymentHandle: string | null = null): Person {
  return { id, groupId: 'g1', name, paymentHandle, userId: null, removedAt: null, createdAt: '2026-01-01' };
}

// Sofia is owed by the viewer's side in one test and owes in the other; both have handles.
const PEOPLE = [person('me', 'Me', '@me-pay'), person('sofia', 'Sofia', '@sofia-pay')];

function setup(balance: Balance, role: 'pay' | 'receive') {
  const fetchMock = vi
    .fn()
    .mockImplementation(() => Promise.resolve(new Response(JSON.stringify({}), { status: 200 })));
  vi.stubGlobal('fetch', fetchMock);
  renderWithProviders(
    <SettleUpModal
      code="ABC123"
      people={PEOPLE}
      balance={balance}
      balances={[balance]}
      currency="USD"
      role={role}
      onClose={vi.fn()}
    />
  );
  return { fetchMock };
}

describe('SettleUpModal wording', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('when you owe: Pay back, the payee handle with copy, and "I’ve paid {name}"', () => {
    setup({ fromPersonId: 'me', toPersonId: 'sofia', amount: '25.00' }, 'pay');

    const dialog = screen.getByRole('dialog', { name: 'Pay back' });
    expect(within(dialog).getByText('@sofia-pay')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Copy' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'I’ve paid Sofia' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Mark as received' })).not.toBeInTheDocument();
  });

  it('when you are owed: Mark as received, no handle, and a matching submit button', () => {
    setup({ fromPersonId: 'sofia', toPersonId: 'me', amount: '35.00' }, 'receive');

    const dialog = screen.getByRole('dialog', { name: 'Mark as received' });
    expect(within(dialog).queryByText('@me-pay')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Copy' })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Mark as received' })).toBeInTheDocument();
  });

  it('either side records the same settlement', async () => {
    const { fetchMock } = setup({ fromPersonId: 'sofia', toPersonId: 'me', amount: '35.00' }, 'receive');

    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'cash' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mark as received' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/groups/ABC123/settlements');
    expect(JSON.parse(init.body as string)).toMatchObject({ fromPersonId: 'sofia', toPersonId: 'me', amount: 35 });
  });
});
