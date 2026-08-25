import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';

import { BalanceRow } from '../../components/BalanceRow';
import { Button } from '../../components/Button';
import { ExpenseRow } from '../../components/ExpenseRow';
import { Field } from '../../components/Field';
import { MemberChip } from '../../components/MemberChip';
import { Tabs } from '../../components/Tabs';
import { ApiError } from '../../lib/apiClient';
import { EmptyState, ErrorState, LoadingState, NotFoundState } from '../../shared/RouteStates';
import { getIdentity } from '../../shared/identity';
import { useBlurValidation } from '../../shared/useBlurValidation';
import { ExpenseDetail } from '../expense/ExpenseDetail';
import { ExpenseModal } from '../expense/ExpenseModal';
import { SettleUpModal } from '../settlement/SettleUpModal';
import { useAddPerson, useGroupByCode, useRemovePerson } from './api';
import { EditPersonForm } from './EditPersonForm';
import type { Balance, Expense } from './types';
import { useGroupRealtime } from './useGroupRealtime';
import { WhoAreYouPrompt } from './WhoAreYouPrompt';

const MEMBER_CAP = 20;
type Tab = 'expenses' | 'balances';

function balanceKey(balance: Pick<Balance, 'fromPersonId' | 'toPersonId'>): string {
  return `${balance.fromPersonId}:${balance.toPersonId}`;
}

export function GroupPage() {
  const { code } = useParams<{ code: string }>();
  const { data: group, isLoading, isError, error, refetch } = useGroupByCode(code);

  const [tab, setTab] = useState<Tab>('expenses');
  const [identityPersonId, setIdentityPersonId] = useState<string | null>(() => (code ? getIdentity(code) : null));
  const [dismissedWhoAreYou, setDismissedWhoAreYou] = useState(false);
  const [expandedPersonId, setExpandedPersonId] = useState<string | null>(null);
  const [showAddPersonForm, setShowAddPersonForm] = useState(false);
  const [personName, setPersonName] = useState('');
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | 'new' | null>(null);
  const [settlingBalance, setSettlingBalance] = useState<Balance | null>(null);

  const addPerson = useAddPerson(code);
  const removePerson = useRemovePerson(code);
  const { touch, isRequiredError } = useBlurValidation();
  const pulsingIds = useGroupRealtime(code, group?.id);

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
          <p className="mt-4 font-sans text-body text-ink-forest">
            <Link to="/join" className="underline">
              Try another code
            </Link>{' '}
            or{' '}
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

  const shouldShowWhoAreYou = !identityPersonId && group.people.length > 0 && !dismissedWhoAreYou;
  const inviteLink = `${window.location.origin}/g/${code}`;

  function balanceDirection(balance: Balance): 'owe' | 'owed' | 'neutral' {
    if (balance.fromPersonId === identityPersonId) return 'owe';
    if (balance.toPersonId === identityPersonId) return 'owed';
    return 'neutral';
  }

  return (
    <main className="pb-28">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-display font-semibold text-ink-forest">{group.name}</h1>
          {group.label && (
            <span className="mt-1 inline-flex self-start rounded-full border border-brass-ui px-2.5 py-0.5 font-sans text-label text-brass-ui">
              {group.label}
            </span>
          )}
        </div>
        <Button variant="tertiary" onClick={() => navigator.clipboard?.writeText(inviteLink)}>
          Share invite link
        </Button>
      </header>
      <p className="mt-1 font-sans text-label text-ink-forest/60">
        Code: <span className="font-mono">{group.joinCode}</span>
      </p>

      <section aria-label="Members" className="mt-6">
        <ul className="flex flex-wrap items-center gap-2">
          {group.people.map((person) =>
            editingPersonId === person.id ? (
              <li key={person.id} className="w-full">
                <EditPersonForm code={code} person={person} onDone={() => setEditingPersonId(null)} />
              </li>
            ) : (
              <li
                key={person.id}
                onClick={() => setExpandedPersonId((current) => (current === person.id ? null : person.id))}
                data-revealed={expandedPersonId === person.id}
                className={`member-hover-reveal relative flex min-h-11 cursor-pointer items-center rounded-full ${pulsingIds.has(person.id) ? 'row-pulse' : ''}`}
              >
                <MemberChip
                  name={person.name}
                  isYou={person.id === identityPersonId}
                  onEdit={() => setEditingPersonId(person.id)}
                  onRemove={removePerson.isPending ? undefined : () => removePerson.mutate(person.id)}
                />
                {removePerson.isError && removePerson.variables === person.id && (
                  <div className="absolute left-0 top-full z-10 mt-2 w-max">
                    <ErrorState message={removePerson.error.message} />
                  </div>
                )}
              </li>
            )
          )}
          {group.people.length < MEMBER_CAP && !showAddPersonForm && (
            <li>
              <Button
                variant="secondary"
                aria-label="Add person"
                className="h-8! w-8! rounded-full! p-0!"
                onClick={() => setShowAddPersonForm(true)}
              >
                +
              </Button>
            </li>
          )}
        </ul>

        {group.people.length >= MEMBER_CAP ? (
          <p className="mt-3 font-sans text-label text-ink-forest/60">
            Group already has the maximum of {MEMBER_CAP} members.
          </p>
        ) : (
          showAddPersonForm && (
            <form onSubmit={handleAddPerson} className="mt-3 flex flex-col gap-3">
              <Field
                id="add-person-name"
                label="Name"
                value={personName}
                onChange={(event) => setPersonName(event.target.value)}
                onBlur={() => touch('personName')}
                autoComplete="name"
                autoCorrect="off"
                autoCapitalize="words"
                error={isRequiredError('personName', personName) ? 'Name is required.' : undefined}
                required
              />
              {addPerson.isError && <ErrorState message={addPerson.error.message} />}
              <div className="flex gap-3">
                <Button type="submit" variant="secondary" disabled={addPerson.isPending} className="flex-1">
                  {addPerson.isPending ? 'Adding…' : 'Add person'}
                </Button>
                <Button
                  type="button"
                  variant="tertiary"
                  className="flex-1"
                  onClick={() => {
                    setShowAddPersonForm(false);
                    setPersonName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )
        )}
      </section>

      <div className="mt-6">
        <Tabs
          label="Group view"
          items={[
            { id: 'expenses', label: 'Expenses' },
            { id: 'balances', label: 'Balances' }
          ]}
          activeId={tab}
          onChange={(id) => setTab(id as Tab)}
        />
      </div>

      {tab === 'expenses' && (
        <div role="tabpanel" id="panel-expenses" aria-labelledby="tab-expenses" className="mt-3">
          {group.expenses.length === 0 ? (
            <EmptyState message="No expenses yet — add the first one." />
          ) : (
            <div className="overflow-hidden rounded-[10px] bg-paper-white">
              <ul className="ledger-list">
                {group.expenses.map((expense) => {
                  const payer = group.people.find((p) => p.id === expense.payerId);
                  return (
                    <li key={expense.id} className={pulsingIds.has(expense.id) ? 'row-pulse' : undefined}>
                      <ExpenseRow
                        title={expense.title}
                        payerName={payer?.name ?? 'someone removed'}
                        amount={Number(expense.amount)}
                        date={expense.date}
                        onClick={() => setViewingExpense(expense)}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === 'balances' && (
        <div role="tabpanel" id="panel-balances" aria-labelledby="tab-balances" className="mt-3">
          {group.balances.length === 0 ? (
            <EmptyState message="Balances appear here once an expense has been added." />
          ) : (
            <div className="overflow-hidden rounded-[10px] bg-paper-white">
              <ul className="ledger-list">
                {group.balances.map((balance) => {
                  const from = group.people.find((p) => p.id === balance.fromPersonId);
                  const to = group.people.find((p) => p.id === balance.toPersonId);
                  const key = balanceKey(balance);
                  return (
                    <li key={key} className={pulsingIds.has(key) ? 'row-pulse' : undefined}>
                      <BalanceRow
                        fromName={from?.name ?? 'Someone'}
                        toName={to?.name ?? 'someone'}
                        amount={Number(balance.amount)}
                        direction={balanceDirection(balance)}
                        fromIsViewer={balance.fromPersonId === identityPersonId}
                        toIsViewer={balance.toPersonId === identityPersonId}
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
        <Button onClick={() => setEditingExpense('new')}>Add Expense</Button>
      </div>

      {viewingExpense && (
        <ExpenseDetail
          expense={viewingExpense}
          people={group.people}
          identityPersonId={identityPersonId}
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
          identityPersonId={identityPersonId}
          expense={editingExpense === 'new' ? undefined : editingExpense}
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

      {shouldShowWhoAreYou && <WhoAreYouPrompt code={code} people={group.people} onClose={closeWhoAreYou} />}
    </main>
  );
}
