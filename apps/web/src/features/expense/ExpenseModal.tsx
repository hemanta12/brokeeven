import { useState, type FormEvent } from 'react';

import { ErrorState } from '../../shared/RouteStates';
import { Overlay } from '../../shared/Overlay';
import { useBlurValidation } from '../../shared/useBlurValidation';
import type { Expense, Person, SplitMethod } from '../group/types';
import { useCreateExpense, useUpdateExpense } from './api';
import { centsToDollars, dollarsToCents, equalSplitCents } from './splitPreview';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ExpenseModalProps {
  code: string;
  people: Person[];
  identityPersonId: string | null;
  expense?: Expense;
  onClose: () => void;
}

export function ExpenseModal({ code, people, identityPersonId, expense, onClose }: ExpenseModalProps) {
  const isEdit = Boolean(expense);
  const createExpense = useCreateExpense(code);
  const updateExpense = useUpdateExpense(code);
  const mutation = isEdit ? updateExpense : createExpense;

  const [touched, setTouched] = useState(false);
  const [description, setDescription] = useState(expense?.description ?? '');
  const [amount, setAmount] = useState(expense?.amount ?? '');
  const [date, setDate] = useState(expense?.date.slice(0, 10) ?? todayIsoDate());
  const [payerId, setPayerId] = useState(
    expense?.payerId ?? (identityPersonId && people.some((p) => p.id === identityPersonId) ? identityPersonId : '')
  );
  const [splitMethod, setSplitMethod] = useState<SplitMethod>(expense?.splitMethod ?? 'equal');
  const [participantIds, setParticipantIds] = useState<string[]>(
    expense ? expense.splits.map((s) => s.personId) : people.map((p) => p.id)
  );
  const initialPercents: Record<string, string> = {};
  const initialCustoms: Record<string, string> = {};
  if (expense) {
    for (const split of expense.splits) {
      if (split.percentAtEntry) initialPercents[split.personId] = split.percentAtEntry;
      initialCustoms[split.personId] = split.amount;
    }
  }
  const [percentByPerson, setPercentByPerson] = useState<Record<string, string>>(initialPercents);
  const [customByPerson, setCustomByPerson] = useState<Record<string, string>>(initialCustoms);
  const { touch: markBlurred, isRequiredError } = useBlurValidation();

  function touch<T>(setter: (value: T) => void) {
    return (value: T) => {
      setTouched(true);
      setter(value);
    };
  }

  function toggleParticipant(personId: string) {
    setTouched(true);
    setParticipantIds((current) =>
      current.includes(personId) ? current.filter((id) => id !== personId) : [...current, personId]
    );
  }

  const amountCents = dollarsToCents(amount);
  const equalPreview = splitMethod === 'equal' ? equalSplitCents(amountCents, participantIds.length) : [];
  const percentEntered = participantIds.reduce((sum, id) => sum + (Number(percentByPerson[id]) || 0), 0);
  const customEnteredCents = participantIds.reduce((sum, id) => sum + dollarsToCents(customByPerson[id] ?? ''), 0);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (participantIds.length === 0) return;

    const splits =
      splitMethod === 'equal'
        ? participantIds.map((personId) => ({ personId }))
        : splitMethod === 'percent'
          ? participantIds.map((personId) => ({ personId, percent: Number(percentByPerson[personId]) || 0 }))
          : participantIds.map((personId) => ({ personId, amount: Number(customByPerson[personId]) || 0 }));

    const input = {
      description,
      amount: Number(amount),
      date,
      payerId,
      splitMethod,
      splits
    };

    if (isEdit && expense) {
      await updateExpense.mutateAsync({ id: expense.id, input });
    } else {
      await createExpense.mutateAsync(input);
    }
    onClose();
  }

  return (
    <Overlay title={isEdit ? 'Edit expense' : 'Add expense'} isDirty={touched} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label>
          Description
          <input
            value={description}
            onChange={(event) => touch(setDescription)(event.target.value)}
            onBlur={() => markBlurred('description')}
            required
            maxLength={200}
          />
        </label>
        {isRequiredError('description', description) && <span role="alert">Description is required.</span>}

        <div className="paid-by-date">
          <div>
            <label>
              Paid by
              <select
                value={payerId}
                onChange={(event) => touch(setPayerId)(event.target.value)}
                onBlur={() => markBlurred('payerId')}
                required
              >
                <option value="" disabled>
                  Select payer
                </option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.id === identityPersonId ? `${person.name} (you)` : person.name}
                  </option>
                ))}
              </select>
              {isRequiredError('payerId', payerId) && <span role="alert">Payer is required.</span>}
            </label>
          </div>
          <div>
            <label>
              Date
              <input type="date" value={date} onChange={(event) => touch(setDate)(event.target.value)} required />
            </label>
          </div>
        </div>

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

        <fieldset>
          <legend>Split method</legend>
          {(['equal', 'percent', 'custom'] as const).map((method) => (
            <label key={method}>
              <input
                type="radio"
                name="splitMethod"
                checked={splitMethod === method}
                onChange={() => touch(setSplitMethod)(method)}
              />
              {method === 'equal' ? 'Equal' : method === 'percent' ? 'Percent' : 'Custom'}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Participants</legend>
          {people.map((person) => {
            const checked = participantIds.includes(person.id);
            const participantIndex = participantIds.indexOf(person.id);
            return (
              <div key={person.id}>
                <label>
                  <input type="checkbox" checked={checked} onChange={() => toggleParticipant(person.id)} />
                  {person.name}
                </label>
                {checked && splitMethod === 'equal' && (
                  <span>
                    {' '}
                    {centsToDollars(equalPreview[participantIndex] ?? 0)}
                  </span>
                )}
                {checked && splitMethod === 'percent' && (
                  <label>
                    {' '}
                    %
                    <input
                      type="text"
                      inputMode="decimal"
                      value={percentByPerson[person.id] ?? ''}
                      onChange={(event) =>
                        touch(setPercentByPerson)({ ...percentByPerson, [person.id]: event.target.value })
                      }
                    />
                  </label>
                )}
                {checked && splitMethod === 'custom' && (
                  <label>
                    {' '}
                    $
                    <input
                      type="text"
                      inputMode="decimal"
                      value={customByPerson[person.id] ?? ''}
                      onChange={(event) =>
                        touch(setCustomByPerson)({ ...customByPerson, [person.id]: event.target.value })
                      }
                    />
                  </label>
                )}
                {!checked && splitMethod !== 'equal' && <span> —</span>}
              </div>
            );
          })}
          {splitMethod === 'percent' && <p>Entered: {percentEntered} / 100</p>}
          {splitMethod === 'custom' && (
            <p>
              Entered: {centsToDollars(customEnteredCents)} / {amount || '0.00'}
            </p>
          )}
        </fieldset>

        {mutation.isError && <ErrorState message={mutation.error.message} />}
        <button type="submit" disabled={mutation.isPending || participantIds.length === 0}>
          {mutation.isPending ? 'Saving…' : 'Save'}
        </button>
      </form>
    </Overlay>
  );
}
