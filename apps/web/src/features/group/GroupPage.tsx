import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { BackButton } from "../../components/BackButton";
import { BalanceRow } from "../../components/BalanceRow";
import { Button } from "../../components/Button";
import { CornerDecor } from "../../components/CornerDecor";
import { ExpenseRow } from "../../components/ExpenseRow";
import { Tabs } from "../../components/Tabs";
import { ApiError, hasCompletedWrite } from "../../lib/apiClient";
import { EmptyState, ErrorState, NotFoundState } from "../../shared/RouteStates";
import { capitalizeFirst, formatDateGroupLabel } from "../../shared/format";
import { getIdentity } from "../../shared/identity";
import { resolveIdentityPersonId, viewerNetOnExpense } from "./ownership";
import { useDeleteExpense } from "../expense/api";
import { ExpenseDetail } from "../expense/ExpenseDetail";
import { ExpenseModal } from "../expense/ExpenseModal";
import { SettleUpModal } from "../settlement/SettleUpModal";
import { useGroupByCode } from "./api";
import { groupExpensesByDate } from "./expenseGroups";
import { GroupInfoOverlay } from "./GroupInfoOverlay";
import { GroupPageSkeleton } from "./GroupPageSkeleton";
import { GroupSummary } from "./GroupSummary";
import { PeoplePanel } from "./PeoplePanel";
import { SettlementHistory } from "./SettlementHistory";
import { ActivityFeed } from "./ActivityFeed";
import type { Balance, Expense } from "./types";
import { useGroupRealtime } from "./useGroupRealtime";
import { WhoAreYouPrompt } from "./WhoAreYouPrompt";

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

  // My groups' inline "Add expense" links straight here with ?add=expense, so
  // the most common next step costs no extra tap. Read once into state and
  // stripped from the URL, or a refresh would reopen the modal forever.
  const [searchParams, setSearchParams] = useSearchParams();
  const openAddExpense = searchParams.get("add") === "expense";

  const [tab, setTab] = useState<Tab>("expenses");
  const [identityPersonId, setIdentityPersonId] = useState<string | null>(() =>
    code ? getIdentity(code) : null,
  );
  const [dismissedWhoAreYou, setDismissedWhoAreYou] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showPeople, setShowPeople] = useState(false);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | "new" | null>(
    null,
  );
  // Derived, not copied into state: the modal is open because the URL says so
  // until something closes it, which is also what clears the parameter.
  const expenseModal = editingExpense ?? (openAddExpense ? "new" : null);

  function closeExpenseModal() {
    setEditingExpense(null);
    if (openAddExpense) setSearchParams({}, { replace: true });
  }
  const [settlingBalance, setSettlingBalance] = useState<Balance | null>(null);

  const deleteExpense = useDeleteExpense(code);
  const pulsingIds = useGroupRealtime(code, group?.id);

  function closeWhoAreYou() {
    setIdentityPersonId(code ? getIdentity(code) : null);
    setDismissedWhoAreYou(true);
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
        <p role="status" className="mx-4 mb-3 rounded-inner border border-line bg-surface px-3.5 py-2.5 font-sans text-label text-dim">
          Your browser is blocking cookies, so entries you add here can&apos;t be edited later.
        </p>
      )}
      {/* The band, settled in sketch 013. The same --color-band as the landing
          page's proof band, so the app has one dark device used twice rather
          than two unrelated dark areas. The summary card straddles its lower
          edge, which is depth with no gradient and no shadow trick. */}
      <div className="flex flex-1 flex-col">
        <header
          className={`relative -mx-4 -mt-2 overflow-hidden bg-band px-4 pt-3 text-white sm:rounded-t-card sm:px-6 ${
            resolvedIdentityPersonId ? "pb-20" : "pb-11"
          }`}
        >
          <CornerDecor />
          <div className="relative flex items-center justify-between gap-3">
            <BackButton to="/groups" label="My groups" tone="band" />
            <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPeople(true)}
              aria-haspopup="dialog"
              aria-label={`People (${group.people.length})`}
              className="focus-ring flex h-11 min-h-11 items-center gap-1.5 rounded-full border border-band-dim bg-white/8 px-3 font-sans text-label font-medium text-white transition-transform duration-100 hover:bg-white/15 active:scale-95"
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
              className="focus-ring flex h-11 w-11 min-h-11 shrink-0 items-center justify-center rounded-full border border-band-dim bg-white/8 text-white transition-transform duration-100 hover:bg-white/15 active:scale-95"
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
                className="size-4.5"
              >
                <circle cx="10" cy="10" r="7.5" />
                <path d="M10 9.25v4.25" strokeLinecap="round" />
                <circle cx="10" cy="6.25" r="0.75" fill="currentColor" stroke="none" />
              </svg>
            </button>
            </div>
          </div>
          {group.label && group.label !== 'Individual' && (
            <p className="relative mt-4 font-sans text-micro uppercase tracking-wide text-band-dim">
              {capitalizeFirst(group.label)}
            </p>
          )}
          <h1
            className={`relative heading text-display text-white ${
              group.label && group.label !== 'Individual' ? 'mt-1' : 'mt-3'
            }`}
          >
            {group.name}
          </h1>
        </header>

        {/* Only meaningful once the viewer has said which person they are:
            without that, none of these figures are "yours". */}
        {resolvedIdentityPersonId && (
          <GroupSummary
            balances={group.balances}
            expenses={group.expenses}
            personId={resolvedIdentityPersonId}
            onSettleUp={tab === "balances" ? undefined : () => setTab("balances")}
          />
        )}

        <div className="mt-4 px-4 sm:px-6">
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
            className="mt-2 px-4 sm:px-6"
          >
            {group.expenses.length === 0 ? (
              <EmptyState message="No expenses yet. Add the first one." />
            ) : (
              <div>
                <p className="mb-1.5 font-sans text-micro text-dim">
                  {group.expenses.length}{" "}
                  {group.expenses.length === 1 ? "expense" : "expenses"}
                </p>
                {groupExpensesByDate(group.expenses).map((dateGroup) => (
                  <div key={dateGroup.date} className="mt-4 first:mt-0">
                    {/* Quiet organiser, not a headline — mono keeps it in the
                        ledger's data voice and distinct from the sans cards. */}
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
            className="mt-2 px-4 sm:px-6"
          >
            {group.balances.length === 0 ? (
              /* A fully settled group has no balances but may well have a
                 settlement to undo, so the history renders either way. */
              <EmptyState message="No balances yet. Add an expense to get started." />
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
                          onSettle={
                            /* A debt between two other people stays visible as
                               context, but the action to clear it is theirs,
                               not the viewer's. */
                            balanceDirection(balance) === "neutral"
                              ? undefined
                              : () => setSettlingBalance(balance)
                          }
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
            className="mt-2 px-4 sm:px-6"
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
          onDelete={() =>
            deleteExpense.mutate(viewingExpense.id, { onSuccess: () => setViewingExpense(null) })
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
          expense={expenseModal === "new" ? undefined : expenseModal}
          onClose={closeExpenseModal}
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
        <GroupInfoOverlay
          joinCode={group.joinCode}
          inviteLink={inviteLink}
          onClose={() => setShowInfo(false)}
        />
      )}

      {showPeople && (
        <PeoplePanel
          code={code}
          people={group.people}
          identityPersonId={resolvedIdentityPersonId}
          pulsingIds={pulsingIds}
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
