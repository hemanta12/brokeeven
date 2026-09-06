import { useState, type FormEvent } from "react";

import { Button } from "../../components/Button";
import { Field } from "../../components/Field";
import { MemberChip } from "../../components/MemberChip";
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
  onClose: () => void;
}

// Its own component so edit-mode, add-person-form, and the typed name never
// outlive the panel: closing it unmounts everything here and there is
// nothing left for the parent to reset by hand.
export function PeoplePanel({ code, people, identityPersonId, pulsingIds, onClose }: PeoplePanelProps) {
  const addPerson = useAddPerson(code);
  const removePerson = useRemovePerson(code);
  const { touch, untouch, isRequiredError } = useBlurValidation();

  const [isEditingMembers, setIsEditingMembers] = useState(false);
  const [showAddPersonForm, setShowAddPersonForm] = useState(false);
  const [personName, setPersonName] = useState("");

  async function handleAddPerson(event: FormEvent) {
    event.preventDefault();
    if (!personName.trim()) return;
    try {
      await addPerson.mutateAsync({ code, name: personName });
      setPersonName("");
      untouch("personName");
    } catch {
      // Rendered from addPerson.isError; the typed name stays for a retry.
    }
  }

  return (
    <Overlay title="People" isDirty={false} compact onClose={onClose}>
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="font-sans text-label text-dim">{people.length} in this group</p>
          <Button
            variant={isEditingMembers ? "primary" : "tertiary"}
            aria-label={isEditingMembers ? "Cancel editing members" : "Edit members"}
            onClick={() => setIsEditingMembers((current) => !current)}
            disabled={showAddPersonForm}
            size="sm"
            className="shrink-0"
          >
            {isEditingMembers ? "Done" : "Edit"}
          </Button>
        </div>
        <ul className="flex flex-wrap items-center gap-2">
          {people.map((person) =>
            isEditingMembers ? (
              <li key={person.id} className="w-full">
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
                className={`flex min-h-11 items-center rounded-full ${pulsingIds.has(person.id) ? "row-pulse" : ""}`}
              >
                <MemberChip name={person.name} isYou={person.id === identityPersonId} />
              </li>
            ),
          )}
        </ul>

        {showAddPersonForm ? (
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
