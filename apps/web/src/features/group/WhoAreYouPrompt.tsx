import { useState, type FormEvent } from 'react';

import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { Overlay } from '../../shared/Overlay';
import { setIdentity } from '../../shared/identity';
import { ErrorState } from '../../shared/RouteStates';
import { useBlurValidation } from '../../shared/useBlurValidation';
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
    onClose();
  }

  async function handleAddSelf(event: FormEvent) {
    event.preventDefault();
    const person = await addPerson.mutateAsync({ code, name });
    setIdentity(code, person.id);
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
                  <label
                    className={`focus-ring flex min-h-11 items-center gap-3 rounded-lg border px-3.5 py-3 font-sans text-body font-medium text-ink-forest ${
                      isSelected ? 'border-[1.5px] border-ink-forest bg-ledger-paper' : 'border-ink-forest/20'
                    }`}
                  >
                    <input
                      type="radio"
                      name="who-are-you"
                      checked={isSelected}
                      onChange={() => setSelectedId(person.id)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={`h-5 w-5 shrink-0 rounded-full border-2 ${isSelected ? 'border-ink-forest' : 'border-ink-forest/30'}`}
                    />
                    {person.name}
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
