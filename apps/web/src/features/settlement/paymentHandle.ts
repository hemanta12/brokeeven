import { formatCurrency } from '../../shared/format';

// What gets put on the clipboard: the handle plus the amount, because that is
// what has to be retyped into the payment app. Kept out of the component so
// the copied string is testable without a clipboard.
export function paymentCopyText(handle: string, amount: string, currency: string): string {
  const parsed = Number(amount);
  const safe = Number.isFinite(parsed) ? parsed : 0;
  return `${handle} ${formatCurrency(safe, currency)}`;
}
