import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { BackButton } from '../../components/BackButton';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { MemberChip } from '../../components/MemberChip';
import { ErrorState } from '../../shared/RouteStates';
import { rememberRecentGroup } from '../../shared/recentGroups';
import { SUPPORTED_CURRENCIES, localeCurrency } from '../../shared/format';
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
  const [currency, setCurrency] = useState(localeCurrency());
  const [personName, setPersonName] = useState('');
  // mutateAsync rejects on failure; catch it or a 4xx logs an unhandled rejection.
  // The error itself renders below from createGroup.isError.
  async function handleCreateGroup(event: FormEvent) {
    event.preventDefault();
    try {
      const created = await createGroup.mutateAsync({ name, label: label.trim() || undefined, currency });
      // Signed-out creators have no server-side group list; this is what puts the
      // group on the landing page for them.
      rememberRecentGroup(created.joinCode, created.name);
      setGroup(created);
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
          <div className="flex flex-col gap-1.5">
            <label htmlFor="group-currency" className="font-sans text-label font-medium text-dim">
              Currency
            </label>
            <select
              id="group-currency"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              className="focus-ring min-h-12 rounded-inner border border-line-strong bg-[var(--field-bg,var(--color-surface))] px-3 font-sans text-body text-ink"
            >
              {SUPPORTED_CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
            <p className="text-micro text-dim">Every amount in this group shows in this currency.</p>
          </div>
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
      <h1 className="heading text-display">Add people to {group.name}</h1>

      <div className="mt-6 flex flex-col gap-3">
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
            aria-label="Save person"
            disabled={addPerson.isPending}
            className="min-h-12 shrink-0"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className="h-4 w-4">
              <path d="M4 3h9.5L17 6.5V16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
              <path d="M6.5 3v4h6V3M6 17v-5h8v5" strokeLinejoin="round" />
            </svg>
            Save
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
        Continue
      </Button>
    </main>
  );
}
