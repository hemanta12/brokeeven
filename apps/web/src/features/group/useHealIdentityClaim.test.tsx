import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { claimPerson } from '../auth/api';
import type { Person } from './types';
import { useHealIdentityClaim } from './useHealIdentityClaim';

vi.mock('../auth/api', () => ({ claimPerson: vi.fn().mockResolvedValue(undefined) }));

const person = (id: string, userId: string | null): Person => ({
  id,
  groupId: 'g1',
  name: id,
  paymentHandle: null,
  userId,
  removedAt: null,
  createdAt: '2026-01-01'
});

function setup(people: Person[], personId: string | null) {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(({ list, id }) => useHealIdentityClaim('ABC123', list, id), {
    wrapper,
    initialProps: { list: people, id: personId }
  });
}

beforeEach(() => vi.mocked(claimPerson).mockClear());

describe('useHealIdentityClaim', () => {
  it('re-sends the claim when this device says who you are but the server never linked it', () => {
    setup([person('p1', null), person('p2', null)], 'p1');

    expect(claimPerson).toHaveBeenCalledTimes(1);
    expect(claimPerson).toHaveBeenCalledWith('p1', 'ABC123');
  });

  it('leaves a person who is already linked alone', () => {
    setup([person('p1', 'some-user')], 'p1');

    expect(claimPerson).not.toHaveBeenCalled();
  });

  it('does nothing without a picked person, or when the person is not in the group', () => {
    setup([person('p1', null)], null);
    setup([person('p1', null)], 'ghost');

    expect(claimPerson).not.toHaveBeenCalled();
  });

  it('asks once per page load, not on every render', () => {
    const { rerender } = setup([person('p1', null)], 'p1');

    rerender({ list: [person('p1', null)], id: 'p1' });
    rerender({ list: [person('p1', null), person('p2', null)], id: 'p1' });

    expect(claimPerson).toHaveBeenCalledTimes(1);
  });
});
