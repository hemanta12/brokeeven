import { useState, type FormEvent } from "react";

import { Avatar } from "../../components/Avatar";
import { Button } from "../../components/Button";
import { Field } from "../../components/Field";
import { ErrorState } from "../../shared/RouteStates";
import { Overlay } from "../../shared/Overlay";
import { useBlurValidation } from "../../shared/useBlurValidation";
import { useAddPerson, useRemovePerson } from "./api";
import { EditPersonForm } from "./EditPersonForm";
import type { Person } from "./types";

const MEMBER_CAP = 20;

interface PeoplePanelProps {
  code: string;
  people: Person[];
  identityPersonId: string | null;
  pulsingIds: Set<string>;
  // Closed group: roster view only — no add, rename, or remove.
  readOnly?: boolean;
  onClose: () => void;
}

// Own component so edit-mode, the add-person form, and the typed name unmount
// with the panel — nothing for the parent to reset.
export function PeoplePanel({ code, people, identityPersonId, pulsingIds, readOnly = false, onClose }: PeoplePanelProps) {
  const addPerson = useAddPerson(code);
  const removePerson = useRemovePerson(code);
  const { touch, untouch, isRequiredError } = useBlurValidation();

  const [isEditingMembersState, setIsEditingMembers] = useState(false);
  const isEditingMembers = isEditingMembersState && !readOnly;
  const [showAddPersonForm, setShowAddPersonForm] = useState(false);
  const [personName, setPersonName] = useState("");
  const [personHandle, setPersonHandle] = useState("");

  async function handleAddPerson(event: FormEvent) {
    event.preventDefault();
    if (!personName.trim()) return;
    try {
      await addPerson.mutateAsync({ code, name: personName, paymentHandle: personHandle });
      setPersonName("");
      setPersonHandle("");
      untouch("personName");
    } catch {
      // Rendered from addPerson.isError; the typed name (and handle) stay for a retry.
    }
  }

  return (
    <Overlay
      title="People"
      isDirty={false}
      compact
      centerTitle
      onClose={onClose}
      // A plain headerAction button, not Close's own animated exit — that
      // animation assumes the overlay unmounts once it fires, which exiting
      // edit mode doesn't do.
      headerAction={
        isEditingMembers ? (
          <Button variant="primary" size="sm" onClick={() => setIsEditingMembers(false)}>
            Done
          </Button>
        ) : undefined
      }
      hideClose={isEditingMembers}
    >
      <div className="-mt-2 flex items-center justify-between gap-3">
        <p className="font-sans text-label text-dim">{people.length} in this group</p>
        {!readOnly && !isEditingMembers && (
          <Button
            variant="tertiary"
            aria-label="Edit members"
            onClick={() => setIsEditingMembers(true)}
            disabled={showAddPersonForm}
            size="sm"
          >
            Edit
          </Button>
        )}
      </div>
      <div className="mt-3 flex flex-1 flex-col gap-3">
        <ul className={isEditingMembers ? "flex flex-col gap-3" : "flex flex-col gap-2"}>
          {people.map((person) =>
            isEditingMembers ? (
              <li key={person.id}>
                <EditPersonForm
                  code={code}
                  person={person}
                  onRemove={() => removePerson.mutate(person.id)}
                  removePending={removePerson.isPending && removePerson.variables === person.id}
                  removeError={
                    removePerson.isError && removePerson.variables === person.id
                      ? removePerson.error.message
                      : undefined
                  }
                />
              </li>
            ) : (
              <li
                key={person.id}
                className={`flex min-h-11 items-center gap-3 rounded-inner px-1 py-1 ${pulsingIds.has(person.id) ? "row-pulse" : ""}`}
              >
                <Avatar name={person.name} isYou={person.id === identityPersonId} />
                <p className="min-w-0 flex-1 truncate font-sans text-body font-medium text-ink">{person.name}</p>
                {person.paymentHandle && (
                  <p className="min-w-0 max-w-[45%] shrink-0 truncate font-mono text-label text-dim">
                    ({person.paymentHandle})
                  </p>
                )}
              </li>
            ),
          )}
        </ul>

        {readOnly ? (
          <p className="mt-auto pt-2 font-sans text-label text-dim">
            This group is closed. Reopen it to change who&apos;s in the group.
          </p>
        ) : showAddPersonForm ? (
          <form onSubmit={handleAddPerson} className="flex flex-col gap-3">
            <Field
              id="add-person-name"
              label="Name"
              value={personName}
              onChange={(event) => setPersonName(event.target.value)}
              onBlur={() => touch("personName")}
              autoComplete="name"
              autoCorrect="off"
              autoCapitalize="words"
              error={isRequiredError("personName", personName) ? "Name is required." : undefined}
              required
            />
            <Field
              id="add-person-handle"
              label="Payment handle (optional)"
              helpText="Shown to whoever settles up with them"
              value={personHandle}
              onChange={(event) => setPersonHandle(event.target.value)}
              maxLength={100}
            />
            {addPerson.isError && <ErrorState message={addPerson.error.message} />}
            <div className="flex gap-3">
              <Button type="submit" variant="secondary" disabled={addPerson.isPending} className="flex-1">
                {addPerson.isPending ? "Saving…" : "Save"}
              </Button>
              <Button
                type="button"
                variant="tertiary"
                className="flex-1"
                onClick={() => {
                  setShowAddPersonForm(false);
                  setPersonName("");
                  setPersonHandle("");
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : people.length >= MEMBER_CAP ? (
          <p className="font-sans text-label text-dim">This group is full ({MEMBER_CAP} members max).</p>
        ) : (
          !isEditingMembers && (
            <div className="mt-auto flex justify-center pt-2">
              <Button variant="secondary" onClick={() => setShowAddPersonForm(true)}>
                Add new member
              </Button>
            </div>
          )
        )}
      </div>
    </Overlay>
  );
}
