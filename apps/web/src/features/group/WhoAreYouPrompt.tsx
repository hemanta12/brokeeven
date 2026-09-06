import { useState, type FormEvent } from 'react';

import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { Overlay } from '../../shared/Overlay';
import { setIdentity } from '../../shared/identity';
import { ErrorState } from '../../shared/RouteStates';
import { useBlurValidation } from '../../shared/useBlurValidation';
import { claimPerson } from '../auth/api';
import { useAddPerson } from './api';
import type { Person } from './types';

interface WhoAreYouPromptProps {
  code: string;
  people: Person[];
  onClose: () => void;
}

// First-visit "who are you" identification (APP_FLOW §2.5). Fully skippable via
// the overlay's one-X close; picking a name or adding yourself both close it too.
export function WhoAreYouPrompt({ code, people, onClose }: WhoAreYouPromptProps) {
  const addPerson = useAddPerson(code);
  const [touched, setTouched] = useState(false);
  const [name, setName] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { touch, isRequiredError } = useBlurValidation();

  function pickExisting(personId: string) {
    setIdentity(code, personId);
    // Links this person to the session too, so the choice survives a new
    // device once signed in. Deliberately not awaited: the overlay should
    // close instantly, and a failed claim costs nothing locally.
    void claimPerson(personId);
    onClose();
  }

  async function handleAddSelf(event: FormEvent) {
    event.preventDefault();
    const person = await addPerson.mutateAsync({ code, name });
    setIdentity(code, person.id);
    void claimPerson(person.id);
    onClose();
  }

  return (
    <Overlay title="Who are you?" isDirty={touched} onClose={onClose} closeLabel="Just looking">
      {people.length > 0 && (
        <>
          <ul className="flex flex-col gap-2">
            {people.map((person) => {
              const isSelected = selectedId === person.id;
              return (
                <li key={person.id}>
                  {/* Same selection model as the split rows in sketch 012:
                      wash fill plus an accent border, with the control on the
                      right, so selection survives with the tick covered. */}
                  <label
                    className={`focus-ring flex min-h-13 cursor-pointer items-center gap-2.5 rounded-inner border px-3 py-2 font-sans text-body font-medium text-ink transition-colors duration-100 ${
                      isSelected
                        ? 'border-accent bg-accent-wash'
                        : 'border-line bg-[var(--field-bg,var(--color-surface))] hover:border-line-strong'
                    }`}
                  >
                    <input
                      type="radio"
                      name="who-are-you"
                      checked={isSelected}
                      onChange={() => setSelectedId(person.id)}
                      className="sr-only"
                    />
                    <Avatar name={person.name} />
                    <span className="min-w-0 flex-1 truncate">{person.name}</span>
                    <span
                      aria-hidden="true"
                      className={`grid size-5.5 shrink-0 place-items-center rounded-full border-[1.75px] ${
                        isSelected ? 'border-accent bg-accent' : 'border-line-strong'
                      }`}
                    >
                      {isSelected && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="size-3 text-surface">
                          <path d="M4 12.5l5.5 5.5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <Button className="mt-3 h-12 w-full" disabled={!selectedId} onClick={() => selectedId && pickExisting(selectedId)}>
            Continue
          </Button>
        </>
      )}
      <form onSubmit={handleAddSelf} className="mt-4 flex flex-col gap-3">
        <Field
          id="who-are-you-name"
          label="Not listed? Add yourself"
          value={name}
          onChange={(event) => {
            setTouched(true);
            setName(event.target.value);
          }}
          onBlur={() => touch('name')}
          autoComplete="name"
          autoCorrect="off"
          autoCapitalize="words"
          error={isRequiredError('name', name) ? 'Name is required.' : undefined}
          required
        />
        {addPerson.isError && <ErrorState message={addPerson.error.message} />}
        <Button type="submit" disabled={addPerson.isPending}>
          {addPerson.isPending ? 'Adding…' : 'Add me'}
        </Button>
      </form>
    </Overlay>
  );
}
