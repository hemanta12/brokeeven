import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

import { groupQueryKey } from './api';
import type { GroupWithPeople } from './types';

const PULSE_MS = 250;

function changedRowIds(previous: GroupWithPeople, next: GroupWithPeople): string[] {
  const ids: string[] = [];

  const prevExpenses = new Map(previous.expenses.map((e) => [e.id, JSON.stringify(e)]));
  for (const expense of next.expenses) {
    if (prevExpenses.get(expense.id) !== JSON.stringify(expense)) ids.push(expense.id);
  }

  const prevPeople = new Map(previous.people.map((p) => [p.id, JSON.stringify(p)]));
  for (const person of next.people) {
    if (prevPeople.get(person.id) !== JSON.stringify(person)) ids.push(person.id);
  }

  const prevBalances = new Map(previous.balances.map((b) => [`${b.fromPersonId}:${b.toPersonId}`, b.amount]));
  for (const balance of next.balances) {
    const key = `${balance.fromPersonId}:${balance.toPersonId}`;
    if (prevBalances.get(key) !== balance.amount) ids.push(key);
  }

  return ids;
}

// Joins this group's realtime room on mount (TECH_STACK.md §4): applies
// incoming `group:update` payloads straight to the cache (same shape
// GET /groups/:code returns), refetches via REST on reconnect rather than
// trusting whatever happened during the disconnect window, and returns the
// row ids that just changed so the caller can apply a one-shot pulse cue
// (Design System §6 — pulse color itself is a placeholder until Phase 4's
// tokens land).
export function useGroupRealtime(code: string | undefined, groupId: string | undefined): Set<string> {
  const queryClient = useQueryClient();
  const [pulsingIds, setPulsingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!code || !groupId) return;

    const socket = io(import.meta.env.VITE_API_URL);

    function pulse(ids: string[]) {
      if (ids.length === 0) return;
      setPulsingIds((current) => new Set([...current, ...ids]));
      for (const id of ids) {
        setTimeout(() => {
          setPulsingIds((current) => {
            if (!current.has(id)) return current;
            const next = new Set(current);
            next.delete(id);
            return next;
          });
        }, PULSE_MS);
      }
    }

    function applyUpdate(next: GroupWithPeople) {
      const previous = queryClient.getQueryData<GroupWithPeople>(groupQueryKey(code));
      queryClient.setQueryData(groupQueryKey(code), next);
      if (previous) pulse(changedRowIds(previous, next));
    }

    socket.emit('group:join', groupId);
    socket.on('group:update', applyUpdate);
    socket.io.on('reconnect', () => {
      void queryClient.invalidateQueries({ queryKey: groupQueryKey(code) });
    });

    return () => {
      socket.disconnect();
    };
  }, [code, groupId, queryClient]);

  return pulsingIds;
}
