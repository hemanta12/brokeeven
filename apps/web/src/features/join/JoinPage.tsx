import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

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
      <h1>Join a Group</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Group code
          <input value={code} onChange={(event) => setCode(event.target.value)} required />
        </label>
        <button type="submit">Join</button>
      </form>
    </main>
  );
}
