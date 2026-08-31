import { capitalizeFirst, formatDateGroupLabel } from '../../shared/format';
import { EmptyState, ErrorState, LoadingState } from '../../shared/RouteStates';
import { useGroupActivity, type ActivityEntry } from './api';

// The log records a formatted sentence, not structured ids, so this view is
// history — it can't drive undo. Undo lives on the entities themselves (the
// Settled list in Balances, and edit/delete on an expense).
const ACTION_LABELS: Record<ActivityEntry['action'], string> = {
  expense_add: 'Expense added',
  expense_edit: 'Expense edited',
  expense_delete: 'Expense deleted',
  person_add: 'Person added',
  person_remove: 'Person removed',
  person_rename: 'Person renamed',
  settlement: 'Settled',
  settlement_delete: 'Settlement undone',
};

// Colour the action tag by kind so the eye can run down the column: additions
// read green, removals red, edits brass. Never the only cue — the tag text
// itself already names the action (color-blind-safe).
const ACTION_TONE: Record<ActivityEntry['action'], string> = {
  expense_add: 'text-ledger-green',
  person_add: 'text-ledger-green',
  settlement: 'text-ledger-green',
  expense_edit: 'text-brass-ui',
  person_rename: 'text-brass-ui',
  expense_delete: 'text-debt-red',
  person_remove: 'text-debt-red',
  settlement_delete: 'text-debt-red',
};

// The one thing worth scanning for in a money log is the money — give any
// $-amount medium weight and tabular figures so it stands out of the sentence.
const MONEY_SPLIT = /(\$[\d,]+(?:\.\d{2})?)/g;
const MONEY_EXACT = /^\$[\d,]+(?:\.\d{2})?$/;

function withMoneyEmphasis(text: string) {
  return text.split(MONEY_SPLIT).map((part, index) =>
    MONEY_EXACT.test(part) ? (
      <span key={index} className="font-sans font-medium tabular-nums text-ink-forest">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

function groupByDay(entries: ActivityEntry[]): Array<[string, ActivityEntry[]]> {
  const days = new Map<string, ActivityEntry[]>();
  for (const entry of entries) {
    const day = entry.createdAt.slice(0, 10);
    days.set(day, [...(days.get(day) ?? []), entry]);
  }
  return [...days.entries()];
}

export function ActivityFeed({ code, isActive }: { code: string; isActive: boolean }) {
  const { data, isPending, isError, error, refetch } = useGroupActivity(code, isActive);

  if (isPending) return <LoadingState />;
  if (isError) return <ErrorState message={error.message} onRetry={() => void refetch()} />;
  if (!data || data.entries.length === 0) {
    return <EmptyState message="Nothing has happened in this group yet." />;
  }

  return (
    <div>
      {groupByDay(data.entries).map(([day, entries]) => (
        <div key={day} className="mt-4 first:mt-0">
          <h3 className="mb-1.5 font-sans text-label font-medium text-ink-forest/70">
            {formatDateGroupLabel(day)}
          </h3>
          <ul className="flex flex-col gap-1.5">
            {entries.map((entry) => (
              <li key={entry.id} className="entry-card px-3 py-2">
                <p className="font-sans text-label text-ink-forest">
                  {withMoneyEmphasis(capitalizeFirst(entry.detail ?? ACTION_LABELS[entry.action]))}
                </p>
                <p className="mt-0.5 text-[0.8125rem]">
                  <span className={`font-sans font-medium ${ACTION_TONE[entry.action]}`}>
                    {ACTION_LABELS[entry.action]}
                  </span>
                  {entry.actorName ? (
                    <span className="font-sans text-ink-forest/70"> · by {capitalizeFirst(entry.actorName)}</span>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
