const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

export function formatDate(date: string | Date): string {
  return dateFormatter.format(typeof date === 'string' ? new Date(date) : date);
}
