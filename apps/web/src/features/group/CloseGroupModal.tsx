import { useState, type ReactNode } from 'react';

import { Amount } from '../../components/Amount';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Overlay } from '../../shared/Overlay';
import { ErrorState } from '../../shared/RouteStates';
import { currencySymbol, formatCurrency } from '../../shared/format';
import { useCloseGroup } from './api';
import { forgiveBelow, minimizeTransactions } from './settleUp';
import type { Balance, Person } from './types';

interface CloseGroupModalProps {
  code: string;
  people: Person[];
  balances: Balance[];
  currency: string;
  defaultThreshold: string;
  onClose: () => void;
}

function PairRow({
  fromName,
  toName,
  verb,
  children
}: {
  fromName: string;
  toName: string;
  verb: string;
  children: ReactNode;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-inner bg-sunken px-3 py-2.5">
      <span className="flex min-w-0 items-center gap-2">
        <Avatar name={fromName} />
        <span className="min-w-0 truncate font-sans text-label text-ink">
          <span className="font-medium">{fromName}</span> {verb}{' '}
          <span className="font-medium">{toName}</span>
        </span>
      </span>
      <span className="shrink-0">{children}</span>
    </li>
  );
}

export function CloseGroupModal({ code, people, balances, currency, defaultThreshold, onClose }: CloseGroupModalProps) {
  const closeGroup = useCloseGroup(code);
  const [threshold, setThreshold] = useState(() => Number(defaultThreshold || 0).toFixed(2));

  const nameOf = (id: string) => people.find((person) => person.id === id)?.name ?? 'Someone';
  const parsed = Number(threshold);
  const thresholdCents = Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : 0;

  const { forgiven, remaining } = forgiveBelow(balances, thresholdCents);
  const plan = minimizeTransactions(remaining);
  // Mirrors the server gate: read off the plan, not `remaining`, since a debt
  // cycle leaves pairwise rows but needs no payment.
  const balanced = plan.length === 0;

  async function handleConfirm() {
    await closeGroup.mutateAsync(thresholdCents / 100);
    onClose();
  }

  return (
    <Overlay title="Close group" centerTitle isDirty={Number(threshold) !== Number(defaultThreshold)} onClose={onClose}>
      <div className="flex flex-1 flex-col gap-6">
        {/* Same money-at-scale shape as Add expense: the symbol is a separate
            adornment, so nothing has to be parsed back out of the field. */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="forgive-threshold" className="font-sans text-label font-medium text-ink">
            Forgive up to
          </label>
          <div className="flex items-baseline justify-center gap-1 rounded-inner border border-line-strong bg-[var(--field-bg,var(--color-surface))] px-4 py-3.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus">
            <span aria-hidden="true" className="font-sans text-section font-semibold tabular-nums text-dim">
              {currencySymbol(currency)}
            </span>
            <input
              id="forgive-threshold"
              type="text"
              inputMode="decimal"
              value={threshold}
              onChange={(event) => setThreshold(event.target.value)}
              onBlur={() => {
                if (threshold.trim() !== '' && !Number.isNaN(Number(threshold))) {
                  setThreshold(Number(threshold).toFixed(2));
                }
              }}
              placeholder="0.00"
              size={Math.max(threshold.length, 4)}
              className="w-auto min-w-0 max-w-full border-0 bg-transparent p-0 text-center font-sans text-hero-balance font-semibold tabular-nums text-ink outline-none placeholder:text-line-strong"
            />
          </div>
        </div>

        {/* Quiet block: struck, dim, no mono emphasis. This is the money that stops mattering. */}
        <section>
          <h3 className="mb-1.5 font-sans text-label font-medium text-dim">
            Written off{forgiven.length > 0 ? ` · ${forgiven.length}` : ''}
          </h3>
          {forgiven.length === 0 ? (
            <p className="font-sans text-micro text-dim">Nothing is small enough yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {forgiven.map((balance) => (
                <PairRow
                  key={`${balance.fromPersonId}:${balance.toPersonId}`}
                  fromName={nameOf(balance.fromPersonId)}
                  toName={nameOf(balance.toPersonId)}
                  verb="owed"
                >
                  <Amount
                    value={Number(balance.amount)}
                    currency={currency}
                    direction="flat"
                    className="text-label line-through"
                  />
                </PairRow>
              ))}
            </ul>
          )}
        </section>

        {/* The gate, not a footnote. A group that still needs a payment cannot
            close: closing blocks settlements, so it would strand the money. */}
        {balanced ? (
          <section className="rounded-card bg-accent-wash px-4 py-6 text-center">
            <Amount value={0} currency={currency} className="block text-zero font-semibold tracking-[-0.04em]" />
            <p className="mt-1 font-sans text-body text-dim">Even. Ready to close.</p>
          </section>
        ) : (
          <section>
            <h3 className="mb-1.5 font-sans text-label font-medium text-ink">Still to settle · {plan.length}</h3>
            <ul className="flex flex-col gap-1.5">
              {plan.map((transfer) => (
                <PairRow
                  key={`${transfer.fromPersonId}:${transfer.toPersonId}`}
                  fromName={nameOf(transfer.fromPersonId)}
                  toName={nameOf(transfer.toPersonId)}
                  verb="pays"
                >
                  <Amount
                    value={transfer.amountCents / 100}
                    currency={currency}
                    className="text-row-amount font-semibold"
                  />
                </PairRow>
              ))}
            </ul>
            <p className="mt-2 font-sans text-micro text-dim">
              A group closes at {formatCurrency(0, currency)}. Record these on the Balances tab, or raise the amount
              above to write them off.
            </p>
          </section>
        )}

        {closeGroup.isError && <ErrorState message={closeGroup.error.message} />}

        <div className="modal-footer flex-col gap-2">
          <Button size="lg" onClick={handleConfirm} disabled={closeGroup.isPending || !balanced}>
            {closeGroup.isPending ? 'Closing…' : 'Close group'}
          </Button>
          <p className="w-full text-center font-sans text-micro text-dim">
            {balanced ? 'You can reopen this later.' : `${plan.length} payment${plan.length === 1 ? '' : 's'} left.`}
          </p>
        </div>
      </div>
    </Overlay>
  );
}
