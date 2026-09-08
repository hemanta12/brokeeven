import { useState, type FormEvent } from 'react';

import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { Overlay } from '../../shared/Overlay';
import { ErrorState } from '../../shared/RouteStates';
import { vibrateConfirm } from '../../shared/haptics';
import { useBlurValidation } from '../../shared/useBlurValidation';
import { Amount } from '../../components/Amount';
import { currencySymbol, formatCurrency, formatExpenseTitle } from '../../shared/format';
import type { Expense, Person, SplitMethod } from '../group/types';
import { useCreateExpense, useUpdateExpense } from './api';
import { dollarsToCents, equalSplitCents } from './splitPreview';

const selectClassName =
  'focus-ring min-h-12 w-full rounded-inner border border-line-strong bg-[var(--field-bg,var(--color-surface))] px-3 font-sans text-body text-ink';

// Split-amount inputs: sans + tabular, not mono (mono is for money the app shows).
const inlineAmountClassName =
  'focus-ring h-11 rounded-inner border border-line-strong bg-[var(--field-bg,var(--color-surface))] px-2 font-sans text-body tabular-nums text-ink';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ExpenseModalProps {
  code: string;
  people: Person[];
  identityPersonId: string | null;
  currency: string;
  expense?: Expense;
  onClose: () => void;
}

export function ExpenseModal({ code, people, identityPersonId, currency, expense, onClose }: ExpenseModalProps) {
  const isEdit = Boolean(expense);
  const createExpense = useCreateExpense(code);
  const updateExpense = useUpdateExpense(code);
  const mutation = isEdit ? updateExpense : createExpense;

  const [touched, setTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [title, setTitle] = useState(expense ? formatExpenseTitle(expense.title) : '');
  const [description, setDescription] = useState(expense?.description ?? '');
  // Seed at two decimals so an edit shows "20.00", not raw "20" until blurred.
  const [amount, setAmount] = useState(expense ? Number(expense.amount).toFixed(2) : '');
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

  const payer = people.find((person) => person.id === payerId);
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
    <Overlay title={isEdit ? 'Edit expense' : 'Add expense'} centerTitle isDirty={touched} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
        {/* Currency symbol is a display adornment, not part of the amount value. */}
        <div className="flex flex-col gap-1.5">
          {/* Row/label match every other field; only the value inside runs larger. */}
          <div className="flex items-center gap-3">
            <label htmlFor="expense-amount" className="font-sans text-label font-medium text-ink">
              Amount
            </label>
            <div className="flex flex-1 items-baseline justify-center gap-1 rounded-inner border border-line-strong bg-[var(--field-bg,var(--color-surface))] px-3.5 py-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus">
              <span aria-hidden="true" className="font-sans text-title font-semibold tabular-nums text-dim">
                {currencySymbol(currency)}
              </span>
              <input
                id="expense-amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event) => touch(setAmount)(event.target.value)}
                onBlur={() => {
                  markBlurred('amount');
                  // Reformat on blur, not while typing — it fights the caret mid-entry.
                  if (amount.trim() !== '' && !Number.isNaN(Number(amount))) {
                    setAmount(Number(amount).toFixed(2));
                  }
                }}
                aria-invalid={isRequiredError('amount', amount)}
                aria-describedby={isRequiredError('amount', amount) ? 'expense-amount-error' : undefined}
                required
                placeholder="0.00"
                size={Math.max(amount.length, 4)}
                className="w-auto min-w-0 max-w-full border-0 bg-transparent p-0 text-center font-sans text-title font-semibold tabular-nums text-ink outline-none placeholder:text-line-strong"
              />
            </div>
          </div>
          {isRequiredError('amount', amount) && (
            <p id="expense-amount-error" className="text-right text-label text-down">
              Amount is required.
            </p>
          )}
        </div>

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
          {/* Row is decorative; a zero-opacity native <select> below is the real control. */}
          {/* Keep the select a direct child here — ExpenseModal.test.tsx walks up two parents from it. */}
          <div className="relative flex flex-col gap-1.5">
            <label htmlFor="expense-payer" className="font-sans text-label font-medium text-ink">
              Paid by
            </label>
            <div
              aria-hidden="true"
              className="flex h-12 min-w-0 items-center gap-2 rounded-inner border border-line-strong bg-[var(--field-bg,var(--color-surface))] px-2.5 font-sans text-body text-ink"
            >
              {payer ? (
                <>
                  <Avatar name={payer.name} isYou={payer.id === identityPersonId} />
                  <span className="min-w-0 flex-1 truncate">{payer.name}</span>
                </>
              ) : (
                <span className="min-w-0 flex-1 truncate text-dim">Select payer</span>
              )}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="size-4 shrink-0 text-dim">
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <select
              id="expense-payer"
              value={payerId}
              onChange={(event) => touch(setPayerId)(event.target.value)}
              onBlur={() => markBlurred('payerId')}
              required
              className="focus-ring absolute inset-x-0 bottom-0 h-12 w-full rounded-inner opacity-0"
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
            {isRequiredError('payerId', payerId) && <p className="text-label text-down">Payer is required.</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="expense-date" className="font-sans text-label font-medium text-ink">
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

        <fieldset className="flex flex-col gap-2">
          <legend className="font-sans text-label font-medium text-ink">Split method</legend>
          <div className="segmented" role="radiogroup">
            {(['equal', 'percent', 'custom'] as const).map((method) => {
              const isActive = splitMethod === method;
              return (
                <label
                  key={method}
                  data-active={isActive}
                  className="segment flex min-h-9 items-center justify-center py-2 font-sans text-label font-semibold text-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus"
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
          <legend className="font-sans text-label font-medium text-ink">Split between</legend>
          {/* Two labels, not one wrapping label — that would toggle the checkbox on the amount input too. */}
          <div className="flex flex-col gap-2">
          {people.map((person) => {
            const checked = participantIds.includes(person.id);
            const participantIndex = participantIds.indexOf(person.id);
            const boxId = `split-${person.id}`;
            return (
              <div
                key={person.id}
                data-selected={checked}
                className="flex min-h-13 items-center gap-3 rounded-inner border border-line bg-[var(--field-bg,var(--color-surface))] px-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus data-[selected=true]:border-accent data-[selected=true]:bg-accent-wash"
              >
                <input
                  id={boxId}
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleParticipant(person.id)}
                  className="sr-only"
                />
                <label
                  htmlFor={boxId}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 py-2 font-sans text-body font-medium text-ink"
                >
                  <Avatar name={person.name} isYou={person.id === identityPersonId} />
                  <span className="min-w-0 truncate">{person.name}</span>
                </label>
                {checked && splitMethod === 'equal' && (
                  <Amount value={(equalPreview[participantIndex] ?? 0) / 100} currency={currency} className="text-row-amount" />
                )}
                {checked && splitMethod === 'percent' && (
                  <label className="flex items-center gap-1 font-sans text-body text-ink">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={percentByPerson[person.id] ?? ''}
                      onChange={(event) =>
                        touch(setPercentByPerson)({ ...percentByPerson, [person.id]: event.target.value })
                      }
                      className={`${inlineAmountClassName} w-16`}
                    />
                    %
                  </label>
                )}
                {checked && splitMethod === 'custom' && (
                  <label className="flex items-center gap-1 font-sans text-body text-ink">
                    {currencySymbol(currency)}
                    <input
                      type="text"
                      inputMode="decimal"
                      value={customByPerson[person.id] ?? ''}
                      onChange={(event) =>
                        touch(setCustomByPerson)({ ...customByPerson, [person.id]: event.target.value })
                      }
                      className={`${inlineAmountClassName} w-20`}
                    />
                  </label>
                )}
                {!checked && splitMethod !== 'equal' && <span className="text-dim">&middot;</span>}
                <label
                  htmlFor={boxId}
                  aria-hidden="true"
                  className={`grid size-5.5 shrink-0 cursor-pointer place-items-center rounded-full border-[1.75px] ${
                    checked ? 'border-accent bg-accent' : 'border-line-strong'
                  }`}
                >
                  {checked && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="size-3 text-surface">
                      <path d="M4 12.5l5.5 5.5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </label>
              </div>
            );
          })}
          </div>
          {splitMethod === 'percent' && (
            <p className={`font-sans text-label ${percentMismatch && submitAttempted ? 'text-down' : 'text-dim'}`}>
              Entered: {percentEntered} / 100{percentMismatch && submitAttempted ? ', must add up to 100%' : ''}
            </p>
          )}
          {splitMethod === 'custom' && (
            <p className={`font-sans text-label ${customMismatch && submitAttempted ? 'text-down' : 'text-dim'}`}>
              Entered: {formatCurrency(customEnteredCents / 100, currency)} / {formatCurrency(amountCents / 100, currency)}
              {customMismatch && submitAttempted ? ', must add up to the total' : ''}
            </p>
          )}
        </fieldset>

        {mutation.isError && <ErrorState message={mutation.error.message} />}
        <div className="modal-footer">
          <Button type="submit" size="lg" disabled={mutation.isPending || participantIds.length === 0}>
            {mutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Save expense'}
          </Button>
        </div>
      </form>
    </Overlay>
  );
}
