import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <main>
      <h1>BrokeEven</h1>
      <p>Shared expenses, without the paywall.</p>
      <nav>
        <Link to="/create">Create a Group</Link>
        <Link to="/quick">Split with one person</Link>
        <Link to="/join">Join with a code</Link>
      </nav>
    </main>
  );
}
