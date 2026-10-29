import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { Button } from "../../components/Button";
import { ExpenseRow } from "../../components/ExpenseRow";
import { Tabs } from "../../components/Tabs";
import { ApiError, hasCompletedWrite } from "../../lib/apiClient";
import { EmptyState, ErrorState, NotFoundState } from "../../shared/RouteStates";
import { formatDateGroupLabel } from "../../shared/format";
import { getIdentity } from "../../shared/identity";
import { forgetRecentGroup, rememberRecentGroup } from "../../shared/recentGroups";
import { isInviteSaved } from "../../shared/inviteSaved";
import { groupOwner, resolveIdentityPersonId, viewerNetOnExpense } from "./ownership";
import { useDeleteExpense } from "../expense/api";
import { ExpenseDetail } from "../expense/ExpenseDetail";
import { ExpenseModal } from "../expense/ExpenseModal";
import { SettleUpModal } from "../settlement/SettleUpModal";
import { settleRole } from "../settlement/settleRole";
import { useSession } from "../auth/api";
import { useGroupByCode, useReopenGroup } from "./api";
import { CloseGroupModal } from "./CloseGroupModal";
import { groupExpensesByDate } from "./expenseGroups";
import { InviteReminder } from "./InviteReminder";
import { GroupHeader } from "./GroupHeader";
import { GroupPageSkeleton } from "./GroupPageSkeleton";
import { GroupSummary } from "./GroupSummary";
import { BalancesPanel } from "./BalancesPanel";
import { PeoplePanel } from "./PeoplePanel";
import { SettingsSheet } from "./SettingsSheet";
import { SettlementHistory } from "./SettlementHistory";
import type { Balance, Expense, Person } from "./types";
import { viewerOpenPayments } from "./summaryMath";
import { ALL_TIME, type Period } from "./expensePeriod";
import { ExpensePeriodControl } from "./ExpensePeriodControl";
import { useExpensePeriod } from "./useExpensePeriod";
import { useHealIdentityClaim } from "./useHealIdentityClaim";
import { useGroupRealtime } from "./useGroupRealtime";
import { WhoAreYouPrompt } from "./WhoAreYouPrompt";

const NO_EXPENSES: Expense[] = [];
const NO_PEOPLE: Person[] = [];

function countLabel(count: number): string {
  return `${count} ${count === 1 ? "expense" : "expenses"}`;
}

type Tab = "expenses" | "balances";

export function GroupPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const {
    data: group,
    isLoading,
    isError,
    error,
    refetch,
  } = useGroupByCode(code);

  // Strip ?add=expense once handled, or a refresh reopens the modal forever.
  const [searchParams, setSearchParams] = useSearchParams();
  const openAddExpense = searchParams.get("add") === "expense";

  const [tab, setTab] = useState<Tab>("expenses");
  const [identityPersonId, setIdentityPersonId] = useState<string | null>(() =>
    code ? getIdentity(code) : null,
  );
  const [dismissedWhoAreYou, setDismissedWhoAreYou] = useState(false);
  // What the viewer was about to do when we asked who they are; runs once they pick.
  const [afterIdentify, setAfterIdentify] = useState<(() => void) | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showPeople, setShowPeople] = useState(false);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | "new" | null>(
    null,
  );
  function closeExpenseModal() {
    setEditingExpense(null);
    if (openAddExpense) setSearchParams({}, { replace: true });
  }
  // Reference list keeps a simplified-plan settle consistent with the raw balances.
  const [settling, setSettling] = useState<{
    balance: Balance;
    reference: Balance[];
  } | null>(null);
  const [showCloseGroup, setShowCloseGroup] = useState(false);
  const [inviteSaved, setInviteSaved] = useState(() => (code ? isInviteSaved(code) : true));

  const deleteExpense = useDeleteExpense(code);
  const reopenGroup = useReopenGroup(code);
  const pulsingIds = useGroupRealtime(code, group?.id);
  const expensePeriod = useExpensePeriod(group?.expenses ?? NO_EXPENSES);
  // Account claim outranks the local hint; derived per render, never cached, so it can't drift.
  const resolvedIdentityPersonId = resolveIdentityPersonId(
    group?.people ?? NO_PEOPLE,
    group?.viewerUserId ?? null,
    identityPersonId,
  );
  useHealIdentityClaim(code, group?.people ?? NO_PEOPLE, resolvedIdentityPersonId);

  // Picking a period switches to Expenses: that is the list it changes.
  function pickPeriod(next: Period) {
    expensePeriod.setPeriod(next);
    setTab("expenses");
  }
  const { isSignedIn, isPending: sessionPending } = useSession();

  // Signed-out visitors have no server-side group list; this is how they find the
  // group again from the landing page.
  useEffect(() => {
    if (code && group?.name) rememberRecentGroup(code, group.name, group.label);
  }, [code, group?.name, group?.label]);

  function closeWhoAreYou() {
    const picked = code ? getIdentity(code) : null;
    setIdentityPersonId(picked);
    setDismissedWhoAreYou(true);
    if (picked) afterIdentify?.();
    setAfterIdentify(null);
  }

  if (isLoading) {
    return <GroupPageSkeleton />;
  }

  if (isError) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <main>
          <NotFoundState message="Group not found. Check the code and try again." />
          <p className="mt-4 font-sans text-body text-ink">
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

  // A write always mints a session; a null viewer id after one means the cookie never stuck.
  const cookiesBlocked = hasCompletedWrite() && group.viewerUserId === null;

  // Every change is logged under the name of whoever made it, so changing anything
  // needs a picked name. Without one, ask who they are first, then carry on.
  function requireIdentity(action: () => void) {
    if (resolvedIdentityPersonId || group!.people.length === 0) {
      action();
      return;
    }
    setAfterIdentify(() => action);
    setDismissedWhoAreYou(false);
  }

  // Derived, not state: inert on a closed group, and held back until a name is
  // picked (?add=expense opens it as soon as one is).
  const expenseModal =
    editingExpense ??
    (openAddExpense && !group.closedAt && (resolvedIdentityPersonId || group.people.length === 0) ? "new" : null);

  const shouldShowWhoAreYou =
    !resolvedIdentityPersonId && group.people.length > 0 && !dismissedWhoAreYou;
  const inviteLink = `${window.location.origin}/g/${code}`;
  const closed = Boolean(group.closedAt);
  // Without a picked person there is no summary card to hold the period control,
  // so the list stays unfiltered rather than hiding expenses behind a filter that
  // can't be changed.
  const periodApplies = Boolean(resolvedIdentityPersonId);
  const visibleExpenses = periodApplies ? expensePeriod.filtered : group.expenses;
  const settleSide = settling ? settleRole(settling.balance, resolvedIdentityPersonId) : null;
  // The Balances tab badge: the viewer's own rows, none once the ledger is closed.
  const openPayments =
    closed || !resolvedIdentityPersonId
      ? 0
      : viewerOpenPayments(group.balances, resolvedIdentityPersonId, group.settleMode);

  return (
    <main className="flex flex-col pt-2">
      {cookiesBlocked && (
        <p role="status" className="mx-4 mb-3 rounded-inner border border-line bg-surface px-3.5 py-2.5 font-sans text-label text-dim">
          Your browser is blocking cookies, so entries you add here can&apos;t be edited later.
        </p>
      )}
      <div className="flex flex-1 flex-col">
        <GroupHeader
          name={group.name}
          label={group.label}
          peopleCount={group.people.length}
          closedAt={group.closedAt}
          showBack={isSignedIn}
          roomForSummary={group.people.length > 0}
          onOpenPeople={() => setShowPeople(true)}
          onOpenSettings={() => requireIdentity(() => setShowSettings(true))}
        >
          {/* Signed in, the group is reachable from My Groups; signed out, this link is it. */}
          {!isSignedIn && !sessionPending && !inviteSaved && !closed && (
            <InviteReminder
              joinCode={group.joinCode}
              inviteLink={inviteLink}
              onSaved={() => setInviteSaved(true)}
            />
          )}
        </GroupHeader>

        {group.people.length > 0 && (
          <GroupSummary
            code={code}
            people={group.people}
            personId={resolvedIdentityPersonId}
            balances={group.balances}
            expenses={visibleExpenses}
            periodControl={
              <ExpensePeriodControl
                period={expensePeriod.period}
                thisMonth={expensePeriod.thisMonth}
                bounds={expensePeriod.bounds}
                years={expensePeriod.years}
                dates={group.expenses.map((expense) => expense.date)}
                onChange={pickPeriod}
              />
            }
            currency={group.currency}
            settleMode={group.settleMode}
            onSettleUp={() => setTab("balances")}
            onClaimed={closeWhoAreYou}
          />
        )}

        <div className="mt-4 sm:px-2">
          <Tabs
            label="Group view"
            items={[
              { id: "expenses", label: "Expenses" },
              {
                id: "balances",
                label: "Balances",
                badge: { count: openPayments, label: `${openPayments} open ${openPayments === 1 ? "payment" : "payments"}` },
              },
            ]}
            activeId={tab}
            onChange={(id) => setTab(id as Tab)}
          />
        </div>

        <div>
          {tab === "expenses" && (
            <div
              role="tabpanel"
              id="panel-expenses"
              aria-labelledby="tab-expenses"
              className="mt-2 sm:px-2"
            >
              {group.expenses.length === 0 ? (
                <EmptyState message="No expenses yet. Add the first one." />
              ) : visibleExpenses.length === 0 ? (
                <div className="flex flex-col items-start gap-2.5">
                  <EmptyState message={`No expenses in ${expensePeriod.label}.`} />
                  <Button variant="secondary" size="sm" onClick={() => expensePeriod.setPeriod(ALL_TIME)}>
                    Show all time
                  </Button>
                </div>
              ) : (
                <div>
                  <p className="mb-1.5 font-sans text-micro text-dim">
                    {countLabel(visibleExpenses.length)}
                    {periodApplies && expensePeriod.period.kind !== "all" && ` in ${expensePeriod.label}`}
                  </p>
                  {groupExpensesByDate(visibleExpenses).map((dateGroup) => (
                    <div key={dateGroup.date} className="mt-4 first:mt-0">
                      <h3 className="mb-1.5 font-sans text-label font-medium text-dim">
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
                                currency={group.currency}
                                viewerNet={viewerNetOnExpense(expense, resolvedIdentityPersonId)}
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
              className="mt-2 sm:px-2"
            >
              <BalancesPanel
                balances={group.balances}
                people={group.people}
                currency={group.currency}
                settleMode={group.settleMode}
                identityPersonId={resolvedIdentityPersonId}
                closed={closed}
                pulsingIds={pulsingIds}
                onChangeSettleMode={() => requireIdentity(() => setShowSettings(true))}
                onSettle={(balance, reference) => setSettling({ balance, reference })}
              />

              <SettlementHistory
                code={code}
                settlements={group.settlements}
                people={group.people}
                identityPersonId={resolvedIdentityPersonId}
                currency={group.currency}
                readOnly={closed}
              />
            </div>
          )}
        </div>

        {/* Stays mounted in both states — removing it on close collapses the page's shape. */}
        <div className="bottom-bar mt-auto">
          {closed ? (
            <>
              <p className="text-center font-sans text-label text-dim">
                Reopen to add expenses or settle up again.
              </p>
              <Button
                variant="secondary"
                onClick={() => requireIdentity(() => reopenGroup.mutate())}
                disabled={reopenGroup.isPending}
              >
                {reopenGroup.isPending ? "Reopening…" : "Reopen group"}
              </Button>
            </>
          ) : (
            <Button onClick={() => requireIdentity(() => setEditingExpense("new"))}>
              <Plus aria-hidden="true" className="size-4" />
              Add Expense
            </Button>
          )}
        </div>
      </div>

      {viewingExpense && (
        <ExpenseDetail
          expense={viewingExpense}
          people={group.people}
          identityPersonId={resolvedIdentityPersonId}
          viewerUserId={group.viewerUserId}
          currency={group.currency}
          readOnly={closed}
          onClose={() => setViewingExpense(null)}
          onEdit={() =>
            requireIdentity(() => {
              setEditingExpense(viewingExpense);
              setViewingExpense(null);
            })
          }
          onDelete={() =>
            requireIdentity(() =>
              deleteExpense.mutate(viewingExpense.id, { onSuccess: () => setViewingExpense(null) }),
            )
          }
          deletePending={deleteExpense.isPending}
          deleteError={deleteExpense.isError ? deleteExpense.error.message : undefined}
        />
      )}

      {expenseModal && (
        <ExpenseModal
          code={code}
          people={group.people}
          identityPersonId={resolvedIdentityPersonId}
          currency={group.currency}
          expense={expenseModal === "new" ? undefined : expenseModal}
          onClose={closeExpenseModal}
        />
      )}

      {settling && settleSide && (
        <SettleUpModal
          code={code}
          people={group.people}
          balance={settling.balance}
          balances={settling.reference}
          currency={group.currency}
          role={settleSide}
          onClose={() => setSettling(null)}
        />
      )}

      {showCloseGroup && !closed && (
        <CloseGroupModal
          code={code}
          people={group.people}
          balances={group.balances}
          currency={group.currency}
          defaultThreshold={group.forgiveThreshold}
          onClose={() => setShowCloseGroup(false)}
        />
      )}

      {showSettings && (
        <SettingsSheet
          joinCode={group.joinCode}
          inviteLink={inviteLink}
          name={group.name}
          label={group.label}
          currency={group.currency}
          settleMode={group.settleMode}
          balances={group.balances}
          closedAt={group.closedAt}
          createdByUserId={group.createdByUserId}
          owner={groupOwner(group)}
          viewerUserId={group.viewerUserId}
          canClose={group.people.length > 0}
          onRequestClose={() => {
            setShowSettings(false);
            setShowCloseGroup(true);
          }}
          onClose={() => setShowSettings(false)}
          onDeleted={() => {
            forgetRecentGroup(group.joinCode);
            navigate(isSignedIn ? "/groups" : "/", { replace: true });
          }}
        />
      )}

      {showPeople && (
        <PeoplePanel
          code={code}
          people={group.people}
          identityPersonId={resolvedIdentityPersonId}
          pulsingIds={pulsingIds}
          owner={groupOwner(group)}
          createdByUserId={group.createdByUserId}
          viewerUserId={group.viewerUserId}
          readOnly={closed || !resolvedIdentityPersonId}
          readOnlyMessage={
            closed ? undefined : "Pick who you are on the group page to change who's in the group."
          }
          onClose={() => setShowPeople(false)}
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
