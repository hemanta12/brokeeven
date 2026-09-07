import { useState, type ChangeEvent, type FormEvent } from "react";

import { Button } from "../../components/Button";
import { hueFor } from "../../components/Avatar";
import { ErrorState } from "../../shared/RouteStates";
import { useRenamePerson, useUpdatePaymentHandle } from "./api";
import type { Person } from "./types";

function TrashGlyph() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-3.5 w-3.5"
    >
      <path
        d="M4.5 6h11M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6M6 6l.6 8.6A1.5 1.5 0 0 0 8.1 16h3.8a1.5 1.5 0 0 0 1.5-1.4L14 6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface EditPersonFormProps {
  code: string;
  person: Person;
  onRemove?: () => void;
  removePending?: boolean;
  removeError?: string;
}

const SAVED_MESSAGE_MS = 3000;

interface InlineFieldRowProps {
  id: string;
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  maxLength: number;
  placeholder?: string;
  saveLabel: string;
  disabled: boolean;
}

// Compact counterpart to `Field`: label, input, and save button on one row.
// Used where `Field`'s label-above layout would triple the row count in a
// list repeated per member.
function InlineFieldRow({
  id,
  label,
  value,
  onChange,
  maxLength,
  placeholder,
  saveLabel,
  disabled,
}: InlineFieldRowProps) {
  return (
    <div className="flex items-center gap-2 rounded-inner border border-line-strong bg-[var(--field-bg,var(--color-surface))] py-1 pl-3 pr-1.5">
      <label
        htmlFor={id}
        className="shrink-0 font-sans text-label font-medium text-dim"
      >
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        placeholder={placeholder}
        className="focus-ring min-w-0 flex-1 rounded-inner bg-transparent py-1.5 font-sans text-body text-ink placeholder:text-label placeholder:text-dim"
      />
      <button
        type="submit"
        aria-label={saveLabel}
        disabled={disabled}
        className="focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink text-ink transition-transform hover:bg-sunken active:scale-90 disabled:cursor-not-allowed disabled:opacity-30"
      >
        ✓
      </button>
    </div>
  );
}

// Name and payment handle each have their own save action. Edit mode itself
// is exited via the panel's top-level toggle, not from this card.
export function EditPersonForm({
  code,
  person,
  onRemove,
  removePending,
  removeError,
}: EditPersonFormProps) {
  const renamePerson = useRenamePerson(code);
  const updateHandle = useUpdatePaymentHandle(code);
  const [name, setName] = useState(person.name);
  const [handle, setHandle] = useState(person.paymentHandle ?? "");
  // 250ms background pulse (DESIGN_SYSTEM.md §6) plus a longer-lived "Saved"
  // line, since a successful save otherwise changes nothing visible. One pair
  // of timers covers both fields — only one save button can be pressed at a time.
  const [justSaved, setJustSaved] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  // Two-step inline confirm for remove (not confirm(), not a modal).
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  function flashSaved() {
    setJustSaved(true);
    setShowSavedMessage(true);
    setTimeout(() => setJustSaved(false), 250);
    setTimeout(() => setShowSavedMessage(false), SAVED_MESSAGE_MS);
  }

  async function handleNameSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || name === person.name) return;
    await renamePerson.mutateAsync({ id: person.id, name });
    flashSaved();
  }

  async function handleHandleSubmit(event: FormEvent) {
    event.preventDefault();
    if (handle.trim() === (person.paymentHandle ?? "")) return;
    await updateHandle.mutateAsync({ id: person.id, paymentHandle: handle });
    flashSaved();
  }

  if (confirmingRemove) {
    return (
      // Message on its own line, buttons below — same shape as Overlay's
      // discard-confirm dialog, so a long name never has to share a row with
      // both buttons.
      <div className="flex flex-col gap-2 rounded-card border border-line-strong bg-surface p-3">
        <p className="font-sans text-label font-medium text-ink">
          Remove {person.name}?
        </p>
        <div className="flex gap-2">
          <Button
            variant="tertiary"
            size="sm"
            className="flex-1"
            onClick={() => setConfirmingRemove(false)}
            disabled={removePending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            danger
            size="sm"
            className="flex-1"
            onClick={onRemove}
            disabled={removePending}
          >
            {removePending ? "Removing…" : "Remove"}
          </Button>
        </div>
        {removeError && <ErrorState message={removeError} />}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={`Edit ${person.name}`}
      // Same hue as this person's Avatar (hueFor), so adjacent cards don't
      // need their own separate palette to read as distinct.
      style={{ borderLeftColor: hueFor(person.name) }}
      className={`relative flex flex-col gap-2 rounded-card border border-line-strong border-l-6 bg-surface p-3 transition-colors duration-[250ms] ease-out motion-reduce:transition-none ${justSaved ? "bg-accent/25" : ""}`}
    >
      {/* Reserves space for the corner remove button on this row only —
          Handle's row below needs the full width more. */}
      <form
        onSubmit={handleNameSubmit}
        className={onRemove ? "pr-9" : undefined}
      >
        <InlineFieldRow
          id={`person-name-${person.id}`}
          label="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={60}
          saveLabel="Save name"
          disabled={
            renamePerson.isPending || !name.trim() || name === person.name
          }
        />
      </form>

      {/* Same border-l treatment as ExpenseDetail's description. Kept small —
          Handle needs its width more than Name does (ids and links run
          longer than first names). */}
      <form
        onSubmit={handleHandleSubmit}
        className="ml-2 border-l-2 border-line pl-2"
      >
        <InlineFieldRow
          id={`person-handle-${person.id}`}
          label="Handle (opt)"
          value={handle}
          onChange={(event) => setHandle(event.target.value)}
          maxLength={100}
          placeholder="Venmo, Zelle, eSewa id…"
          saveLabel="Save handle"
          disabled={
            updateHandle.isPending ||
            handle.trim() === (person.paymentHandle ?? "")
          }
        />
      </form>

      {showSavedMessage && (
        <p
          aria-live="polite"
          className="font-sans text-label font-medium text-accent"
        >
          ✓ Saved
        </p>
      )}
      {renamePerson.isError && (
        <ErrorState message={renamePerson.error.message} />
      )}
      {updateHandle.isError && (
        <ErrorState message={updateHandle.error.message} />
      )}

      {/* Absolutely positioned, not a flex sibling of the field rows: a flex
          sibling costs its width against every row's line, not just the one
          it sits beside. */}
      {onRemove && (
        <button
          type="button"
          onClick={() => setConfirmingRemove(true)}
          aria-label={`Remove ${person.name}`}
          className="focus-ring absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-down/10 text-down transition-transform hover:bg-down/20 active:scale-90"
        >
          <TrashGlyph />
        </button>
      )}
    </div>
  );
}
