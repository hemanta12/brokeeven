export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function centsToAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}
