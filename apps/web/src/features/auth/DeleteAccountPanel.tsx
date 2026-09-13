import { useState } from 'react';

import { Button } from '../../components/Button';
import { ErrorState } from '../../shared/RouteStates';
import { useDeleteAccount, useOwnedGroups } from './api';

interface DeleteAccountPanelProps {
  onCancel: () => void;
  onDeleted: () => void;
}

function FactList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="font-sans text-label font-medium text-ink">{title}</p>
      <ul className="mt-1.5 list-disc space-y-1 pl-5 font-sans text-label text-dim">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

// Stacked on the Profile overlay, so Cancel lands back on Profile.
export function DeleteAccountPanel({ onCancel, onDeleted }: DeleteAccountPanelProps) {
  const owned = useOwnedGroups();
  const deleteAccount = useDeleteAccount();
  const [transfers, setTransfers] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);

  const groups = owned.data?.groups ?? [];
  const handoffs = groups.filter((group) => group.candidates.length > 0);
  const soloGroups = groups.filter((group) => group.candidates.length === 0);
  const ready = owned.isSuccess && handoffs.every((group) => transfers[group.id]);

  return (
    <div className="flex flex-col gap-5">
      <FactList title="Removed" items={['Your name and email', 'Your Google sign-in']} />
      <FactList
        title="Kept for your groups"
        items={['Expenses and balances, so others can still settle up', 'Your name on past entries']}
      />

      {owned.isPending && <p className="font-sans text-label text-dim">Checking your groups…</p>}
      {owned.isError && <ErrorState message={owned.error.message} />}

      {handoffs.length > 0 && (
        <section className="flex flex-col gap-3 rounded-card bg-sunken px-4 py-3.5">
          <div>
            <p className="font-sans text-label font-medium text-ink">Pick a new owner</p>
            <p className="font-sans text-micro text-dim">Only the owner can delete a group.</p>
          </div>
          {handoffs.map((group) => {
            const picked = group.candidates.find((candidate) => candidate.id === transfers[group.id]);
            return (
              <div key={group.id} className="flex flex-col gap-1.5">
                <label htmlFor={`new-owner-${group.id}`} className="font-sans text-label text-ink">
                  {group.name}
                </label>
                <select
                  id={`new-owner-${group.id}`}
                  value={transfers[group.id] ?? ''}
                  onChange={(event) => setTransfers({ ...transfers, [group.id]: event.target.value })}
                  disabled={confirming}
                  className="focus-ring min-h-11 w-full rounded-inner border border-line-strong bg-surface px-3 font-sans text-body text-ink disabled:opacity-60"
                >
                  <option value="" disabled>
                    Choose a member
                  </option>
                  {group.candidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </option>
                  ))}
                </select>
                {picked && !picked.hasAccount && (
                  <p className="font-sans text-micro text-dim">
                    {picked.name} becomes owner when they open the group. Until then, no one can delete it.
                  </p>
                )}
              </div>
            );
          })}
        </section>
      )}

      {soloGroups.length > 0 && (
        <section className="rounded-card border border-down/30 bg-down/5 px-4 py-3.5">
          <FactList
            title="Also deleted (you're the only member)"
            items={soloGroups.map((group) => group.name)}
          />
        </section>
      )}

      {confirming ? (
        <div role="alert" className="flex flex-col gap-3 rounded-card border border-down/30 bg-down/5 px-4 py-3.5">
          <div>
            <p className="font-sans text-body font-semibold text-ink">Delete your account for good?</p>
            <p className="font-sans text-micro text-dim">This can't be undone.</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="tertiary"
              className="flex-1"
              onClick={() => setConfirming(false)}
              disabled={deleteAccount.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              danger
              className="flex-1"
              onClick={() => deleteAccount.mutate(transfers, { onSuccess: onDeleted })}
              disabled={deleteAccount.isPending}
            >
              {deleteAccount.isPending ? 'Deleting…' : 'Yes, delete'}
            </Button>
          </div>
          {deleteAccount.isError && <ErrorState message={deleteAccount.error.message} />}
        </div>
      ) : (
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" danger className="flex-1" disabled={!ready} onClick={() => setConfirming(true)}>
            Delete account
          </Button>
        </div>
      )}
    </div>
  );
}
