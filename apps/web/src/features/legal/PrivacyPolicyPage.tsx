const UPDATED = 'September 12, 2026';

export function PrivacyPolicyPage() {
  return (
    <main className="px-5 py-9">
      <h1 className="heading text-display">Privacy Policy</h1>
      <p className="mt-1 font-sans text-micro text-dim">Last updated: {UPDATED}</p>

      <div className="mt-6 space-y-6 font-sans text-body leading-relaxed text-ink">
        <p>
          BrokeEven is operated by Hemanta Thapa (&quot;we&quot;, &quot;us&quot;). This page explains what
          data BrokeEven collects, why, and how to reach us about it. Contact:{' '}
          <a href="mailto:thapahemanta.dev@gmail.com" className="underline">
            thapahemanta.dev@gmail.com
          </a>
          .
        </p>

        <section>
          <h2 className="heading text-section">What we collect</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Group and person names, expenses, amounts, payment handles (free text you type, like a
              Venmo or UPI id), and settlement records: whatever you enter into a group. Anyone with the
              group&apos;s join code can view and add to it, so this data is not private by default.
            </li>
            <li>
              If you sign in, your name, email address, profile photo, and Google&apos;s account
              identifier. We don&apos;t request any other permission from your Google account.
            </li>
            <li>
              A session cookie, set whether or not you sign in, so the app can tell which entries you
              created and let you edit them later.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="heading text-section">What we don&apos;t do</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>No analytics, ad tracking, or third-party trackers of any kind.</li>
            <li>No selling or sharing your data with third parties.</li>
            <li>No moving money: payment handles are shown as text only, and BrokeEven never processes a payment.</li>
          </ul>
        </section>

        <section>
          <h2 className="heading text-section">How long we keep it</h2>
          <p className="mt-2">
            Group data is kept until you delete it or contact us to remove it. You can delete your account
            yourself from Profile, Delete account: this removes your name, email and Google link. Groups you
            were in keep their expenses so the other members can still settle up.
          </p>
        </section>

        <section>
          <h2 className="heading text-section">Your choices</h2>
          <p className="mt-2">
            Signing in with Google is optional everywhere in the app; you can create and use groups as a
            guest. For anything else about your data, including guest data, email the address above.
          </p>
        </section>

        <section>
          <h2 className="heading text-section">Changes</h2>
          <p className="mt-2">
            If this policy changes, we&apos;ll update the date at the top of this page.
          </p>
        </section>
      </div>
    </main>
  );
}
