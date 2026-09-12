const UPDATED = 'September 12, 2026';

export function TermsOfUsePage() {
  return (
    <main className="px-5 py-9">
      <h1 className="heading text-display">Terms of Use</h1>
      <p className="mt-1 font-sans text-micro text-dim">Last updated: {UPDATED}</p>

      <div className="mt-6 space-y-6 font-sans text-body leading-relaxed text-ink">
        <p>
          BrokeEven is a free tool for splitting shared expenses, operated by Hemanta Thapa. By using it you
          agree to these terms. Contact:{' '}
          <a href="mailto:thapahemanta.dev@gmail.com" className="underline">
            thapahemanta.dev@gmail.com
          </a>
          .
        </p>

        <section>
          <h2 className="heading text-section">The service</h2>
          <p className="mt-2">
            BrokeEven lets people track shared expenses and calculate who owes whom. It does not process,
            hold, or move any money: payment handles shown at settle time are free text for reference only.
          </p>
        </section>

        <section>
          <h2 className="heading text-section">Group access</h2>
          <p className="mt-2">
            A group is accessible to anyone with its join code. Don&apos;t share a join code with anyone you
            don&apos;t want viewing or adding to that group.
          </p>
        </section>

        <section>
          <h2 className="heading text-section">Your responsibilities</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>You&apos;re responsible for the accuracy of the expenses and amounts you enter.</li>
            <li>Don&apos;t use the service for anything illegal or to harass others.</li>
            <li>Settling up between people happens outside the app: BrokeEven only tracks the numbers.</li>
          </ul>
        </section>

        <section>
          <h2 className="heading text-section">No warranty</h2>
          <p className="mt-2">
            BrokeEven is provided &quot;as is&quot;, free of charge, with no guarantee of uptime, accuracy,
            or fitness for a particular purpose. We&apos;re not liable for disputes between people using a
            group, or for financial decisions made based on the app&apos;s numbers.
          </p>
        </section>

        <section>
          <h2 className="heading text-section">Changes</h2>
          <p className="mt-2">
            We may update these terms as the app changes. Continued use after an update means you accept the
            new terms.
          </p>
        </section>
      </div>
    </main>
  );
}
