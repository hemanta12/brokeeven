import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../../components/Button';
import { Field } from '../../components/Field';

export function JoinPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    navigate(`/g/${trimmed.toUpperCase()}`);
  }

  return (
    <main>
      <h1 className="font-display text-display font-semibold tracking-[-0.025em] leading-[1.15] text-ink-forest">Join a Group</h1>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <Field
          id="join-code"
          label="Group code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="characters"
          inputMode="text"
          required
        />
        <Button type="submit">Join</Button>
      </form>
    </main>
  );
}
