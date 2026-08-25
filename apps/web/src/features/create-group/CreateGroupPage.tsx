import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

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

  async function handleCreateGroup(event: FormEvent) {
    event.preventDefault();
    const created = await createGroup.mutateAsync({ name, label: label.trim() || undefined });
    setGroup(created);
  }

  async function handleAddPerson(event: FormEvent) {
    event.preventDefault();
    if (!group || !personName.trim()) return;
    const person = await addPerson.mutateAsync({ code: group.joinCode, name: personName });
    setPeople((current) => [...current, person]);
    setPersonName('');
  }

  async function handleRemovePerson(personId: string) {
    await removePerson.mutateAsync(personId);
    setPeople((current) => current.filter((person) => person.id !== personId));
  }

  if (!group) {
    return (
      <main>
        <h1 className="font-display text-display font-semibold tracking-[-0.025em] leading-[1.15] text-ink-forest">Create a Group</h1>
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
      <button
        type="button"
        onClick={() => navigate('/create', { replace: true })}
        className="focus-ring font-sans text-body font-medium text-ink-forest hover:underline active:opacity-70"
      >
        ‹ Back
      </button>

      <h1 className="mt-6 font-display text-display font-semibold tracking-[-0.025em] leading-[1.15] text-ink-forest">Add people to {group.name}</h1>

      <div className="mt-6 flex flex-col gap-4">
        <Field id="group-name-readonly" label="Group name" value={group.name} readOnly />
        <Field id="group-label-readonly" label="Label" value={group.label ?? ''} readOnly />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <span className="font-sans text-label font-medium text-ink-forest">Add people to this group</span>
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
            aria-label="Add person"
            disabled={addPerson.isPending}
            className="h-11! w-11! shrink-0 rounded-full! p-0!"
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
                  className="focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-debt-red/10 text-debt-red hover:bg-debt-red/20 active:scale-90"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="font-sans text-label text-ink-forest/70">{people.length} people added</p>
      </div>

      <Button className="mt-6 h-[52px] w-full" onClick={() => navigate(`/g/${group.joinCode}`)}>
        Continue to group
      </Button>
    </main>
  );
}
