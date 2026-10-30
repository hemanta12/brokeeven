import { Check, ChevronDown } from 'lucide-react';
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
import { cleanAmountInput, dateTileParts, parsePastedAmount, todayIsoDate } from './expenseForm';
import { dollarsToCents, equalSplitCents } from './splitPreview';

// Split-amount inputs: sans + tabular, not mono (mono is for money the app shows).
const inlineAmountClassName =
  'focus-ring h-11 rounded-inner border border-line-strong bg-[var(--field-bg,var(--color-surface))] px-2 font-sans text-body tabular-nums text-ink';

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
  const { touch: markBlurred, isTouched, isRequiredError } = useBlurValidation();

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

  const allSelected = participantIds.length === people.length;
  const amountMissing = isRequiredError('amount', amount);
  const amountNotPositive = isTouched('amount') && amount.trim() !== '' && !(Number(amount) > 0);
  const amountError = amountMissing ? 'Amount is required.' : amountNotPositive ? 'Enter an amount above 0.' : undefined;
  const amountSizeClass = amount.length > 11 ? 'text-title' : amount.length > 8 ? 'text-hero-balance' : 'text-display';
  const dateParts = dateTileParts(date);

  function toggleEveryone() {
    setTouched(true);
    setParticipantIds(allSelected ? [] : people.map((p) => p.id));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!(Number(amount) > 0)) {
      markBlurred('amount');
      return;
    }
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

  const focusWithin =
    'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus';

  return (
    <Overlay title={isEdit ? 'Edit expense' : 'Add expense'} centerTitle isDirty={touched} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-3">
        <div className="flex flex-col gap-2">
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
            hideLabel
            placeholder="Description (optional)"
            value={description}
            onChange={(event) => touch(setDescription)(event.target.value)}
            maxLength={1000}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          {/* Below 360px the date tile drops under the amount (UIUX_rules #3). */}
          <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-[minmax(0,1fr)_5.25rem]">
            <div className={`flex min-w-0 flex-col rounded-inner border border-accent bg-[var(--field-bg,var(--color-surface))] px-3 pt-3 pb-2 ${focusWithin}`}>
              <label htmlFor="expense-amount" className="font-sans text-micro font-medium leading-4 text-accent">
                Amount
              </label>
              {/* The symbol is a display adornment, not part of the amount value. */}
              <div className="flex items-baseline gap-1.5">
                <span
                  aria-hidden="true"
                  className="font-sans text-title font-semibold leading-none tabular-nums text-accent"
                >
                  {currencySymbol(currency)}
                </span>
                <input
                  id="expense-amount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={amount}
                  onChange={(event) => touch(setAmount)(cleanAmountInput(event.target.value))}
                  onPaste={(event) => {
                    if (parsePastedAmount(event.clipboardData.getData('text'), currencySymbol(currency)) === null) {
                      event.preventDefault();
                    }
                  }}
                  onBlur={() => {
                    markBlurred('amount');
                    // Reformat on blur, not while typing — it fights the caret mid-entry.
                    if (amount.trim() !== '' && Number(amount) > 0) {
                      setAmount(Number(amount).toFixed(2));
                    }
                  }}
                  aria-invalid={Boolean(amountError)}
                  aria-describedby={amountError ? 'expense-amount-error' : undefined}
                  required
                  placeholder="0.00"
                  className={`min-w-0 flex-1 border-0 bg-transparent p-0 font-sans font-semibold leading-none tracking-[-0.02em] tabular-nums text-accent outline-none placeholder:text-dim ${amountSizeClass}`}
                />
              </div>
            </div>

            <div
              className={`relative flex min-h-17 flex-col items-center justify-center rounded-inner border border-line-strong bg-[var(--field-bg,var(--color-surface))] p-1.5 ${focusWithin}`}
            >
              {dateParts ? (
                <>
                  <span
                    aria-hidden="true"
                    className="font-sans text-hero-balance font-semibold leading-none tabular-nums text-ink"
                  >
                    {dateParts.day}
                  </span>
                  <span aria-hidden="true" className="mt-1 font-sans text-micro leading-4 text-dim">
                    {dateParts.year ? `${dateParts.month} ${dateParts.year}` : dateParts.month}
                  </span>
                </>
              ) : (
                <span aria-hidden="true" className="font-sans text-label text-dim">
                  Pick date
                </span>
              )}
              <label htmlFor="expense-date" className="sr-only">
                Date
              </label>
              {/* The native input is the real control, laid invisibly over the tile so the
                  OS picker and keyboard entry both work; the tile only displays its value. */}
              <input
                id="expense-date"
                type="date"
                value={date}
                onChange={(event) => touch(setDate)(event.target.value)}
                onClick={(event) => {
                  try {
                    event.currentTarget.showPicker();
                  } catch {
                    // Unsupported, or blocked outside a user gesture: the native control still works.
                  }
                }}
                required
                className="absolute inset-0 size-full cursor-pointer opacity-0"
              />
            </div>
          </div>
          {amountError && (
            <p id="expense-amount-error" className="inline-in text-label text-down">
              {amountError}
            </p>
          )}
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Split method</legend>
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

        <div className="overflow-hidden rounded-card bg-[var(--field-bg,var(--color-surface))] shadow-card">
          {/* One tinted head for the whole card: who the split is between, and who paid. */}
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 bg-sunken px-3.5 py-1">
            <span id="split-between-label" className="font-sans text-label font-medium text-ink">
              Split between
            </span>
            <div className="flex min-w-0 items-center gap-2">
              <label htmlFor="expense-payer" className="font-sans text-label font-medium text-dim">
                Paid by
              </label>
              {/* Chip is decorative; the zero-opacity native <select> laid over it is the real control. */}
              <div className="relative flex min-h-11 min-w-0 items-center">
                <div
                  aria-hidden="true"
                  className="flex min-w-0 items-center gap-2 rounded-full bg-surface py-1 pr-2.5 pl-1 font-sans text-body font-medium text-ink"
                >
                  {payer ? (
                    <>
                      <Avatar name={payer.name} />
                      <span className="min-w-0 truncate">{payer.id === identityPersonId ? 'You' : payer.name}</span>
                    </>
                  ) : (
                    <span className="pl-2 text-dim">Select payer</span>
                  )}
                  <ChevronDown className="size-4 shrink-0 text-ink" />
                </div>
                <select
                  id="expense-payer"
                  value={payerId}
                  onChange={(event) => touch(setPayerId)(event.target.value)}
                  onBlur={() => markBlurred('payerId')}
                  required
                  className="focus-ring absolute inset-0 size-full rounded-inner opacity-0"
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
              </div>
            </div>
          </div>
          {isRequiredError('payerId', payerId) && (
            <p className="inline-in px-3.5 pt-2 text-label text-down">Payer is required.</p>
          )}

          {/* The rail ties these rows to the "Split between" head above. */}
          <div role="group" aria-labelledby="split-between-label" className="my-1 ml-5 border-l-2 border-line-strong pl-3">
            {people.map((person) => {
              const checked = participantIds.includes(person.id);
              const participantIndex = participantIds.indexOf(person.id);
              const boxId = `split-${person.id}`;
              return (
                <div
                  key={person.id}
                  className={`flex min-h-11 items-center gap-3 pr-3.5 ${focusWithin}`}
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
                    {person.id === payerId && (
                      <span className="shrink-0 font-sans text-micro font-normal text-dim">paid</span>
                    )}
                  </label>
                  {checked && splitMethod === 'equal' && amountCents > 0 && (
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
                    {checked && <Check aria-hidden="true" className="size-3 text-surface" strokeWidth={3.5} />}
                  </label>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-3 px-3.5 font-sans text-label text-dim shadow-[inset_0_1px_0_var(--color-line)]">
            <button
              type="button"
              onClick={toggleEveryone}
              aria-label={allSelected ? 'Clear all' : 'Select all'}
              className="focus-ring -ml-2 min-h-11 rounded-inner px-2 font-sans text-label font-medium text-accent"
            >
              {allSelected ? 'Clear all' : 'Select all'}
            </button>
            {splitMethod === 'equal' && (
              <span>
                {participantIds.length} of {people.length} {people.length === 1 ? 'person' : 'people'}
                {amountCents > 0 ? ` · ${formatCurrency(amountCents / 100, currency)} total` : ''}
              </span>
            )}
            {splitMethod === 'percent' && (
              <span className={percentMismatch && submitAttempted ? 'text-down' : undefined}>
                Entered: {percentEntered} / 100{percentMismatch && submitAttempted ? ', must add up to 100%' : ''}
              </span>
            )}
            {splitMethod === 'custom' && (
              <span className={customMismatch && submitAttempted ? 'text-down' : undefined}>
                Entered: {formatCurrency(customEnteredCents / 100, currency)} / {formatCurrency(amountCents / 100, currency)}
                {customMismatch && submitAttempted ? ', must add up to the total' : ''}
              </span>
            )}
          </div>
        </div>

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
