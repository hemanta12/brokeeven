import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { BackButton } from "../../components/BackButton";
import { Button } from "../../components/Button";
import { CornerDecor } from "../../components/CornerDecor";
import { ExpenseRow } from "../../components/ExpenseRow";
import { Tabs } from "../../components/Tabs";
import { ApiError, hasCompletedWrite } from "../../lib/apiClient";
import { EmptyState, ErrorState, NotFoundState } from "../../shared/RouteStates";
import { capitalizeFirst, formatDate, formatDateGroupLabel } from "../../shared/format";
import { getIdentity } from "../../shared/identity";
import { resolveIdentityPersonId, viewerNetOnExpense } from "./ownership";
import { useDeleteExpense } from "../expense/api";
import { ExpenseDetail } from "../expense/ExpenseDetail";
import { ExpenseModal } from "../expense/ExpenseModal";
import { SettleUpModal } from "../settlement/SettleUpModal";
import { useGroupByCode, useReopenGroup } from "./api";
import { CloseGroupModal } from "./CloseGroupModal";
import { groupExpensesByDate } from "./expenseGroups";
import { GroupInfoOverlay } from "./GroupInfoOverlay";
import { GroupPageSkeleton } from "./GroupPageSkeleton";
import { GroupSummary } from "./GroupSummary";
import { BalancesPanel } from "./BalancesPanel";
import { PeoplePanel } from "./PeoplePanel";
import { SettlementHistory } from "./SettlementHistory";
import { ActivityFeed } from "./ActivityFeed";
import type { Balance, Expense } from "./types";
import { useGroupRealtime } from "./useGroupRealtime";
import { WhoAreYouPrompt } from "./WhoAreYouPrompt";

type Tab = "expenses" | "balances" | "activity";

export function GroupPage() {
  const { code } = useParams<{ code: string }>();
  const {
    data: group,
    isLoading,
    isError,
    error,
    refetch,
  } = useGroupByCode(code);

  // My Groups deep-links here with ?add=expense. Strip it once handled, or a
  // refresh reopens the modal forever.
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
  // Derived, not state: open while the URL says so; closing clears the param.
  // A closed group takes no new expenses, so the deep link is inert there.
  const expenseModal =
    editingExpense ?? (openAddExpense && !group?.closedAt ? "new" : null);

  function closeExpenseModal() {
    setEditingExpense(null);
    if (openAddExpense) setSearchParams({}, { replace: true });
  }
  // Settle Up measures "already owed" against the list the row came from, so the
  // simplified plan and the raw balances each stay internally consistent.
  const [settling, setSettling] = useState<{
    balance: Balance;
    reference: Balance[];
  } | null>(null);
  const [showCloseGroup, setShowCloseGroup] = useState(false);

  const deleteExpense = useDeleteExpense(code);
  const reopenGroup = useReopenGroup(code);
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

  // The account's claim outranks the local hint. Derived per render, not mirrored
  // to localStorage: the claim arrives with every fetch, so a copy would only drift.
  const resolvedIdentityPersonId = resolveIdentityPersonId(
    group.people,
    group.viewerUserId,
    identityPersonId,
  );

  // A write always mints a session, so an empty viewer id after one means the
  // cookie never stuck (private mode, blocked cookies) — entries will be uneditable.
  const cookiesBlocked = hasCompletedWrite() && group.viewerUserId === null;

  const shouldShowWhoAreYou =
    !resolvedIdentityPersonId && group.people.length > 0 && !dismissedWhoAreYou;
  const inviteLink = `${window.location.origin}/g/${code}`;
  const closed = Boolean(group.closedAt);

  return (
    <main className="flex flex-col pt-2">
      {cookiesBlocked && (
        <p role="status" className="mx-4 mb-3 rounded-inner border border-line bg-surface px-3.5 py-2.5 font-sans text-label text-dim">
          Your browser is blocking cookies, so entries you add here can&apos;t be edited later.
        </p>
      )}
      <div className="flex flex-1 flex-col">
        {/* Closed state drains the band's green rather than adding a banner: a
            banner pushes the header down and breaks the straddling summary card. */}
        <header
          className={`relative -mx-4 -mt-2 overflow-hidden px-4 pt-3 text-white sm:rounded-t-card sm:px-6 ${
            closed ? "bg-band-closed" : "bg-band"
          } ${resolvedIdentityPersonId ? "pb-20" : "pb-11"}`}
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
          {(closed || (group.label && group.label !== 'Individual')) && (
            <div className="relative mt-4 flex flex-wrap items-center gap-2">
              {/* Filled, not outlined: punched out of the band so it reads as a
                  stamp on the record rather than one more control. */}
              {closed && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-band-dim px-2.5 py-1 font-sans text-micro font-bold uppercase tracking-[0.08em] text-band-closed">
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                    className="h-3 w-3"
                  >
                    <rect x="4.5" y="8.75" width="11" height="7.25" rx="1.75" />
                    <path d="M7.25 8.75V6.5a2.75 2.75 0 0 1 5.5 0v2.25" strokeLinecap="round" />
                  </svg>
                  Closed
                </span>
              )}
              {group.label && group.label !== 'Individual' && (
                <span className="font-sans text-micro uppercase tracking-wide text-band-dim">
                  {capitalizeFirst(group.label)}
                </span>
              )}
            </div>
          )}
          <h1
            className={`relative heading text-display text-white ${
              closed || (group.label && group.label !== 'Individual') ? 'mt-1' : 'mt-3'
            }`}
          >
            {group.name}
          </h1>
          {closed && (
            <p className="relative mt-1.5 font-sans text-label text-band-dim">
              Closed {formatDate(group.closedAt as string)}. Nothing can be added or changed.
            </p>
          )}
        </header>

        {/* Only meaningful once the viewer has claimed a person. */}
        {resolvedIdentityPersonId && (
          <GroupSummary
            balances={group.balances}
            expenses={group.expenses}
            personId={resolvedIdentityPersonId}
            currency={group.currency}
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
            className="mt-2 px-4 sm:px-6"
          >
            <BalancesPanel
              code={code}
              balances={group.balances}
              people={group.people}
              currency={group.currency}
              settleMode={group.settleMode}
              identityPersonId={resolvedIdentityPersonId}
              closed={closed}
              pulsingIds={pulsingIds}
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

            {/* Terminal action of the tab, so it sits last and centered, below a
                rule. Secondary, not danger: closing is reversible, and red would
                overstate it. Full size, not sm — sm is 36px, under the 44pt floor. */}
            {!closed && group.people.length > 0 && (
              <div className="mt-8 flex flex-col items-center gap-2 border-t border-line pt-6">
                <Button variant="secondary" onClick={() => setShowCloseGroup(true)}>
                  Close group
                </Button>
                <p className="text-center font-sans text-micro text-dim">
                  Locks the ledger once everything reaches zero. You can reopen it.
                </p>
              </div>
            )}
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

        {/* The bar stays in both states; removing it on close collapses the
            page's shape. Reopen takes the slot Add Expense had. */}
        <div className="bottom-bar mt-auto">
          {closed ? (
            <>
              <p className="text-center font-sans text-label text-dim">
                Reopen to add expenses or settle up again.
              </p>
              <Button
                variant="secondary"
                onClick={() => reopenGroup.mutate()}
                disabled={reopenGroup.isPending}
              >
                {reopenGroup.isPending ? "Reopening…" : "Reopen group"}
              </Button>
            </>
          ) : (
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
          currency={group.currency}
          expense={expenseModal === "new" ? undefined : expenseModal}
          onClose={closeExpenseModal}
        />
      )}

      {settling && (
        <SettleUpModal
          code={code}
          people={group.people}
          balance={settling.balance}
          balances={settling.reference}
          currency={group.currency}
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

      {showInfo && (
        <GroupInfoOverlay
          joinCode={group.joinCode}
          inviteLink={inviteLink}
          currency={group.currency}
          readOnly={closed}
          onClose={() => setShowInfo(false)}
        />
      )}

      {showPeople && (
        <PeoplePanel
          code={code}
          people={group.people}
          identityPersonId={resolvedIdentityPersonId}
          pulsingIds={pulsingIds}
          readOnly={closed}
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
