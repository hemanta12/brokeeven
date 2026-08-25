import { useState, type FormEvent } from 'react';

import { Button } from '../../components/Button';
import { ErrorState } from '../../shared/RouteStates';
import { useRenamePerson } from './api';
import type { Person } from './types';

interface EditPersonFormProps {
  code: string;
  person: Person;
  onDone: () => void;
}

// Inline replacement for the chip while renaming — not a modal, since
// changing one person's name doesn't warrant leaving the group view.
export function EditPersonForm({ code, person, onDone }: EditPersonFormProps) {
  const renamePerson = useRenamePerson(code);
  const [name, setName] = useState(person.name);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    await renamePerson.mutateAsync({ id: person.id, name });
    onDone();
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/* ponytail: 36px buttons stay under the 44px touch-target ideal (DESIGN_SYSTEM.md
          §10) to fit this inline row without growing it further. Upgrade path if this
          proves too fiddly on a real device: stack save/cancel below the input instead
          of beside it. */}
      <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={60}
          aria-label={`Edit ${person.name}`}
          className="focus-ring h-9 min-w-0 flex-1 rounded-full border border-ink-forest bg-paper-white px-3 font-sans text-label font-medium text-ink-forest"
        />
        <Button
          type="submit"
          aria-label="Save name"
          disabled={renamePerson.isPending || !name.trim()}
          className="h-9! w-9! shrink-0 rounded-full! p-0!"
        >
          ✓
        </Button>
        <Button
          type="button"
          variant="tertiary"
          aria-label="Cancel edit"
          onClick={onDone}
          className="h-9! w-9! shrink-0 rounded-full! p-0!"
        >
          ×
        </Button>
      </form>
      {renamePerson.isError && <ErrorState message={renamePerson.error.message} />}
    </div>
  );
}
