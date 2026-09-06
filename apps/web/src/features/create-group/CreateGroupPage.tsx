import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { BackButton } from '../../components/BackButton';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { MemberChip } from '../../components/MemberChip';
import { ErrorState } from '../../shared/RouteStates';
import { useAddPerson, useCreateGroup, useRemovePerson } from '../group/api';
import type { Group, Person } from '../group/types';

export function CreateGroupPage() {
  const navigate = useNavigate();
  const createGroup = useCreateGroup();
  const addPerson = useAddPerson();
  const removePerson = useRemovePerson(undefined);

  const [group, setGroup] = useState<Group | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [personName, setPersonName] = useState('');

  // mutateAsync rejects on failure; without catching, a 4xx surfaces as an
  // unhandled rejection in the console instead of the ErrorState already
  // rendered below from the mutation's own isError.
  async function handleCreateGroup(event: FormEvent) {
    event.preventDefault();
    try {
      setGroup(await createGroup.mutateAsync({ name, label: label.trim() || undefined }));
    } catch {
      // Rendered from createGroup.isError.
    }
  }

  async function handleAddPerson(event: FormEvent) {
    event.preventDefault();
    if (!group || !personName.trim()) return;
    try {
      const person = await addPerson.mutateAsync({ code: group.joinCode, name: personName });
      setPeople((current) => [...current, person]);
      setPersonName('');
    } catch {
      // Rendered from addPerson.isError; the name stays in the field to retry.
    }
  }

  async function handleRemovePerson(personId: string) {
    try {
      await removePerson.mutateAsync(personId);
      setPeople((current) => current.filter((person) => person.id !== personId));
    } catch {
      // Rendered from removePerson.isError.
    }
  }

  if (!group) {
    return (
      <main>
        <BackButton to="/" />

        <h1 className="mt-6 heading text-display">Create a Group</h1>
        <form onSubmit={handleCreateGroup} className="mt-6 flex flex-col gap-4">
          <Field
            id="group-name"
            label="Group name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <Field
            id="group-label"
            label="Label (optional)"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
          {createGroup.isError && <ErrorState message={createGroup.error.message} />}
          <Button type="submit" disabled={createGroup.isPending}>
            {createGroup.isPending ? 'Creating…' : 'Create group'}
          </Button>
        </form>
      </main>
    );
  }

  return (
    <main>
      <BackButton onClick={() => navigate('/create', { replace: true })} />

      <h1 className="mt-6 heading text-display">Add people to {group.name}</h1>

      <div className="mt-6 flex flex-col gap-4">
        <Field id="group-name-readonly" label="Group name" value={group.name} readOnly />
        <Field id="group-label-readonly" label="Label" value={group.label ?? ''} readOnly />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <span className="font-sans text-label font-medium text-ink">Add people to this group</span>
        <form onSubmit={handleAddPerson} className="flex items-end gap-2">
          <Field
            id="person-name"
            label="Name"
            value={personName}
            onChange={(event) => setPersonName(event.target.value)}
            autoComplete="name"
            autoCorrect="off"
            autoCapitalize="words"
            className="flex-1"
            required
          />
          <Button
            type="submit"
            variant="secondary"
            aria-label="Add person"
            disabled={addPerson.isPending}
            size="icon"
            className="shrink-0"
          >
            +
          </Button>
        </form>
        {addPerson.isError && <ErrorState message={addPerson.error.message} />}

        {people.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {people.map((person) => (
              <li key={person.id} className="inline-flex items-center gap-1">
                <MemberChip name={person.name} />
                <button
                  type="button"
                  onClick={() => handleRemovePerson(person.id)}
                  aria-label={`Remove ${person.name}`}
                  className="focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-down/10 text-down hover:bg-down/20 active:scale-90"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="font-sans text-label text-dim">{people.length} people added</p>
      </div>

      <Button className="mt-6 h-[52px] w-full" onClick={() => navigate(`/g/${group.joinCode}`)}>
        Continue to group
      </Button>
    </main>
  );
}
