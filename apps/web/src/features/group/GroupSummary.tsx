import { formatCurrency } from '../../shared/format';
import type { Balance, Expense } from './types';

interface GroupSummaryProps {
  balances: Balance[];
  expenses: Expense[];
  personId: string;
}

function sum(values: string[]): number {
  return values.reduce((total, value) => total + Number(value), 0);
}

// Deposit / withdraw arrows over a small tray: "in" drops an arrow into the
// tray (money coming back to you), "out" lifts one out. The tray shape is what
// keeps it from reading as a rising/falling trend line. Direction is the cue,
// not colour — the arrow and the "to you" / "you owe" label both say it.
function FlowArrow({ variant }: { variant: 'in' | 'out' }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
      className="h-3.5 w-3.5 shrink-0"
    >
      <path
        d={
          variant === 'in'
            ? 'M8 2.5V9.5M5 6.5 8 9.5 11 6.5'
            : 'M8 9.5V2.5M5 5.5 8 2.5 11 5.5'
        }
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3.5 10.5V13h9v-2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// The money-flow reading the Balances tab can't give you: what left your
// pocket, what was actually yours, and what comes back.
//
// It deliberately does NOT restate the tab. Summing the tab's two directions
// into "you're owed / you owe" is just its column totals in a different
// font — and one of the two is almost always $0.00. "You paid" and "Your
// share" appear nowhere else in the app; you'd have to add up the expense
// list by hand to get either.
//
// The third figure comes from `balances`, not from paid − share, because the
// two diverge the moment anyone settles up: a $50 repayment moves the
// balance but changes neither what you paid nor what you consumed. The top
// row nets it to a single number; when the net hides a real amount owed to
// you (you're owed by one person and owe another), a thin line under the row
// breaks it back into its two gross sides. Both are still one tap deeper in
// the Balances tab, per person.
export function GroupSummary({ balances, expenses, personId }: GroupSummaryProps) {
  const paid = sum(expenses.filter((expense) => expense.payerId === personId).map((e) => e.amount));
  const share = sum(
    expenses.flatMap((expense) => expense.splits.filter((split) => split.personId === personId)).map((s) => s.amount)
  );
  const owedGross = sum(balances.filter((b) => b.toPersonId === personId).map((b) => b.amount));
  const oweGross = sum(balances.filter((b) => b.fromPersonId === personId).map((b) => b.amount));
  const net = owedGross - oweGross;

  // Nothing of theirs has happened yet — an all-zero strip is noise.
  if (paid === 0 && share === 0 && net === 0 && owedGross === 0 && oweGross === 0) return null;

  // Show the gross split only when netting actually loses information — i.e.
  // money is moving in both directions. One-sided balances already equal the
  // net figure above, so the line would just repeat it.
  const showGrossSplit = owedGross > 0 && oweGross > 0;

  // One stable label, not the adaptive "You're owed" / "You owe": those
  // collide word-for-word with the gross split line below, which carries a
  // different number. Direction rides on the sign and colour instead (same
  // convention as BalanceRow).
  const netSign = net > 0 ? '+' : net < 0 ? '−' : '';
  const balance = {
    label: 'Your balance',
    text: `${netSign}${formatCurrency(Math.abs(net))}`,
    className: net > 0 ? 'text-ledger-green' : net < 0 ? 'text-debt-red' : 'text-ink-forest/70',
  };

  const cells = [
    { label: 'You paid', text: formatCurrency(paid), className: 'text-ink-forest' },
    { label: 'Your share', text: formatCurrency(share), className: 'text-ink-forest' },
    balance,
  ];

  return (
    <section
      aria-label="Your position in this group"
      className="mx-4 mt-4 grid grid-cols-3 rounded-[12px] border border-ledger-green/20 bg-ledger-paper px-1 py-2.5 sm:mx-6"
    >
      {cells.map((cell) => (
        <div key={cell.label} className="min-w-0 px-3">
          {/* Drops a step on the narrowest phones so three labels still sit
              on one line each at 360px. */}
          <p className="whitespace-nowrap font-sans text-[0.8125rem] text-ink-forest/70 sm:text-label">{cell.label}</p>
          <p className={`mt-0.5 truncate font-sans text-row-amount font-medium tabular-nums ${cell.className}`}>
            {cell.text}
          </p>
        </div>
      ))}
      {showGrossSplit && (
        <div className="col-span-3 mx-3 mt-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-ledger-green/20 pt-2 font-sans text-[0.8125rem]">
          <span className="flex items-center gap-1.5 text-ledger-green">
            <FlowArrow variant="in" />
            <span className="font-medium tabular-nums">{formatCurrency(owedGross)}</span>
            <span className="text-ink-forest/60">to you</span>
          </span>
          <span aria-hidden="true" className="h-3 w-px bg-ledger-green/25" />
          <span className="flex items-center gap-1.5 text-debt-red">
            <FlowArrow variant="out" />
            <span className="font-medium tabular-nums">{formatCurrency(oweGross)}</span>
            <span className="text-ink-forest/60">you owe</span>
          </span>
        </div>
      )}
    </section>
  );
}
