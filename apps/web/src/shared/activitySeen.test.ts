import { afterEach, describe, expect, it, vi } from 'vitest';

import { getActivitySeen, hasUnreadActivity, setActivitySeen } from './activitySeen';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('activitySeen storage', () => {
  it('round-trips per group code', () => {
    setActivitySeen('ABC123', '2026-10-20T09:30:00.000Z');

    expect(getActivitySeen('ABC123')).toBe('2026-10-20T09:30:00.000Z');
    expect(getActivitySeen('OTHER')).toBeNull();
  });

  it('fails silently when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(getActivitySeen('ABC123')).toBeNull();
    expect(() => setActivitySeen('ABC123', '2026-10-20T09:30:00.000Z')).not.toThrow();
  });
});

describe('hasUnreadActivity', () => {
  const seen = '2026-10-20T09:30:00.000Z';

  it('is true only when activity is strictly newer than what was seen', () => {
    expect(hasUnreadActivity('2026-10-20T09:30:01.000Z', seen)).toBe(true);
    expect(hasUnreadActivity(seen, seen)).toBe(false);
    expect(hasUnreadActivity('2026-10-19T09:30:00.000Z', seen)).toBe(false);
  });

  it('is false without activity or without a baseline', () => {
    expect(hasUnreadActivity(null, seen)).toBe(false);
    expect(hasUnreadActivity(undefined, seen)).toBe(false);
    expect(hasUnreadActivity('2026-10-20T09:30:01.000Z', null)).toBe(false);
  });
});
