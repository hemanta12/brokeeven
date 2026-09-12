import { beforeEach, describe, expect, it } from 'vitest';

import { forgetRecentGroup, listRecentGroups, rememberRecentGroup } from './recentGroups';

describe('recentGroups', () => {
  beforeEach(() => localStorage.clear());

  it('keeps newest first with no duplicate codes', () => {
    rememberRecentGroup('AAA', 'Trip');
    rememberRecentGroup('BBB', 'Flat');
    rememberRecentGroup('AAA', 'Trip renamed');

    expect(listRecentGroups().map((entry) => [entry.code, entry.name])).toEqual([
      ['AAA', 'Trip renamed'],
      ['BBB', 'Flat']
    ]);
  });

  it('caps the list at 10', () => {
    for (let index = 0; index < 12; index++) rememberRecentGroup(`C${index}`, `G${index}`);
    expect(listRecentGroups()).toHaveLength(10);
    expect(listRecentGroups()[0]?.code).toBe('C11');
  });

  it('forgets a code and survives garbage in storage', () => {
    rememberRecentGroup('AAA', 'Trip');
    forgetRecentGroup('AAA');
    expect(listRecentGroups()).toEqual([]);

    localStorage.setItem('brokeeven:recentGroups', '{not json');
    expect(listRecentGroups()).toEqual([]);
  });
});
