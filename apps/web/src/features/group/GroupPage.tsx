import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ApiError } from '../../lib/apiClient';
import { ErrorState, LoadingState, NotFoundState } from '../../shared/RouteStates';
import { getIdentity } from '../../shared/identity';
import { useBlurValidation } from '../../shared/useBlurValidation';
import { ExpenseModal } from '../expense/ExpenseModal';
import { SettleUpModal } from '../settlement/SettleUpModal';
import { useAddPerson, useGroupByCode, useRemovePerson } from './api';
import type { Expense } from './types';
import { useGroupRealtime } from './useGroupRealtime';
import { WhoAreYouPrompt } from './WhoAreYouPrompt';

const MEMBER_CAP = 20;
const TABS = ['expenses', 'balances'] as const;
type Tab = (typeof TABS)[number];

export function GroupPage() {
  const { code } = useParams<{ code: string }>();
  const { data: group, isLoading, isError, error, refetch } = useGroupByCode(code);

  const [tab, setTab] = useState<Tab>('expenses');
  const [identityPersonId, setIdentityPersonId] = useState<string | null>(() => (code ? getIdentity(code) : null));
  const [dismissedWhoAreYou, setDismissedWhoAreYou] = useState(false);
  const [expandedPersonId, setExpandedPersonId] = useState<string | null>(null);
  const [showAddPersonForm, setShowAddPersonForm] = useState(false);
  const [personName, setPersonName] = useState('');
  const [editingExpense, setEditingExpense] = useState<Expense | 'new' | null>(null);
  const [showSettleUp, setShowSettleUp] = useState(false);

  const addPerson = useAddPerson(code);
  const removePerson = useRemovePerson(code);
  const { touch, isRequiredError } = useBlurValidation();
  const pulsingIds = useGroupRealtime(code, group?.id);

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const currentIndex = TABS.indexOf(tab);
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    setTab(TABS[(currentIndex + delta + TABS.length) % TABS.length]!);
  }

  function closeWhoAreYou() {
    setIdentityPersonId(code ? getIdentity(code) : null);
    setDismissedWhoAreYou(true);
  }

  async function handleAddPerson(event: FormEvent) {
    event.preventDefault();
    if (!code || !personName.trim()) return;
    await addPerson.mutateAsync({ code, name: personName });
    setPersonName('');
  }

  if (isLoading) {
    return <LoadingState label="Loading group…" />;
  }

  if (isError) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <main>
          <NotFoundState message="We couldn't find a group with that code." />
          <p>
            <Link to="/join">Try another code</Link> or <Link to="/create">create a new group</Link>.
          </p>
        </main>
      );
    }
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  }

  if (!group || !code) {
    return null;
  }

  const shouldShowWhoAreYou = !identityPersonId && group.people.length > 0 && !dismissedWhoAreYou;
  const inviteLink = `${window.location.origin}/g/${code}`;

  return (
    <main>
      <header>
        <h1>{group.name}</h1>
        {group.label && <p>{group.label}</p>}
      </header>

      <section aria-label="Members">
        <ul>
          {group.people.map((person) => (
            <li key={person.id} className={pulsingIds.has(person.id) ? 'row-pulse' : undefined}>
              <button type="button" onClick={() => setExpandedPersonId((current) => (current === person.id ? null : person.id))}>
                {person.name}
                {person.id === identityPersonId ? ' (you)' : ''}
              </button>
              {expandedPersonId === person.id && (
                <div>
                  <button type="button" disabled={removePerson.isPending} onClick={() => removePerson.mutate(person.id)}>
                    Remove from group
                  </button>
                  {removePerson.isError && <ErrorState message={removePerson.error.message} />}
                </div>
              )}
            </li>
          ))}
        </ul>

        {group.people.length >= MEMBER_CAP ? (
          <p>Group already has the maximum of {MEMBER_CAP} members.</p>
        ) : showAddPersonForm ? (
          <form onSubmit={handleAddPerson}>
            <label>
              Name
              <input
                value={personName}
                onChange={(event) => setPersonName(event.target.value)}
                onBlur={() => touch('personName')}
                autoComplete="name"
                autoCorrect="off"
                autoCapitalize="words"
                required
              />
            </label>
            {isRequiredError('personName', personName) && <span role="alert">Name is required.</span>}
            {addPerson.isError && <ErrorState message={addPerson.error.message} />}
            <button type="submit" disabled={addPerson.isPending}>
              {addPerson.isPending ? 'Adding…' : 'Add person'}
            </button>
          </form>
        ) : (
          <button type="button" onClick={() => setShowAddPersonForm(true)}>
            + Add person
          </button>
        )}
      </section>

      <section aria-label="Invite">
        <p>
          Join code: <strong>{group.joinCode}</strong>
        </p>
        <button type="button" onClick={() => navigator.clipboard?.writeText(inviteLink)}>
          Copy invite link
        </button>
      </section>

      <div role="tablist" aria-label="Group view">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            id={`tab-${t}`}
            aria-selected={tab === t}
            aria-controls={`panel-${t}`}
            tabIndex={tab === t ? 0 : -1}
            onClick={() => setTab(t)}
            onKeyDown={handleTabKeyDown}
          >
            {t === 'expenses' ? 'Expenses' : 'Balances'}
          </button>
        ))}
      </div>

      {tab === 'expenses' && (
        <div role="tabpanel" id="panel-expenses" aria-labelledby="tab-expenses">
          {group.expenses.length === 0 ? (
            <p>No expenses yet — add the first one.</p>
          ) : (
            <ul>
              {group.expenses.map((expense) => {
                const payer = group.people.find((p) => p.id === expense.payerId);
                return (
                  <li key={expense.id} className={pulsingIds.has(expense.id) ? 'row-pulse' : undefined}>
                    <button type="button" onClick={() => setEditingExpense(expense)}>
                      {expense.description} — ${expense.amount} — paid by {payer?.name ?? 'someone removed'} —{' '}
                      {expense.date.slice(0, 10)}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {tab === 'balances' && (
        <div role="tabpanel" id="panel-balances" aria-labelledby="tab-balances">
          {group.balances.length === 0 ? (
            <p>Balances appear here once an expense has been added.</p>
          ) : (
            <>
              <ul>
                {group.balances.map((balance) => {
                  const from = group.people.find((p) => p.id === balance.fromPersonId);
                  const to = group.people.find((p) => p.id === balance.toPersonId);
                  const balanceKey = `${balance.fromPersonId}:${balance.toPersonId}`;
                  return (
                    <li key={balanceKey} className={pulsingIds.has(balanceKey) ? 'row-pulse' : undefined}>
                      {from?.name ?? 'Someone'} owes {to?.name ?? 'someone'} ${balance.amount}
                    </li>
                  );
                })}
              </ul>
              <button type="button" onClick={() => setShowSettleUp(true)}>
                Settle Up
              </button>
            </>
          )}
        </div>
      )}

      <button type="button" onClick={() => setEditingExpense('new')}>
        Add Expense
      </button>

      {editingExpense && (
        <ExpenseModal
          code={code}
          people={group.people}
          identityPersonId={identityPersonId}
          expense={editingExpense === 'new' ? undefined : editingExpense}
          onClose={() => setEditingExpense(null)}
        />
      )}

      {showSettleUp && (
        <SettleUpModal
          code={code}
          people={group.people}
          balances={group.balances}
          onClose={() => setShowSettleUp(false)}
        />
      )}

      {shouldShowWhoAreYou && <WhoAreYouPrompt code={code} people={group.people} onClose={closeWhoAreYou} />}
    </main>
  );
}
