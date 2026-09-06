import { capitalizeFirst, formatDateGroupLabel } from '../../shared/format';
import { EmptyState, ErrorState, LoadingState } from '../../shared/RouteStates';
import { useGroupActivity, type ActivityEntry } from './api';

// The log stores formatted sentences, not ids, so this view is read-only history.
// Undo lives on the entities (Settled list in Balances, edit/delete on an expense).
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

// Tag colour by kind (add/remove/edit); never the only cue — the tag text names
// the action.
const ACTION_TONE: Record<ActivityEntry['action'], string> = {
  expense_add: 'text-accent',
  person_add: 'text-accent',
  settlement: 'text-accent',
  expense_edit: 'text-notice',
  person_rename: 'text-notice',
  expense_delete: 'text-down',
  person_remove: 'text-down',
  settlement_delete: 'text-down',
};

// Wraps money amounts in mono. Not <Amount>: these are formatted substrings of a
// sentence, not directional numbers. The prefix matches both a leading symbol
// ($, €, ₹, CA$…) and a 3-letter code ("NPR 20.00") from Intl.NumberFormat.
const MONEY = String.raw`(?:[A-Z]{3}\s|[^\s\d]{1,3}\s?)[\d,]+(?:\.\d{1,2})?`;
const MONEY_SPLIT = new RegExp(`(${MONEY})`, 'g');
const MONEY_EXACT = new RegExp(`^${MONEY}$`);

export function withMoneyEmphasis(text: string) {
  return text.split(MONEY_SPLIT).map((part, index) =>
    MONEY_EXACT.test(part) ? (
      <span key={index} className="font-mono font-medium text-ink">
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
          <h3 className="mb-1.5 font-sans text-label font-medium text-dim">
            {formatDateGroupLabel(day)}
          </h3>
          <ul className="flex flex-col gap-1.5">
            {entries.map((entry) => (
              <li key={entry.id} className="entry-card px-3 py-2">
                <p className="font-sans text-label text-ink">
                  {withMoneyEmphasis(capitalizeFirst(entry.detail ?? ACTION_LABELS[entry.action]))}
                </p>
                <p className="mt-0.5 text-micro">
                  <span className={`font-sans font-medium ${ACTION_TONE[entry.action]}`}>
                    {ACTION_LABELS[entry.action]}
                  </span>
                  {entry.actorName ? (
                    <span className="font-sans text-dim"> · by {capitalizeFirst(entry.actorName)}</span>
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
