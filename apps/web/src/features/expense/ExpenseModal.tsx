import { useState, type FormEvent } from 'react';

import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { Overlay } from '../../shared/Overlay';
import { ErrorState } from '../../shared/RouteStates';
import { vibrateConfirm } from '../../shared/haptics';
import { useBlurValidation } from '../../shared/useBlurValidation';
import { formatCurrency, formatExpenseTitle } from '../../shared/format';
import type { Expense, Person, SplitMethod } from '../group/types';
import { useCreateExpense, useUpdateExpense } from './api';
import { dollarsToCents, equalSplitCents } from './splitPreview';

const selectClassName =
  'focus-ring min-h-11 w-full rounded-lg border border-ink-forest/55 bg-[var(--field-bg,var(--color-paper-white))] px-3 font-sans text-body text-ink-forest';

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
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [title, setTitle] = useState(expense ? formatExpenseTitle(expense.title) : '');
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
  const percentMismatch = splitMethod === 'percent' && Math.round(percentEntered * 100) !== 10000;
  const customMismatch = splitMethod === 'custom' && customEnteredCents !== amountCents;
  const splitMismatch = percentMismatch || customMismatch;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (splitMismatch) {
      setSubmitAttempted(true);
      return;
    }
    if (participantIds.length === 0) return;

    const splits =
      splitMethod === 'equal'
        ? participantIds.map((personId) => ({ personId }))
        : splitMethod === 'percent'
          ? participantIds.map((personId) => ({ personId, percent: Number(percentByPerson[personId]) || 0 }))
          : participantIds.map((personId) => ({ personId, amount: Number(customByPerson[personId]) || 0 }));

    const input = {
      title,
      description: description.trim() || undefined,
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
    vibrateConfirm();
    onClose();
  }

  return (
    <Overlay title={isEdit ? 'Edit expense' : 'Add expense'} isDirty={touched} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field
          id="expense-title"
          label="Title"
          value={title}
          onChange={(event) => touch(setTitle)(event.target.value)}
          onBlur={() => markBlurred('title')}
          error={isRequiredError('title', title) ? 'Title is required.' : undefined}
          required
          maxLength={200}
        />

        <Field
          id="expense-description"
          label="Description (optional)"
          value={description}
          onChange={(event) => touch(setDescription)(event.target.value)}
          maxLength={1000}
        />

        <div className="paid-by-date">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="expense-payer" className="font-sans text-label font-medium text-ink-forest">
              Paid by
            </label>
            <select
              id="expense-payer"
              value={payerId}
              onChange={(event) => touch(setPayerId)(event.target.value)}
              onBlur={() => markBlurred('payerId')}
              required
              className={`${selectClassName} min-w-0 max-w-full box-border`}
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
            {isRequiredError('payerId', payerId) && <p className="text-label text-debt-red">Payer is required.</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="expense-date" className="font-sans text-label font-medium text-ink-forest">
              Date
            </label>
            <input
              id="expense-date"
              type="date"
              value={date}
              onChange={(event) => touch(setDate)(event.target.value)}
              required
              className={`${selectClassName} min-w-0 max-w-full box-border`}
            />
          </div>
        </div>

        <Field
          id="expense-amount"
          label="Amount"
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(event) => touch(setAmount)(event.target.value)}
          onBlur={() => markBlurred('amount')}
          error={isRequiredError('amount', amount) ? 'Amount is required.' : undefined}
          required
        />

        <fieldset className="flex flex-col gap-2">
          <legend className="font-sans text-label font-medium text-ink-forest">Split method</legend>
          <div className="segmented" role="radiogroup">
            {(['equal', 'percent', 'custom'] as const).map((method) => {
              const isActive = splitMethod === method;
              return (
                <label
                  key={method}
                  data-active={isActive}
                  className="segment flex min-h-9 items-center justify-center py-2 font-sans text-label font-semibold text-ink-forest has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brass-ui"
                >
                  <input
                    type="radio"
                    name="splitMethod"
                    checked={isActive}
                    onChange={() => touch(setSplitMethod)(method)}
                    className="sr-only"
                  />
                  {method === 'equal' ? 'Equal' : method === 'percent' ? 'Percent' : 'Custom'}
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="font-sans text-label font-medium text-ink-forest">Split between</legend>
          <div className="flex flex-col divide-y divide-ink-forest/10 rounded-[10px] bg-[var(--field-bg,var(--color-paper-white))] px-3.5">
          {people.map((person) => {
            const checked = participantIds.includes(person.id);
            const participantIndex = participantIds.indexOf(person.id);
            return (
              <div key={person.id} className="flex min-h-11 items-center justify-between gap-3 py-1.5">
                <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-2 font-sans text-body text-ink-forest">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleParticipant(person.id)}
                    className="focus-ring h-5 w-5 shrink-0 accent-ink-forest"
                  />
                  {person.name}
                </label>
                {checked && splitMethod === 'equal' && (
                  <span className="font-mono text-row-amount tabular-nums text-ink-forest">
                    {formatCurrency((equalPreview[participantIndex] ?? 0) / 100)}
                  </span>
                )}
                {checked && splitMethod === 'percent' && (
                  <label className="flex items-center gap-1 font-sans text-body text-ink-forest">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={percentByPerson[person.id] ?? ''}
                      onChange={(event) =>
                        touch(setPercentByPerson)({ ...percentByPerson, [person.id]: event.target.value })
                      }
                      className="focus-ring h-11 w-16 rounded-lg border border-ink-forest/55 bg-paper-white px-2 font-mono text-body tabular-nums text-ink-forest"
                    />
                    %
                  </label>
                )}
                {checked && splitMethod === 'custom' && (
                  <label className="flex items-center gap-1 font-sans text-body text-ink-forest">
                    $
                    <input
                      type="text"
                      inputMode="decimal"
                      value={customByPerson[person.id] ?? ''}
                      onChange={(event) =>
                        touch(setCustomByPerson)({ ...customByPerson, [person.id]: event.target.value })
                      }
                      className="focus-ring h-11 w-20 rounded-lg border border-ink-forest/55 bg-paper-white px-2 font-mono text-body tabular-nums text-ink-forest"
                    />
                  </label>
                )}
                {!checked && splitMethod !== 'equal' && <span className="text-ink-forest/40">—</span>}
              </div>
            );
          })}
          </div>
          {splitMethod === 'percent' && (
            <p className={`font-sans text-label ${percentMismatch && submitAttempted ? 'text-debt-red' : 'text-ink-forest/70'}`}>
              Entered: {percentEntered} / 100{percentMismatch && submitAttempted ? ' — must add up to 100%' : ''}
            </p>
          )}
          {splitMethod === 'custom' && (
            <p className={`font-sans text-label ${customMismatch && submitAttempted ? 'text-debt-red' : 'text-ink-forest/70'}`}>
              Entered: {formatCurrency(customEnteredCents / 100)} / {formatCurrency(amountCents / 100)}
              {customMismatch && submitAttempted ? ' — must add up to the total' : ''}
            </p>
          )}
        </fieldset>

        {mutation.isError && <ErrorState message={mutation.error.message} />}
        <Button type="submit" disabled={mutation.isPending || participantIds.length === 0}>
          {mutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add expense'}
        </Button>
      </form>
    </Overlay>
  );
}
