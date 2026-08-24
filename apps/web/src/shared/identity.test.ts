import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getIdentity, setIdentity } from './identity';

describe('identity', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips a person id scoped to a group code', () => {
    setIdentity('ABC123', 'person-1');

    expect(getIdentity('ABC123')).toBe('person-1');
    expect(getIdentity('OTHER')).toBeNull();
  });

  describe('when localStorage throws', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('setIdentity fails silently', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('storage disabled');
      });

      expect(() => setIdentity('ABC123', 'person-1')).not.toThrow();
    });

    it('getIdentity returns null', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('storage disabled');
      });

      expect(getIdentity('ABC123')).toBeNull();
    });
  });
});
