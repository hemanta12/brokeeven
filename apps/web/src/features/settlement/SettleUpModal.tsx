import { Pencil } from 'lucide-react';
import { useState, type CSSProperties, type FormEvent } from 'react';

import { Amount } from '../../components/Amount';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { Overlay, useOverlayClose } from '../../shared/Overlay';
import { ErrorState } from '../../shared/RouteStates';
import { vibrateConfirm } from '../../shared/haptics';
import { useBlurValidation } from '../../shared/useBlurValidation';
import { formatCurrency } from '../../shared/format';
import type { Balance, Person } from '../group/types';
import { useCreateSettlement } from './api';
import { checkOverpayment, owedCents } from './overpayment';
import { paymentCopyText } from './paymentHandle';
import { SETTLE_TITLE, type SettleRole } from './settleRole';

const selectClassName =
  'focus-ring min-h-12 w-full rounded-inner border border-line-strong bg-[var(--field-bg,var(--color-surface))] px-3 font-sans text-body text-ink';

const COPIED_MESSAGE_MS = 2000;

// Field fill, not white: on desktop the sheet behind it is already white.
const cardClassName =
  'settle-card relative overflow-hidden rounded-card bg-[var(--field-bg,var(--color-surface))]';

function Faces({ from, to }: { from: string; to: string }) {
  const ring = 'ring-[3px] ring-[var(--field-bg,var(--color-surface))]';
  return (
    <div className="flex items-center justify-center">
      <Avatar name={from} size="lg" className={ring} />
      <Avatar name={to} size="lg" className={`-ml-3.5 ${ring}`} />
    </div>
  );
}

interface SettleUpModalProps {
  code: string;
  people: Person[];
  balance: Balance;
  // All balances, not just the opened row: From/To stay editable, so owed is
  // re-derived per pair.
  balances: Balance[];
  currency: string;
  // The viewer's side of the tapped row; drives wording and whether the payee's handle shows.
  role: SettleRole;
  onClose: () => void;
}

// Prefills From/To/Amount from the tapped balance row; all three stay editable
// (APP_FLOW §2.9) behind a disclosure rather than as stacked selects.
export function SettleUpModal({ code, people, balance, balances, currency, role, onClose }: SettleUpModalProps) {
  const { closeRef, close } = useOverlayClose(onClose);
  const createSettlement = useCreateSettlement(code);

  const [touched, setTouched] = useState(false);
  const [editing, setEditing] = useState(false);
  const [fromPersonId, setFromPersonId] = useState(balance.fromPersonId);
  const [toPersonId, setToPersonId] = useState(balance.toPersonId);
  const [amount, setAmount] = useState(balance.amount);
  const [note, setNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [settled, setSettled] = useState(false);
  const [confirmedOverpayment, setConfirmedOverpayment] = useState(false);
  const { touch: markBlurred, isRequiredError } = useBlurValidation();

  const nameOf = (id: string) => people.find((person) => person.id === id)?.name ?? 'they';
  const fromPersonName = nameOf(fromPersonId);
  const toPersonName = nameOf(toPersonId);
  const payeeHandle =
    role === 'pay' ? (people.find((person) => person.id === toPersonId)?.paymentHandle ?? null) : null;
  const title = SETTLE_TITLE[role];

  // Handle and amount together: what you paste into the payment app is both.
  async function copyHandle() {
    if (!payeeHandle) return;
    try {
      await navigator.clipboard.writeText(paymentCopyText(payeeHandle, amount, currency));
    } catch {
      // No clipboard (insecure origin, denied permission): the handle is on
      // screen and selectable, so there is nothing to recover from.
      return;
    }
    vibrateConfirm();
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_MESSAGE_MS);
  }

  const owedBefore = owedCents(balances, fromPersonId, toPersonId) / 100;
  const paying = Number(amount);
  const remaining = owedBefore - (Number.isFinite(paying) ? paying : 0);

  const overpayment = checkOverpayment(balances, fromPersonId, toPersonId, amount);
  // Re-arm on every change: confirming one overpayment must not pre-approve the next typo.
  const blockedByOverpayment = overpayment !== null && !confirmedOverpayment;

  function touch<T>(setter: (value: T) => void) {
    return (value: T) => {
      setTouched(true);
      setConfirmedOverpayment(false);
      setter(value);
    };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (blockedByOverpayment) return;
    await createSettlement.mutateAsync({ fromPersonId, toPersonId, amount: Number(amount), note });
    vibrateConfirm();
    setSettled(true);
  }

  if (settled) {
    return (
      <Overlay title={title} isDirty={false} onClose={onClose} closeRef={closeRef}>
        <div className="flex flex-1 flex-col justify-center gap-6 pb-10">
          <div className={`${cardClassName} receipt-in shadow-sheet`}>
            <div className="px-4 pb-4 pt-6 text-center">
              <div className="reveal" style={{ '--i': 0 } as CSSProperties}>
                <Faces from={fromPersonName} to={toPersonName} />
              </div>
              <p className="reveal mt-3 font-sans text-body text-dim" style={{ '--i': 1 } as CSSProperties}>
                {fromPersonName} paid <span className="font-semibold text-ink">{toPersonName}</span>
              </p>
              <span className="reveal mt-3 inline-block rounded-full bg-accent-wash px-4 py-1.5" style={{ '--i': 2 } as CSSProperties}>
                <Amount value={Number(amount)} currency={currency} direction="up" className="text-title font-semibold" />
              </span>
            </div>
            <div className="tear">
              <span />
            </div>
            <div className="reveal px-4 pb-6 text-center" style={{ '--i': 4 } as CSSProperties}>
              <Amount value={0} currency={currency} className="block text-zero font-semibold tracking-[-0.04em]" />
              <p className="mt-1 font-sans text-body text-dim">Even.</p>
            </div>
          </div>
          <Button size="lg" onClick={close}>
            Done
          </Button>
        </div>
      </Overlay>
    );
  }

  return (
    <Overlay title={title} isDirty={touched} onClose={onClose} closeRef={closeRef}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className={cardClassName}>
          {/* aria-label names what the pencil edits. */}
          <Button
            variant="tertiary"
            size="icon"
            aria-expanded={editing}
            aria-controls="settle-edit"
            aria-label="Change who is paying whom, or the amount"
            onClick={() => setEditing((current) => !current)}
            className="absolute right-1 top-1 text-dim aria-expanded:bg-accent-wash aria-expanded:text-accent"
          >
            <Pencil aria-hidden="true" className="size-4.5" strokeWidth={1.75} />
          </Button>

          <div className="px-4 pb-4 pt-6 text-center">
            <Faces from={fromPersonName} to={toPersonName} />
            <p className="mt-3 font-sans text-body text-dim">
              <span className="font-semibold text-ink">{fromPersonName}</span> pays{' '}
              <span className="font-semibold text-ink">{toPersonName}</span>
            </p>
            <span className="mt-3 inline-block rounded-full bg-down-wash px-4 py-1.5">
              <Amount value={Number(amount) || 0} currency={currency} direction="down" className="text-title font-semibold" />
            </span>
          </div>

          {/* Above the tear: the tear separates the payment from its consequence. */}
          <div id="settle-edit" hidden={!editing} className="flex flex-col gap-3 border-t border-line px-4 py-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="settle-from" className="font-sans text-label font-medium text-ink">
                From
              </label>
              <select
                id="settle-from"
                value={fromPersonId}
                onChange={(event) => touch(setFromPersonId)(event.target.value)}
                onBlur={() => markBlurred('fromPersonId')}
                required
                className={selectClassName}
              >
                <option value="" disabled>
                  Select person
                </option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
              {isRequiredError('fromPersonId', fromPersonId) && (
                <p className="text-label text-down">From is required.</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="settle-to" className="font-sans text-label font-medium text-ink">
                To
              </label>
              <select
                id="settle-to"
                value={toPersonId}
                onChange={(event) => touch(setToPersonId)(event.target.value)}
                onBlur={() => markBlurred('toPersonId')}
                required
                className={selectClassName}
              >
                <option value="" disabled>
                  Select person
                </option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
              {isRequiredError('toPersonId', toPersonId) && <p className="text-label text-down">To is required.</p>}
            </div>

            <Field
              id="settle-amount"
              label="Amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => touch(setAmount)(event.target.value)}
              onBlur={() => markBlurred('amount')}
              error={isRequiredError('amount', amount) ? 'Amount is required.' : undefined}
              required
            />
          </div>

          <div className="tear">
            <span />
          </div>

          <div className="flex flex-col gap-1 px-4 pb-4 font-sans text-label">
            <p className="flex items-baseline justify-between gap-3">
              <span className="text-dim">Owed before</span>
              <Amount value={owedBefore} currency={currency} className="font-medium" />
            </p>
            <p className="flex items-baseline justify-between gap-3">
              <span className="text-dim">After this</span>
              {remaining > 0 ? (
                <span className="text-right text-ink">
                  {fromPersonName} still owes {formatCurrency(remaining, currency)}
                </span>
              ) : remaining < 0 ? (
                <span className="text-right text-down">
                  {toPersonName} owes {fromPersonName} {formatCurrency(-remaining, currency)}
                </span>
              ) : (
                <span className="text-right font-medium text-ink">Even.</span>
              )}
            </p>
          </div>
        </div>

        {payeeHandle && (
          <div className="flex items-center gap-3 rounded-inner border border-line-strong px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="font-sans text-label text-dim">Pay {toPersonName} at</p>
              <p className="truncate font-mono text-body text-ink">{payeeHandle}</p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={copyHandle} className="shrink-0">
              {copied ? '✓ Copied' : 'Copy'}
            </Button>
          </div>
        )}

        <Field
          id="settle-note"
          label="Note"
          type="text"
          placeholder="Venmo, cash…"
          value={note}
          onChange={(event) => touch(setNote)(event.target.value)}
          onBlur={() => markBlurred('note')}
          error={isRequiredError('note', note) ? 'Note is required.' : undefined}
          required
        />

        {/* Warn, don't cap: paying ahead is real. Naming the reverse debt in
            currency is what makes a typo obvious. */}
        {overpayment && (
          <div
            role="status"
            className="rounded-inner border border-notice bg-notice-wash px-3.5 py-3 font-sans text-label text-ink"
          >
            <p className="font-medium">
              That&rsquo;s {formatCurrency(overpayment.excess, currency)} more than the {formatCurrency(overpayment.owed, currency)} owed.
            </p>
            <p className="mt-1 text-dim">
              Recording it leaves {toPersonName} owing {fromPersonName} {formatCurrency(overpayment.excess, currency)}.
            </p>
            <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2 text-ink">
              <input
                type="checkbox"
                checked={confirmedOverpayment}
                onChange={(event) => setConfirmedOverpayment(event.target.checked)}
                className="focus-ring h-5 w-5 shrink-0 accent-ink"
              />
              Record it anyway
            </label>
          </div>
        )}

        <p className="-mt-1 font-sans text-micro text-dim">
          {role === 'pay'
            ? `Pay ${toPersonName} in your usual app, then record it here so the balance clears for everyone.`
            : `Got the money from ${fromPersonName}? Mark it here so the balance clears for both of you.`}
        </p>

        {createSettlement.isError && <ErrorState message={createSettlement.error.message} />}
        <Button
          type="submit"
          size="lg"
          disabled={createSettlement.isPending || fromPersonId === toPersonId || blockedByOverpayment}
        >
          {createSettlement.isPending ? 'Saving…' : role === 'pay' ? `I’ve paid ${toPersonName}` : 'Mark as received'}
        </Button>
      </form>
    </Overlay>
  );
}
