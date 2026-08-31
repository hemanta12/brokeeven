import { useState, type FormEvent } from 'react';

import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { Overlay } from '../../shared/Overlay';
import { ErrorState } from '../../shared/RouteStates';
import { vibrateConfirm } from '../../shared/haptics';
import { useBlurValidation } from '../../shared/useBlurValidation';
import { formatCurrency } from '../../shared/format';
import type { Balance, Person } from '../group/types';
import { useCreateSettlement } from './api';
import { checkOverpayment } from './overpayment';

const selectClassName =
  'focus-ring min-h-11 w-full rounded-lg border border-ink-forest/55 bg-[var(--field-bg,var(--color-paper-white))] px-3 font-sans text-body text-ink-forest';

interface SettleUpModalProps {
  code: string;
  people: Person[];
  balance: Balance;
  // Every balance in the group, not just the row this was opened from: From
  // and To stay editable, so the amount owed has to be re-derived per pair.
  balances: Balance[];
  onClose: () => void;
}

// Settling a specific balance row (DESIGN_SYSTEM.md §7 — each Balance row
// owns its own Settle button) prefills From/To/Amount from that pair; all
// three stay editable per APP_FLOW §2.9.
export function SettleUpModal({ code, people, balance, balances, onClose }: SettleUpModalProps) {
  const createSettlement = useCreateSettlement(code);

  const [touched, setTouched] = useState(false);
  const [fromPersonId, setFromPersonId] = useState(balance.fromPersonId);
  const [toPersonId, setToPersonId] = useState(balance.toPersonId);
  const [amount, setAmount] = useState(balance.amount);
  const [note, setNote] = useState('');
  const [settled, setSettled] = useState(false);
  const [confirmedOverpayment, setConfirmedOverpayment] = useState(false);
  const { touch: markBlurred, isRequiredError } = useBlurValidation();

  const nameOf = (id: string) => people.find((person) => person.id === id)?.name ?? 'they';
  const fromPersonName = nameOf(fromPersonId);
  const toPersonName = nameOf(toPersonId);

  const overpayment = checkOverpayment(balances, fromPersonId, toPersonId, amount);
  // Re-arm on every change: confirming $6,667 shouldn't silently pre-approve
  // whatever the next typo is.
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
      <Overlay title="Settle up" isDirty={false} onClose={onClose}>
        <div className="flex flex-col items-start gap-4">
          <Badge>Settled</Badge>
          <p className="font-sans text-body text-ink-forest">Recorded — balances are up to date for everyone.</p>
          <Button onClick={onClose}>Done</Button>
        </div>
      </Overlay>
    );
  }

  return (
    <Overlay title="Settle up" isDirty={touched} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="settle-from" className="font-sans text-label font-medium text-ink-forest">
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
            <p className="text-label text-debt-red">From is required.</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="settle-to" className="font-sans text-label font-medium text-ink-forest">
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
          {isRequiredError('toPersonId', toPersonId) && <p className="text-label text-debt-red">To is required.</p>}
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

        {/* Warn and let them through, rather than capping at the balance:
            paying a round number or paying ahead are both real. Naming the
            reverse debt in currency is what makes a typo obvious. */}
        {overpayment && (
          <div
            role="status"
            className="rounded-[10px] border border-brass-ui/40 bg-brass/10 px-3.5 py-3 font-sans text-label text-ink-forest"
          >
            <p className="font-medium">
              That&rsquo;s {formatCurrency(overpayment.excess)} more than the {formatCurrency(overpayment.owed)} owed.
            </p>
            <p className="mt-1 text-ink-forest/75">
              Recording it leaves {toPersonName} owing {fromPersonName} {formatCurrency(overpayment.excess)}.
            </p>
            <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2 text-ink-forest">
              <input
                type="checkbox"
                checked={confirmedOverpayment}
                onChange={(event) => setConfirmedOverpayment(event.target.checked)}
                className="focus-ring h-5 w-5 shrink-0 accent-ink-forest"
              />
              Record it anyway
            </label>
          </div>
        )}

        {createSettlement.isError && <ErrorState message={createSettlement.error.message} />}
        <Button
          type="submit"
          disabled={createSettlement.isPending || fromPersonId === toPersonId || blockedByOverpayment}
        >
          {createSettlement.isPending ? 'Saving…' : 'Confirm'}
        </Button>
      </form>
    </Overlay>
  );
}
