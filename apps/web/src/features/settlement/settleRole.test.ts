import { describe, expect, it } from 'vitest';

import { settleRole } from './settleRole';

const row = { fromPersonId: 'a', toPersonId: 'b' };

describe('settleRole', () => {
  it('is pay for the debtor and receive for the creditor', () => {
    expect(settleRole(row, 'a')).toBe('pay');
    expect(settleRole(row, 'b')).toBe('receive');
  });

  it('is null for a bystander or an unidentified viewer', () => {
    expect(settleRole(row, 'c')).toBeNull();
    expect(settleRole(row, null)).toBeNull();
  });
});
