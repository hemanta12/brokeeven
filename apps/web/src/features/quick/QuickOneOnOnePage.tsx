import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

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
      <h1>Split with One Person</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Your name
          <input value={yourName} onChange={(event) => setYourName(event.target.value)} required />
        </label>
        <label>
          Their name
          <input value={theirName} onChange={(event) => setTheirName(event.target.value)} required />
        </label>
        {createQuickGroup.isError && <ErrorState message={createQuickGroup.error.message} />}
        <button type="submit" disabled={createQuickGroup.isPending}>
          {createQuickGroup.isPending ? 'Creating…' : 'Start'}
        </button>
      </form>
    </main>
  );
}
