import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { claimPerson } from '../auth/api';
import { groupQueryKey } from './api';
import type { Person } from './types';

// Activity names whoever the server has linked to a person, and that link is made
// by a best-effort claim when you pick your name. If that call failed (offline,
// blocked cookies, a restart), this device still says "I'm Sam" while the server
// does not, and Sam's changes land in the log without a name. Retry it, once per
// person per page load. A person already linked (to this account or another) is left alone.
export function useHealIdentityClaim(code: string | undefined, people: Person[], personId: string | null) {
  const queryClient = useQueryClient();
  const attempted = useRef(new Set<string>());

  useEffect(() => {
    if (!code || !personId) return;
    const person = people.find((candidate) => candidate.id === personId);
    if (!person || person.userId !== null) return;
    const key = `${code}:${personId}`;
    if (attempted.current.has(key)) return;
    attempted.current.add(key);
    void claimPerson(personId, code).then(() => queryClient.invalidateQueries({ queryKey: groupQueryKey(code) }));
  }, [code, people, personId, queryClient]);
}
