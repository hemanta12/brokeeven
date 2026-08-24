import { useState, type FormEvent } from 'react';

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
      <ul>
        {people.map((person) => (
          <li key={person.id}>
            <button type="button" onClick={() => pickExisting(person.id)}>
              {person.name}
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={handleAddSelf}>
        <label>
          Not listed? Add yourself
          <input
            value={name}
            onChange={(event) => {
              setTouched(true);
              setName(event.target.value);
            }}
            onBlur={() => touch('name')}
            autoComplete="name"
            autoCorrect="off"
            autoCapitalize="words"
            required
          />
        </label>
        {isRequiredError('name', name) && <span role="alert">Name is required.</span>}
        {addPerson.isError && <ErrorState message={addPerson.error.message} />}
        <button type="submit" disabled={addPerson.isPending}>
          {addPerson.isPending ? 'Adding…' : 'Add me'}
        </button>
      </form>
    </Overlay>
  );
}
