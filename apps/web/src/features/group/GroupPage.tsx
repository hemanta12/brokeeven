import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";

import { BalanceRow } from "../../components/BalanceRow";
import { Button } from "../../components/Button";
import { ExpenseRow } from "../../components/ExpenseRow";
import { Field } from "../../components/Field";
import { MemberChip } from "../../components/MemberChip";
import { Tabs } from "../../components/Tabs";
import { ApiError, hasCompletedWrite } from "../../lib/apiClient";
import {
  EmptyState,
  ErrorState,
  NotFoundState,
} from "../../shared/RouteStates";
import { Overlay } from "../../shared/Overlay";
import { formatDateGroupLabel } from "../../shared/format";
import { getIdentity } from "../../shared/identity";
import { resolveIdentityPersonId } from "./ownership";
import { useBlurValidation } from "../../shared/useBlurValidation";
import { ExpenseDetail } from "../expense/ExpenseDetail";
import { ExpenseModal } from "../expense/ExpenseModal";
import { SettleUpModal } from "../settlement/SettleUpModal";
import { useAddPerson, useGroupByCode, useRemovePerson } from "./api";
import { EditPersonForm } from "./EditPersonForm";
import { groupExpensesByDate } from "./expenseGroups";
import { GroupPageSkeleton } from "./GroupPageSkeleton";
import { GroupSummary } from "./GroupSummary";
import { SettlementHistory } from "./SettlementHistory";
import { ActivityFeed } from "./ActivityFeed";
import type { Balance, Expense } from "./types";
import { useGroupRealtime } from "./useGroupRealtime";
import { WhoAreYouPrompt } from "./WhoAreYouPrompt";

const MEMBER_CAP = 20;
type Tab = "expenses" | "balances" | "activity";

function balanceKey(
  balance: Pick<Balance, "fromPersonId" | "toPersonId">,
): string {
  return `${balance.fromPersonId}:${balance.toPersonId}`;
}

export function GroupPage() {
  const { code } = useParams<{ code: string }>();
  const {
    data: group,
    isLoading,
    isError,
    error,
    refetch,
  } = useGroupByCode(code);

  const [tab, setTab] = useState<Tab>("expenses");
  const [identityPersonId, setIdentityPersonId] = useState<string | null>(() =>
    code ? getIdentity(code) : null,
  );
  const [dismissedWhoAreYou, setDismissedWhoAreYou] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showPeople, setShowPeople] = useState(false);
  const [isEditingMembers, setIsEditingMembers] = useState(false);
  const [showAddPersonForm, setShowAddPersonForm] = useState(false);
  const [personName, setPersonName] = useState("");
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | "new" | null>(
    null,
  );
  const [settlingBalance, setSettlingBalance] = useState<Balance | null>(null);
  const [copiedField, setCopiedField] = useState<"code" | "link" | null>(null);

  const addPerson = useAddPerson(code);
  const removePerson = useRemovePerson(code);
  const { touch, untouch, isRequiredError } = useBlurValidation();
  const pulsingIds = useGroupRealtime(code, group?.id);

  async function copyText(field: "code" | "link", text: string) {
    await navigator.clipboard?.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  function closeWhoAreYou() {
    setIdentityPersonId(code ? getIdentity(code) : null);
    setDismissedWhoAreYou(true);
  }

  function closePeople() {
    setShowPeople(false);
    setIsEditingMembers(false);
    setShowAddPersonForm(false);
    setPersonName("");
  }

  async function handleAddPerson(event: FormEvent) {
    event.preventDefault();
    if (!code || !personName.trim()) return;
    try {
      await addPerson.mutateAsync({ code, name: personName });
      setPersonName("");
      untouch("personName");
    } catch {
      // Rendered from addPerson.isError; the typed name stays for a retry.
    }
  }

  if (isLoading) {
    return <GroupPageSkeleton />;
  }

  if (isError) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <main>
          <NotFoundState message="Group not found — check the code and try again." />
          <p className="mt-4 font-sans text-body text-ink-forest">
            <Link to="/join" className="underline">
              Try another code
            </Link>{" "}
            or{" "}
            <Link to="/create" className="underline">
              create a new group
            </Link>
            .
          </p>
        </main>
      );
    }
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  }

  if (!group || !code) {
    return null;
  }

  // The account's claim outranks this browser's local hint. Derived per
  // render rather than written back: the claim arrives with every group
  // fetch, so mirroring it into localStorage would add a write and a way for
  // the two to drift, and buy nothing.
  const resolvedIdentityPersonId = resolveIdentityPersonId(
    group.people,
    group.viewerUserId,
    identityPersonId,
  );

  // A write always mints a session, so a still-empty viewer id here means the
  // cookie never stuck (private mode, blocked third-party cookies, an
  // extension). Their entries will be uneditable, so say so plainly.
  const cookiesBlocked = hasCompletedWrite() && group.viewerUserId === null;

  const shouldShowWhoAreYou =
    !resolvedIdentityPersonId && group.people.length > 0 && !dismissedWhoAreYou;
  const inviteLink = `${window.location.origin}/g/${code}`;

  function balanceDirection(balance: Balance): "owe" | "owed" | "neutral" {
    if (balance.fromPersonId === resolvedIdentityPersonId) return "owe";
    if (balance.toPersonId === resolvedIdentityPersonId) return "owed";
    return "neutral";
  }

  return (
    <main className="flex flex-col pt-2">
      {cookiesBlocked && (
        <p role="status" className="mx-4 mb-3 rounded-[10px] bg-ledger-paper px-3.5 py-2.5 font-sans text-label text-ink-forest/75">
          Your browser is blocking cookies, so entries you add here can&apos;t be edited later.
        </p>
      )}
      <div className="group-surface flex flex-1 flex-col rounded-[14px] bg-paper-white">
        <header className="px-4 pt-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            {group.label ? (
              <span className="inline-flex shrink-0 rounded-full border border-brass-ui px-2.5 py-0.5 font-sans text-label text-brass-ui">
                {group.label}
              </span>
            ) : (
              <span aria-hidden="true" />
            )}
            <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPeople(true)}
              aria-haspopup="dialog"
              aria-label={`People (${group.people.length})`}
              className="focus-ring flex h-11 min-h-11 items-center gap-1.5 rounded-full border border-ink-forest/20 bg-paper-white px-3 font-sans text-label font-medium text-ink-forest transition-transform duration-100 hover:bg-ledger-paper active:scale-95"
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
                className="h-4 w-4"
              >
                <circle cx="7.5" cy="7" r="2.75" />
                <path d="M2.5 16c.5-2.6 2.5-4 5-4s4.5 1.4 5 4" strokeLinecap="round" />
                <path d="M13.5 5.2a2.5 2.5 0 0 1 0 4.6M14.8 12.2c1.7.5 2.9 1.8 3.4 3.8" strokeLinecap="round" />
              </svg>
              {group.people.length}
            </button>
            <button
              type="button"
              onClick={() => setShowInfo(true)}
              aria-haspopup="dialog"
              aria-label="Group info"
              className="focus-ring flex h-11 w-11 min-h-11 shrink-0 items-center justify-center rounded-full border border-ink-forest/20 bg-paper-white text-ink-forest transition-transform duration-100 hover:bg-ledger-paper active:scale-95"
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
                className="h-[18px] w-[18px]"
              >
                <circle cx="10" cy="10" r="7.5" />
                <path d="M10 9.25v4.25" strokeLinecap="round" />
                <circle cx="10" cy="6.25" r="0.75" fill="currentColor" stroke="none" />
              </svg>
            </button>
            </div>
          </div>
          <h1 className="mt-2 heading text-display">
            {group.name}
          </h1>
        </header>

        {/* Only meaningful once the viewer has said which person they are —
            without that, none of these figures are "yours". */}
        {resolvedIdentityPersonId && (
          <GroupSummary
            balances={group.balances}
            expenses={group.expenses}
            personId={resolvedIdentityPersonId}
          />
        )}

        <div className="mt-6 px-4 sm:px-6">
          <Tabs
            label="Group view"
            items={[
              { id: "expenses", label: "Expenses" },
              { id: "balances", label: "Balances" },
              { id: "activity", label: "Activity" },
            ]}
            activeId={tab}
            onChange={(id) => setTab(id as Tab)}
          />
        </div>

        {tab === "expenses" && (
          <div
            role="tabpanel"
            id="panel-expenses"
            aria-labelledby="tab-expenses"
            className="mt-3 px-4 sm:px-6"
          >
            {group.expenses.length === 0 ? (
              <EmptyState message="No expenses yet — add the first one." />
            ) : (
              <div>
                {groupExpensesByDate(group.expenses).map((dateGroup) => (
                  <div key={dateGroup.date} className="mt-4 first:mt-0">
                    {/* Quiet organiser, not a headline — mono keeps it in the
                        ledger's data voice and distinct from the sans cards. */}
                    <h3 className="mb-1.5 font-sans text-label font-medium text-ink-forest/70">
                      {formatDateGroupLabel(dateGroup.date)}
                    </h3>
                    <ul className="flex flex-col gap-1.5">
                      {dateGroup.expenses.map((expense) => {
                        const payer = group.people.find(
                          (p) => p.id === expense.payerId,
                        );
                        return (
                          <li
                            key={expense.id}
                            className={`entry-card entry-card-tappable ${pulsingIds.has(expense.id) ? "row-pulse" : ""}`}
                          >
                            <ExpenseRow
                              title={expense.title}
                              payerName={payer?.name ?? "someone removed"}
                              payerIsViewer={expense.payerId === resolvedIdentityPersonId}
                              amount={Number(expense.amount)}
                              onClick={() => setViewingExpense(expense)}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "balances" && (
          <div
            role="tabpanel"
            id="panel-balances"
            aria-labelledby="tab-balances"
            className="mt-3 px-4 sm:px-6"
          >
            {group.balances.length === 0 ? (
              /* A fully settled group has no balances but may well have a
                 settlement to undo, so the history renders either way. */
              <EmptyState message="No balances yet — add an expense to get started." />
            ) : (
              <div>
                <ul className="flex flex-col gap-2">
                  {group.balances.map((balance) => {
                    const from = group.people.find(
                      (p) => p.id === balance.fromPersonId,
                    );
                    const to = group.people.find(
                      (p) => p.id === balance.toPersonId,
                    );
                    const key = balanceKey(balance);
                    return (
                      <li
                        key={key}
                        className={`entry-card ${pulsingIds.has(key) ? "row-pulse" : ""}`}
                      >
                        <BalanceRow
                          fromName={from?.name ?? "Someone"}
                          toName={to?.name ?? "someone"}
                          amount={Number(balance.amount)}
                          direction={balanceDirection(balance)}
                          fromIsViewer={
                            balance.fromPersonId === resolvedIdentityPersonId
                          }
                          toIsViewer={balance.toPersonId === resolvedIdentityPersonId}
                          onSettle={() => setSettlingBalance(balance)}
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <SettlementHistory
              code={code}
              settlements={group.settlements}
              people={group.people}
              identityPersonId={resolvedIdentityPersonId}
            />
          </div>
        )}

        {tab === "activity" && (
          <div
            role="tabpanel"
            id="panel-activity"
            aria-labelledby="tab-activity"
            className="mt-3 px-4 sm:px-6"
          >
            <ActivityFeed code={code} isActive={tab === "activity"} />
          </div>
        )}

        <div className="bottom-bar mt-auto">
          <Button onClick={() => setEditingExpense("new")}>
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
              className="h-4 w-4"
            >
              <path d="M10 4v12M4 10h12" strokeLinecap="round" />
            </svg>
            Add Expense
          </Button>
        </div>
      </div>

      {viewingExpense && (
        <ExpenseDetail
          expense={viewingExpense}
          people={group.people}
          identityPersonId={resolvedIdentityPersonId}
          viewerUserId={group.viewerUserId}
          onClose={() => setViewingExpense(null)}
          onEdit={() => {
            setEditingExpense(viewingExpense);
            setViewingExpense(null);
          }}
        />
      )}

      {editingExpense && (
        <ExpenseModal
          code={code}
          people={group.people}
          identityPersonId={resolvedIdentityPersonId}
          expense={editingExpense === "new" ? undefined : editingExpense}
          onClose={() => setEditingExpense(null)}
        />
      )}

      {settlingBalance && (
        <SettleUpModal
          code={code}
          people={group.people}
          balance={settlingBalance}
          balances={group.balances}
          onClose={() => setSettlingBalance(null)}
        />
      )}

      {showInfo && (
        <Overlay title="Group info" isDirty={false} compact onClose={() => setShowInfo(false)}>
          <div className="flex flex-1 flex-col gap-3">
            <div className="rounded-[12px] bg-ledger-paper px-4 py-3.5">
              <p className="font-sans text-label text-ink-forest/65">Join code</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <p className="font-mono text-section font-medium tracking-[0.08em] text-ink-forest">
                  {group.joinCode}
                </p>
                <button
                  type="button"
                  onClick={() => copyText("code", group.joinCode)}
                  aria-label={
                    copiedField === "code" ? "Join code copied" : "Copy join code"
                  }
                  className={`focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-transform duration-100 active:scale-90 ${
                    copiedField === "code"
                      ? "border-ledger-green/40 text-ledger-green"
                      : "border-ink-forest/20 text-ink-forest hover:bg-paper-white"
                  }`}
                >
                  {copiedField === "code" ? (
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      aria-hidden="true"
                      className="h-4 w-4"
                    >
                      <path
                        d="M4.5 10.5l3.5 3.5 7.5-8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                      className="h-4 w-4"
                    >
                      <rect x="7" y="7" width="9.5" height="9.5" rx="2" />
                      <path
                        d="M13 7V5.5A2.5 2.5 0 0 0 10.5 3h-5A2.5 2.5 0 0 0 3 5.5v5A2.5 2.5 0 0 0 5.5 13H7"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="rounded-[12px] bg-brass/10 px-4 py-3.5">
              <p className="font-sans text-label text-ink-forest/65">Invite link</p>
              <p className="mt-1 break-all font-mono text-label text-ink-forest/80">
                {inviteLink}
              </p>
              <Button
                variant="secondary"
                onClick={() => copyText("link", inviteLink)}
                className="mt-3"
              >
                <span aria-live="polite">
                  {copiedField === "link" ? "Copied!" : "Copy link"}
                </span>
              </Button>
            </div>
            <p className="mt-auto border-t border-ink-forest/10 pt-4 font-sans text-label text-ink-forest/60">
              Anyone with the code or link can join. Email invites are coming later.
            </p>
          </div>
        </Overlay>
      )}

      {showPeople && (
        <Overlay title="People" isDirty={false} compact onClose={closePeople}>
          <div className="flex flex-1 flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-sans text-label text-ink-forest/65">
                {group.people.length} in this group
              </p>
              <Button
                variant={isEditingMembers ? "primary" : "tertiary"}
                aria-label={
                  isEditingMembers ? "Cancel editing members" : "Edit members"
                }
                onClick={() => setIsEditingMembers((current) => !current)}
                disabled={showAddPersonForm}
                className="h-9! min-h-9! shrink-0 px-3! text-label"
              >
                {isEditingMembers ? "Done" : "Edit"}
              </Button>
            </div>
            <ul className="flex flex-wrap items-center gap-2">
              {group.people.map((person) =>
                isEditingMembers ? (
                  <li key={person.id} className="w-full">
                    <EditPersonForm
                      code={code}
                      person={person}
                      onRemove={() => removePerson.mutate(person.id)}
                      removePending={
                        removePerson.isPending &&
                        removePerson.variables === person.id
                      }
                      removeError={
                        removePerson.isError &&
                        removePerson.variables === person.id
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
                    <MemberChip
                      name={person.name}
                      isYou={person.id === resolvedIdentityPersonId}
                    />
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
                  error={
                    isRequiredError("personName", personName)
                      ? "Name is required."
                      : undefined
                  }
                  required
                />
                {addPerson.isError && (
                  <ErrorState message={addPerson.error.message} />
                )}
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    variant="secondary"
                    disabled={addPerson.isPending}
                    className="flex-1"
                  >
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
            ) : group.people.length >= MEMBER_CAP ? (
              <p className="font-sans text-label text-ink-forest/70">
                This group is full ({MEMBER_CAP} members max).
              </p>
            ) : (
              !isEditingMembers && (
                <div className="mt-auto flex justify-center pt-2">
                  <Button
                    variant="secondary"
                    onClick={() => setShowAddPersonForm(true)}
                  >
                    Add new member
                  </Button>
                </div>
              )
            )}
          </div>
        </Overlay>
      )}

      {shouldShowWhoAreYou && (
        <WhoAreYouPrompt
          code={code}
          people={group.people}
          onClose={closeWhoAreYou}
        />
      )}
    </main>
  );
}
