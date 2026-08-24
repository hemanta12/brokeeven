import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '../../lib/apiClient';
import { groupQueryKey } from '../group/api';
import type { Expense, SplitMethod } from '../group/types';

export interface ExpenseInput {
  description: string;
  amount: number;
  date: string;
  payerId: string;
  splitMethod: SplitMethod;
  splits: { personId: string; percent?: number; amount?: number }[];
}

export function useCreateExpense(code: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpenseInput) =>
      apiFetch<Expense>(`/groups/${code}/expenses`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupQueryKey(code) })
  });
}

export function useUpdateExpense(code: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ExpenseInput }) =>
      apiFetch<Expense>(`/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupQueryKey(code) })
  });
}
