import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getIdentity, listLocalIdentities, setIdentity } from './identity';

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

describe('listLocalIdentities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('collects every remembered group, ignoring unrelated keys', () => {
    setIdentity('ABC123', 'person-1');
    setIdentity('XYZ789', 'person-2');
    localStorage.setItem('some-other-app', 'noise');

    expect(listLocalIdentities()).toEqual(
      expect.arrayContaining([
        { code: 'ABC123', personId: 'person-1' },
        { code: 'XYZ789', personId: 'person-2' }
      ])
    );
    expect(listLocalIdentities()).toHaveLength(2);
  });

  it('returns nothing rather than throwing when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'key').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    expect(listLocalIdentities()).toEqual([]);
  });
});
