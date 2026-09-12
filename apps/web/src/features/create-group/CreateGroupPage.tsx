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
  const [copiedField, setCopiedField] = useState<'code' | 'link' | null>(null);

  async function copyText(field: 'code' | 'link', text: string) {
    await navigator.clipboard?.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  // Copying is on the way forward, not a step to notice and skip: most people never
  // save the link when the only path out of here is a plain "Continue".
  async function copyLinkAndContinue() {
    if (!group) return;
    await copyText('link', `${window.location.origin}/g/${group.joinCode}`);
    navigate(`/g/${group.joinCode}`);
  }

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

  const inviteLink = `${window.location.origin}/g/${group.joinCode}`;

  return (
    <main>
      <h1 className="heading text-display">Add people to {group.name}</h1>

      <div className="mt-5 flex flex-col gap-2 rounded-card border border-line bg-sunken px-4 py-3.5">
        <p className="font-sans text-label font-medium text-ink">Save this — it&rsquo;s how you get back in</p>
        <p className="font-sans text-micro leading-relaxed text-dim">
          Anyone with the code or link can open this group. Without an account, this browser is the only
          place it&rsquo;s remembered.
        </p>
        <div className="mt-1 flex items-center justify-between gap-3 border-t border-line pt-3">
          <span className="min-w-0">
            <span className="block font-sans text-micro text-dim">Join code</span>
            <span className="block font-mono text-section font-medium tracking-[0.04em] text-ink">
              {group.joinCode}
            </span>
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => copyText('code', group.joinCode)}
            className="w-20 shrink-0"
          >
            <span aria-live="polite">{copiedField === 'code' ? 'Copied!' : 'Copy'}</span>
          </Button>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
          <span className="min-w-0">
            <span className="block font-sans text-micro text-dim">Invite link</span>
            <span className="block break-all font-mono text-label text-dim">{inviteLink}</span>
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => copyText('link', inviteLink)}
            className="w-20 shrink-0"
          >
            <span aria-live="polite">{copiedField === 'link' ? 'Copied!' : 'Copy'}</span>
          </Button>
        </div>
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

      <Button className="mt-6 h-[52px] w-full" onClick={() => void copyLinkAndContinue()}>
        Copy link &amp; continue
      </Button>
      <button
        type="button"
        onClick={() => navigate(`/g/${group.joinCode}`)}
        className="focus-ring mx-auto mt-2 flex min-h-11 items-center rounded px-2 font-sans text-label text-dim underline hover:opacity-70"
      >
        Continue without copying
      </button>
    </main>
  );
}
