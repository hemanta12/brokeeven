import { distributeProportionally } from './splitMath.js';

export type RedistributeInput =
  | { method: 'equal'; remainingCount: number; totalCents: number }
  | { method: 'percent'; remainingPercents: number[]; totalCents: number }
  | { method: 'custom'; remainingAmountsCents: number[]; removedAmountCents: number };

export type RedistributeResult = { amountsCents: number[]; percents?: number[] };

// PRD §6.2: on member removal, recompute the remaining splits per the original
// method — equal divides among fewer, percent renormalizes to 100%, custom
// spreads the removed share proportionally to existing amounts.
export function redistributeAmounts(input: RedistributeInput): RedistributeResult {
  if (input.method === 'equal') {
    const amountsCents = distributeProportionally(input.totalCents, new Array(input.remainingCount).fill(1));
    return { amountsCents };
  }

  if (input.method === 'percent') {
    // Distribute 10000 basis points (100.00%) proportionally to the old percents,
    // reusing the cent-rounding rule at 2-decimal precision.
    const basisPoints = distributeProportionally(10000, input.remainingPercents);
    const percents = basisPoints.map((bp) => bp / 100);
    const amountsCents = distributeProportionally(input.totalCents, percents);
    return { amountsCents, percents };
  }

  const additions = distributeProportionally(input.removedAmountCents, input.remainingAmountsCents);
  const amountsCents = input.remainingAmountsCents.map((amount, i) => amount + (additions[i] ?? 0));
  return { amountsCents };
}
