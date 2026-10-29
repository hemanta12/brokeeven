import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { getActivitySeen, setActivitySeen } from '../../shared/activitySeen';
import { useActivityUnread } from './useActivityUnread';

const T1 = '2026-10-20T09:00:00.000Z';
const T2 = '2026-10-20T10:00:00.000Z';

afterEach(() => localStorage.clear());

describe('useActivityUnread', () => {
  it('starts from the current activity on a first visit instead of showing a dot', () => {
    const { result } = renderHook(() => useActivityUnread('ABC123', T1));

    expect(result.current.unread).toBe(false);
    expect(getActivitySeen('ABC123')).toBe(T1);
  });

  it('shows the dot when activity is newer than the stored baseline', () => {
    setActivitySeen('ABC123', T1);

    const { result } = renderHook(() => useActivityUnread('ABC123', T2));

    expect(result.current.unread).toBe(true);
  });

  it('clears on markSeen and returns on a later realtime update', () => {
    setActivitySeen('ABC123', T1);
    const { result, rerender } = renderHook(({ last }) => useActivityUnread('ABC123', last), {
      initialProps: { last: T2 }
    });

    act(() => result.current.markSeen());
    expect(result.current.unread).toBe(false);
    expect(getActivitySeen('ABC123')).toBe(T2);

    rerender({ last: '2026-10-20T11:00:00.000Z' });
    expect(result.current.unread).toBe(true);
  });

  it('has nothing to flag for a group with no activity', () => {
    const { result } = renderHook(() => useActivityUnread('ABC123', null));

    expect(result.current.unread).toBe(false);
    expect(getActivitySeen('ABC123')).toBeNull();
  });
});
