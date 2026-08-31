import { useState, type FormEvent } from 'react';

import { ErrorState } from '../../shared/RouteStates';
import { useRenamePerson } from './api';
import type { Person } from './types';

interface EditPersonFormProps {
  code: string;
  person: Person;
  onRemove?: () => void;
  removePending?: boolean;
  removeError?: string;
}

const SAVED_MESSAGE_MS = 3000;

// Inline replacement for the chip while renaming — not a modal, since
// changing one person's name doesn't warrant leaving the group view. Exiting
// edit mode happens via the top-level toggle, not from this row.
export function EditPersonForm({ code, person, onRemove, removePending, removeError }: EditPersonFormProps) {
  const renamePerson = useRenamePerson(code);
  const [name, setName] = useState(person.name);
  // Saving alone leaves nothing visibly different on screen — the input
  // already shows the name that was just typed. The background borrows the
  // app's existing realtime-pulse color for the same one-shot 250ms
  // (DESIGN_SYSTEM.md §6) it uses everywhere else; the text message runs on
  // its own longer timer since a status line needs real dwell time to read,
  // not a motion-cue duration.
  const [justSaved, setJustSaved] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  // Trash tap asks first — removing a person isn't reversible from here (the
  // API's own guard aside), so it gets the same two-step pattern as any other
  // destructive action, inline rather than a browser confirm() or a modal.
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    await renamePerson.mutateAsync({ id: person.id, name });
    setJustSaved(true);
    setShowSavedMessage(true);
    setTimeout(() => setJustSaved(false), 250);
    setTimeout(() => setShowSavedMessage(false), SAVED_MESSAGE_MS);
  }

  if (confirmingRemove) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex w-full items-center gap-2">
          <p className="min-w-0 flex-1 truncate font-sans text-label font-medium text-ink-forest">
            Remove {person.name}?
          </p>
          <button
            type="button"
            onClick={() => setConfirmingRemove(false)}
            disabled={removePending}
            className="focus-ring h-9 shrink-0 rounded-full px-3 font-sans text-label font-medium text-ink-forest transition hover:bg-ink-forest/8 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={removePending}
            className="focus-ring h-9 shrink-0 rounded-full bg-debt-red px-3 font-sans text-label font-medium text-paper-white transition hover:bg-[color-mix(in_srgb,var(--color-debt-red)_88%,black)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {removePending ? 'Removing…' : 'Remove'}
          </button>
        </div>
        {removeError && <ErrorState message={removeError} />}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-1.5 rounded-lg p-1.5 -m-1.5 transition-colors duration-[250ms] ease-out motion-reduce:transition-none ${justSaved ? 'bg-ledger-green/25' : ''}`}
    >
      <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={60}
          aria-label={`Edit ${person.name}`}
          className="focus-ring h-9 min-w-0 flex-1 rounded-[10px] border border-ink-forest bg-paper-white px-3 font-sans text-body font-medium text-ink-forest"
        />
        <button
          type="submit"
          aria-label="Save name"
          disabled={renamePerson.isPending || !name.trim()}
          className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-forest text-ink-forest transition-transform hover:bg-ledger-paper active:scale-90 disabled:cursor-not-allowed disabled:opacity-45"
        >
          ✓
        </button>
        {onRemove && (
          <button
            type="button"
            onClick={() => setConfirmingRemove(true)}
            aria-label={`Remove ${person.name}`}
            className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-debt-red/10 text-debt-red transition-transform hover:bg-debt-red/20 active:scale-90 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5">
              <path
                d="M4.5 6h11M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6M6 6l.6 8.6A1.5 1.5 0 0 0 8.1 16h3.8a1.5 1.5 0 0 0 1.5-1.4L14 6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </form>
      {showSavedMessage && (
        <p aria-live="polite" className="font-sans text-label font-medium text-ledger-green">
          ✓ Saved
        </p>
      )}
      {renamePerson.isError && <ErrorState message={renamePerson.error.message} />}
    </div>
  );
}
