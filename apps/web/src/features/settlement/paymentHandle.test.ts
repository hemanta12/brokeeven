import { describe, expect, it } from 'vitest';

import { paymentCopyText } from './paymentHandle';

describe('paymentCopyText', () => {
  it('pairs the handle with the formatted amount', () => {
    expect(paymentCopyText('@alice', '12.5', 'USD')).toBe('@alice $12.50');
  });

  it('respects the group currency', () => {
    expect(paymentCopyText('alice@upi', '400', 'INR')).toBe('alice@upi ₹400.00');
  });

  it('falls back to zero rather than copying NaN from a half-typed amount', () => {
    expect(paymentCopyText('@alice', '', 'USD')).toBe('@alice $0.00');
  });
});
