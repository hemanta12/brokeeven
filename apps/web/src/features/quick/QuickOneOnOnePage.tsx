import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { ErrorState } from '../../shared/RouteStates';
import { useCreateQuickGroup } from './api';

export function QuickOneOnOnePage() {
  const navigate = useNavigate();
  const createQuickGroup = useCreateQuickGroup();
  const [yourName, setYourName] = useState('');
  const [theirName, setTheirName] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const group = await createQuickGroup.mutateAsync({ yourName, theirName });
    navigate(`/g/${group.joinCode}`);
  }

  return (
    <main>
      <h1 className="font-display text-display font-semibold tracking-[-0.025em] leading-[1.15] text-ink-forest">Split with One Person</h1>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <Field
          id="your-name"
          label="Your name"
          value={yourName}
          onChange={(event) => setYourName(event.target.value)}
          autoComplete="name"
          autoCorrect="off"
          autoCapitalize="words"
          required
        />
        <Field
          id="their-name"
          label="Their name"
          value={theirName}
          onChange={(event) => setTheirName(event.target.value)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="words"
          required
        />
        {createQuickGroup.isError && <ErrorState message={createQuickGroup.error.message} />}
        <Button type="submit" disabled={createQuickGroup.isPending}>
          {createQuickGroup.isPending ? 'Creating…' : 'Start'}
        </Button>
      </form>
    </main>
  );
}
