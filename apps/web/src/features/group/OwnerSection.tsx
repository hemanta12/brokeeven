import { useState } from "react";

import { Button } from "../../components/Button";
import { ErrorState } from "../../shared/RouteStates";
import { useSetGroupOwner } from "./api";
import type { Person } from "./types";

interface OwnerSectionProps {
  code: string;
  people: Person[];
  owner: { personId: string | null; pending: boolean } | null;
  createdByUserId: string | null;
  viewerUserId: string | null;
}

// The roster's Owner tag shows who; this section is what the viewer can do about it.
export function OwnerSection({
  code,
  people,
  owner,
  createdByUserId,
  viewerUserId,
}: OwnerSectionProps) {
  const setOwner = useSetGroupOwner(code);
  const [nextOwnerId, setNextOwnerId] = useState("");
  const [confirming, setConfirming] = useState(false);

  const viewerPerson = viewerUserId
    ? people.find((person) => person.userId === viewerUserId)
    : undefined;
  const viewerOwnsGroup =
    !owner?.pending &&
    createdByUserId !== null &&
    createdByUserId === viewerUserId;
  const pendingName = owner?.pending
    ? people.find((person) => person.id === owner.personId)?.name
    : undefined;
  const nextOwner = people.find((person) => person.id === nextOwnerId);

  const status =
    owner === null
      ? viewerPerson
        ? "No owner yet. Any member can claim it."
        : "No owner yet. Pick your name in this group to claim it."
      : owner.pending
        ? `${pendingName ?? "The new owner"} becomes owner once they open the group.`
        : owner.personId === null
          ? "The owner hasn't joined as a member."
          : viewerOwnsGroup
            ? "Only the owner can delete a group."
            : "Only the owner can delete the group or pass it on.";

  return (
    <section className="flex flex-col gap-2 rounded-card bg-sunken px-4 py-3.5">
      <p className="font-sans text-label font-medium text-ink">Owner</p>
      <p className="font-sans text-micro text-dim">{status}</p>

      {owner === null && viewerPerson && (
        <Button
          variant="secondary"
          size="sm"
          className="self-start"
          disabled={setOwner.isPending}
          onClick={() => setOwner.mutate(viewerPerson.id)}
        >
          {setOwner.isPending ? "Saving…" : "Become owner"}
        </Button>
      )}

      {viewerOwnsGroup && !confirming && (
        <div className="flex items-center gap-2">
          <label htmlFor="next-owner" className="sr-only">
            New owner
          </label>
          <select
            id="next-owner"
            value={nextOwnerId}
            onChange={(event) => setNextOwnerId(event.target.value)}
            className="focus-ring min-h-11 min-w-0 flex-1 rounded-inner border border-line-strong bg-surface py-2 pl-2 pr-5 font-sans text-body text-ink"
          >
            {/* Re-picking this undoes a choice; Change owner stays disabled on it. */}
            <option value="">
              {viewerPerson
                ? `${viewerPerson.name} (current owner)`
                : "Keep current owner"}
            </option>
            {people
              .filter((person) => person.id !== viewerPerson?.id)
              .map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
          </select>
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            disabled={!nextOwner}
            onClick={() => setConfirming(true)}
          >
            Change owner
          </Button>
        </div>
      )}

      {confirming && nextOwner && (
        <div
          role="alert"
          className="flex flex-col gap-2 border-t border-line pt-3"
        >
          <p className="font-sans text-label font-medium text-ink">
            Make {nextOwner.name} the owner?
          </p>
          <p className="font-sans text-micro text-dim">
            {nextOwner.userId
              ? "You won't be able to delete this group or change its owner after this."
              : `${nextOwner.name} becomes owner once they open the group. Until then, no one can delete it or change its owner.`}
          </p>
          <div className="flex gap-2">
            <Button
              variant="tertiary"
              size="sm"
              className="flex-1"
              disabled={setOwner.isPending}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              disabled={setOwner.isPending}
              onClick={() =>
                setOwner.mutate(nextOwner.id, {
                  onSuccess: () => {
                    setConfirming(false);
                    setNextOwnerId("");
                  },
                })
              }
            >
              {setOwner.isPending ? "Saving…" : "Make owner"}
            </Button>
          </div>
        </div>
      )}

      {setOwner.isError && <ErrorState message={setOwner.error.message} />}
    </section>
  );
}
