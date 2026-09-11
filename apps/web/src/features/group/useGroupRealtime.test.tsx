import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { groupQueryKey } from './api';
import type { GroupWithPeople, Person } from './types';
import { useGroupRealtime } from './useGroupRealtime';

let updateHandler: ((payload: GroupWithPeople) => void) | undefined;
let reconnectHandler: (() => void) | undefined;
const emit = vi.fn();
const disconnect = vi.fn();

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    emit,
    on: (event: string, handler: (payload: GroupWithPeople) => void) => {
      if (event === 'group:update') updateHandler = handler;
    },
    disconnect,
    io: {
      on: (event: string, handler: () => void) => {
        if (event === 'reconnect') reconnectHandler = handler;
      }
    }
  }))
}));

const alice: Person = { id: 'p1', groupId: 'g1', name: 'Alice', paymentHandle: null, userId: null, removedAt: null, createdAt: '2026-01-01' };

function baseGroup(overrides: Partial<GroupWithPeople> = {}): GroupWithPeople {
  return {
    id: 'g1',
    name: 'Trip',
    label: null,
    joinCode: 'ABC123',
    currency: 'USD',
    closedAt: null,
    forgiveThreshold: '0',
    settleMode: 'direct',
    createdAt: '2026-01-01',
    people: [],
    expenses: [],
    settlements: [],
    balances: [],
    viewerUserId: null,
    ...overrides
  };
}

describe('useGroupRealtime', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    emit.mockClear();
    disconnect.mockClear();
    updateHandler = undefined;
    reconnectHandler = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  it('joins the group room on mount', () => {
    renderHook(() => useGroupRealtime('ABC123', 'g1'), { wrapper });
    expect(emit).toHaveBeenCalledWith('group:join', 'ABC123');
  });

  it('does nothing until both code and groupId are known', () => {
    renderHook(() => useGroupRealtime(undefined, undefined), { wrapper });
    expect(emit).not.toHaveBeenCalled();
  });

  it('applies an incoming update to the cache and pulses changed rows, clearing after 250ms', () => {
    vi.useFakeTimers();
    queryClient.setQueryData(groupQueryKey('ABC123'), baseGroup());
    const { result } = renderHook(() => useGroupRealtime('ABC123', 'g1'), { wrapper });

    const updated = baseGroup({ people: [alice] });
    act(() => updateHandler?.(updated));

    expect(queryClient.getQueryData(groupQueryKey('ABC123'))).toEqual(updated);
    expect(result.current.has('p1')).toBe(true);

    act(() => vi.advanceTimersByTime(250));
    expect(result.current.has('p1')).toBe(false);
  });

  it('refetches via REST on socket reconnect instead of trusting the disconnect-window state', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useGroupRealtime('ABC123', 'g1'), { wrapper });

    reconnectHandler?.();

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: groupQueryKey('ABC123') });
  });

  it('disconnects the socket on unmount', () => {
    const { unmount } = renderHook(() => useGroupRealtime('ABC123', 'g1'), { wrapper });
    unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
