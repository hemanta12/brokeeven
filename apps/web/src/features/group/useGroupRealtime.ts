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

// Refetches via REST on reconnect rather than trusting the disconnect window.
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
      // Broadcast is viewer-agnostic; keep the REST fetch's viewer id or every
      // edit control disappears.
      queryClient.setQueryData(groupQueryKey(code), {
        ...next,
        viewerUserId: previous?.viewerUserId ?? null
      });
      if (previous) pulse(changedRowIds(previous, next));
    }

    socket.emit('group:join', code);
    socket.on('group:update', applyUpdate);
    socket.io.on('reconnect', () => {
      socket.emit('group:join', code);
      void queryClient.invalidateQueries({ queryKey: groupQueryKey(code) });
    });

    return () => {
      socket.disconnect();
    };
  }, [code, groupId, queryClient]);

  return pulsingIds;
}
