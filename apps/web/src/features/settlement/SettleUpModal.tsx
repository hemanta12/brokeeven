import { useState, type FormEvent } from 'react';

import { ErrorState } from '../../shared/RouteStates';
import { Overlay } from '../../shared/Overlay';
import { useBlurValidation } from '../../shared/useBlurValidation';
import type { Balance, Person } from '../group/types';
import { useCreateSettlement } from './api';

interface SettleUpModalProps {
  code: string;
  people: Person[];
  balances: Balance[];
  onClose: () => void;
}

// Prefills From/To with the largest outstanding pair (APP_FLOW §2.9).
function largestBalance(balances: Balance[]): Balance | undefined {
  return [...balances].sort((a, b) => Number(b.amount) - Number(a.amount))[0];
}

export function SettleUpModal({ code, people, balances, onClose }: SettleUpModalProps) {
  const createSettlement = useCreateSettlement(code);
  const prefill = largestBalance(balances);

  const [touched, setTouched] = useState(false);
  const [fromPersonId, setFromPersonId] = useState(prefill?.fromPersonId ?? '');
  const [toPersonId, setToPersonId] = useState(prefill?.toPersonId ?? '');
  const [amount, setAmount] = useState(prefill?.amount ?? '');
  const [note, setNote] = useState('');
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
    onClose();
  }

  return (
    <Overlay title="Settle up" isDirty={touched} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label>
          From
          <select
            value={fromPersonId}
            onChange={(event) => touch(setFromPersonId)(event.target.value)}
            onBlur={() => markBlurred('fromPersonId')}
            required
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
        </label>
        {isRequiredError('fromPersonId', fromPersonId) && <span role="alert">From is required.</span>}
        <label>
          To
          <select
            value={toPersonId}
            onChange={(event) => touch(setToPersonId)(event.target.value)}
            onBlur={() => markBlurred('toPersonId')}
            required
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
        </label>
        {isRequiredError('toPersonId', toPersonId) && <span role="alert">To is required.</span>}
        <label>
          Amount
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(event) => touch(setAmount)(event.target.value)}
            onBlur={() => markBlurred('amount')}
            required
          />
        </label>
        {isRequiredError('amount', amount) && <span role="alert">Amount is required.</span>}
        <label>
          Note
          <input
            type="text"
            placeholder="Venmo, cash…"
            value={note}
            onChange={(event) => touch(setNote)(event.target.value)}
            onBlur={() => markBlurred('note')}
            required
          />
        </label>
        {isRequiredError('note', note) && <span role="alert">Note is required.</span>}
        {createSettlement.isError && <ErrorState message={createSettlement.error.message} />}
        <button type="submit" disabled={createSettlement.isPending || fromPersonId === toPersonId}>
          {createSettlement.isPending ? 'Saving…' : 'Confirm'}
        </button>
      </form>
    </Overlay>
  );
}
