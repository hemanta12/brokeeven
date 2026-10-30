import { useQueryClient } from '@tanstack/react-query';
import type { MouseEvent, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { apiFetch } from '../../lib/apiClient';
import { groupQueryKey } from './api';
import type { GroupWithPeople } from './types';

const FRESH_MS = 30_000;

interface AddExpenseLinkProps {
  code: string;
  className?: string;
  children: ReactNode;
}

// Add expense from a list. Loads the group first, then navigates, so the group
// page and its sheet render in one frame and the whole thing rises over the
// list as a single page (direction 'sheet'). Without the wait, the group page
// shows its skeleton and then the sheet opens on top, which reads as two steps.
export function AddExpenseLink({ code, className, children }: AddExpenseLinkProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const to = `/g/${code}?add=expense`;

  async function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    let loaded = true;
    try {
      await queryClient.fetchQuery({
        queryKey: groupQueryKey(code),
        queryFn: () => apiFetch<GroupWithPeople>(`/groups/${code}`),
        staleTime: FRESH_MS
      });
    } catch {
      // Offline or the code is gone: the group page shows its own error state.
      loaded = false;
    }
    navigate(to, { state: { direction: loaded ? 'sheet' : 'none' } });
  }

  return (
    <Link to={to} onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}
