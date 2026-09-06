import { isValidElement } from 'react';
import { describe, expect, it } from 'vitest';

import { withMoneyEmphasis } from './ActivityFeed';

// Returns the substrings that got wrapped in the mono <span>.
function emphasised(text: string): string[] {
  return withMoneyEmphasis(text)
    .filter(isValidElement)
    .map((node) => (node as { props: { children: string } }).props.children);
}

describe('withMoneyEmphasis', () => {
  it('wraps a bare $ amount (the pre-6.1 format)', () => {
    expect(emphasised('Bob paid Alice $20.00 (Venmo)')).toEqual(['$20.00']);
  });

  it('wraps symbol-prefixed non-USD amounts', () => {
    expect(emphasised('Bob paid Alice €1,250.00 (SEPA)')).toEqual(['€1,250.00']);
    expect(emphasised('undid Bob paying Alice ₹500.00')).toEqual(['₹500.00']);
  });

  it('wraps code-prefixed amounts like NPR 1,200.00', () => {
    expect(emphasised('Bob paid Alice NPR 1,200.00 (eSewa)')).toEqual(['NPR 1,200.00']);
  });

  it('wraps a no-decimal currency (JPY)', () => {
    expect(emphasised('Bob paid Alice ¥3000 (cash)')).toEqual(['¥3000']);
  });

  it('leaves text with no amount untouched', () => {
    expect(emphasised('Alice added')).toEqual([]);
  });
});
