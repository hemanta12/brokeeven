import { useState, type FormEvent } from 'react';

import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { Overlay } from '../../shared/Overlay';
import { ErrorState } from '../../shared/RouteStates';
import { vibrateConfirm } from '../../shared/haptics';
import { useBlurValidation } from '../../shared/useBlurValidation';
import type { Balance, Person } from '../group/types';
import { useCreateSettlement } from './api';

const selectClassName =
  'focus-ring min-h-11 w-full rounded-lg border border-ink-forest/30 bg-[var(--field-bg,var(--color-paper-white))] px-3 font-sans text-body text-ink-forest';

interface SettleUpModalProps {
  code: string;
  people: Person[];
  balance: Balance;
  onClose: () => void;
}

// Settling a specific balance row (DESIGN_SYSTEM.md §7 — each Balance row
// owns its own Settle button) prefills From/To/Amount from that pair; all
// three stay editable per APP_FLOW §2.9.
export function SettleUpModal({ code, people, balance, onClose }: SettleUpModalProps) {
  const createSettlement = useCreateSettlement(code);

  const [touched, setTouched] = useState(false);
  const [fromPersonId, setFromPersonId] = useState(balance.fromPersonId);
  const [toPersonId, setToPersonId] = useState(balance.toPersonId);
  const [amount, setAmount] = useState(balance.amount);
  const [note, setNote] = useState('');
  const [settled, setSettled] = useState(false);
  const { touch: markBlurred, isRequiredError } = useBlurValidation();

  function touch<T>(setter: (value: T) => void) {
    return (value: T) => {
      setTouched(true);
      setter(value);
    };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
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

        {createSettlement.isError && <ErrorState message={createSettlement.error.message} />}
        <Button type="submit" disabled={createSettlement.isPending || fromPersonId === toPersonId}>
          {createSettlement.isPending ? 'Saving…' : 'Confirm'}
        </Button>
      </form>
    </Overlay>
  );
}
