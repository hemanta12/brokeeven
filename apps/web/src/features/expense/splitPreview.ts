// Mirrors the server's rounding rule (splitMath.ts distributeProportionally,
// equal weights) so the Equal-split preview and the server agree on the odd cent.
export function equalSplitCents(totalCents: number, participantCount: number): number[] {
  if (participantCount === 0) return [];

  const rounded = new Array<number>(participantCount).fill(Math.round(totalCents / participantCount));
  let leftover = totalCents - rounded.reduce((a, b) => a + b, 0);
  const step = leftover > 0 ? 1 : -1;
  for (let i = 0; leftover !== 0; i++, leftover -= step) {
    const idx = i % participantCount;
    rounded[idx] = (rounded[idx] ?? 0) + step;
  }
  return rounded;
}

export function dollarsToCents(amount: string): number {
  const parsed = Number(amount);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}
