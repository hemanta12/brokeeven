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
import type { Balance, Expense } from "./types";
import { useGroupRealtime } from "./useGroupRealtime";
import { WhoAreYouPrompt } from "./WhoAreYouPrompt";

const MEMBER_CAP = 20;
type Tab = "expenses" | "balances";

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
  const [isEditingMembers, setIsEditingMembers] = useState(false);
  const [showAddPersonForm, setShowAddPersonForm] = useState(false);
  const [personName, setPersonName] = useState("");
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | "new" | null>(
    null,
  );
  const [settlingBalance, setSettlingBalance] = useState<Balance | null>(null);
  const [copied, setCopied] = useState(false);

  const addPerson = useAddPerson(code);
  const removePerson = useRemovePerson(code);
  const { touch, untouch, isRequiredError } = useBlurValidation();
  const pulsingIds = useGroupRealtime(code, group?.id);

  async function handleCopyInviteLink() {
    await navigator.clipboard?.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function closeWhoAreYou() {
    setIdentityPersonId(code ? getIdentity(code) : null);
    setDismissedWhoAreYou(true);
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
    <main className="bottom-bar-clearance flex flex-col pt-4">
      {cookiesBlocked && (
        <p role="status" className="mx-4 mb-3 rounded-[10px] bg-ledger-paper px-3.5 py-2.5 font-sans text-label text-ink-forest/75">
          Your browser is blocking cookies, so entries you add here can&apos;t be edited later.
        </p>
      )}
      <div className="group-surface flex-1 rounded-[14px] bg-paper-white pb-6">
        <header className="px-4 pt-4 text-center sm:px-6">
          <div className="relative flex min-w-0 flex-col items-center rounded-[12px] border border-ledger-green/20 bg-ledger-paper px-4 pb-4 pt-10">
            <div className="absolute inset-x-3 top-2 flex min-w-0 items-center justify-between gap-3">
              <p className="min-w-0 truncate font-sans text-label text-ink-forest/65">
                Code:{" "}
                <span className="font-mono tracking-[0.06em]">
                  {group.joinCode}
                </span>
              </p>
              <Button
                variant="tertiary"
                onClick={handleCopyInviteLink}
                className="h-8! min-h-8! shrink-0 rounded-full! border border-ink-forest/20 bg-paper-white px-3! text-label hover:bg-paper-white"
              >
                <span aria-live="polite">
                  {copied ? "Copied!" : "Share link"}
                </span>
              </Button>
            </div>
            <h1 className="font-display text-display font-semibold tracking-[-0.025em] leading-[1.15] text-ink-forest">
              {group.name}
            </h1>
            {group.label && (
              <span className="mt-2 inline-flex rounded-full border border-brass-ui px-2.5 py-0.5 font-sans text-label text-brass-ui">
                {group.label}
              </span>
            )}
          </div>
        </header>

        <section
          aria-label="Members"
          className="mx-4 mt-5 rounded-[12px] border border-ledger-green/10 bg-ledger-paper/40 px-3 py-3 sm:mx-6 sm:px-4"
        >
          {/* text-section (1.125rem Semibold) is DESIGN_SYSTEM.md §3's
              documented scale for section headers like this one — it just
              wasn't wired up anywhere yet; "People" was sitting at the
              smallest, most muted label scale in the whole type system. */}
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="font-sans text-section font-semibold text-ink-forest">
              People
            </h2>
            <Button
              variant={isEditingMembers ? "primary" : "tertiary"}
              aria-label={
                isEditingMembers ? "Cancel editing members" : "Edit members"
              }
              onClick={() => setIsEditingMembers((current) => !current)}
              disabled={showAddPersonForm}
              className="h-11! w-11! shrink-0 rounded-full! p-0!"
            >
              {isEditingMembers ? (
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-3.5 w-3.5"
                >
                  <path
                    d="M5 5l10 10M15 5 5 15"
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
                  className="h-3.5 w-3.5"
                >
                  <path
                    d="M13.3 3.7a1.6 1.6 0 0 1 2.3 2.3L6.4 15.2l-3 .9.9-3 9-9.4Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
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
            {group.people.length < MEMBER_CAP && !showAddPersonForm && (
              <li>
                <Button
                  variant="secondary"
                  aria-label="Add person"
                  disabled={isEditingMembers}
                  className="h-11! w-11! rounded-full! p-0!"
                  onClick={() => setShowAddPersonForm(true)}
                >
                  +
                </Button>
              </li>
            )}
          </ul>

          {group.people.length >= MEMBER_CAP ? (
            <p className="mt-3 font-sans text-label text-ink-forest/70">
              This group is full ({MEMBER_CAP} members max).
            </p>
          ) : (
            showAddPersonForm && (
              <form
                onSubmit={handleAddPerson}
                className="mt-3 flex flex-col gap-3"
              >
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
                    {addPerson.isPending ? "Adding…" : "Add person"}
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
            )
          )}
        </section>

        <div className="mt-6 px-4 sm:px-6">
          <Tabs
            label="Group view"
            items={[
              { id: "expenses", label: "Expenses" },
              { id: "balances", label: "Balances" },
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
                  <div key={dateGroup.date} className="mt-5 first:mt-0">
                    {/* Quiet organiser, not a headline — mono keeps it in the
                        ledger's data voice and distinct from the sans cards. */}
                    <h3 className="mb-2 font-mono text-label font-medium text-ink-forest/70">
                      {formatDateGroupLabel(dateGroup.date)}
                    </h3>
                    <ul className="flex flex-col gap-2">
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
          </div>
        )}

        <div className="bottom-bar">
          <Button onClick={() => setEditingExpense("new")}>Add Expense</Button>
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
          onClose={() => setSettlingBalance(null)}
        />
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
