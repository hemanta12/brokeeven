import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAddPerson, useCreateGroup } from '../group/api';
import type { Group, Person } from '../group/types';
import { ErrorState } from '../../shared/RouteStates';

export function CreateGroupPage() {
  const navigate = useNavigate();
  const createGroup = useCreateGroup();
  const addPerson = useAddPerson();

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

  if (!group) {
    return (
      <main>
        <h1>Create a Group</h1>
        <form onSubmit={handleCreateGroup}>
          <label>
            Group name
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label>
            Label (optional)
            <input value={label} onChange={(event) => setLabel(event.target.value)} />
          </label>
          {createGroup.isError && <ErrorState message={createGroup.error.message} />}
          <button type="submit" disabled={createGroup.isPending}>
            {createGroup.isPending ? 'Creating…' : 'Create group'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main>
      <h1>Add people to {group.name}</h1>
      <ul>
        {people.map((person) => (
          <li key={person.id}>{person.name}</li>
        ))}
      </ul>
      <form onSubmit={handleAddPerson}>
        <label>
          Name
          <input value={personName} onChange={(event) => setPersonName(event.target.value)} required />
        </label>
        {addPerson.isError && <ErrorState message={addPerson.error.message} />}
        <button type="submit" disabled={addPerson.isPending}>
          Add person
        </button>
      </form>
      <button type="button" onClick={() => navigate(`/g/${group.joinCode}`)}>
        Continue to group
      </button>
    </main>
  );
}
