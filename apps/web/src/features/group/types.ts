export interface Person {
  id: string;
  groupId: string;
  name: string;
  email: string | null;
  removedAt: string | null;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  label: string | null;
  joinCode: string;
  createdAt: string;
}

export type SplitMethod = 'equal' | 'percent' | 'custom';

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  personId: string;
  amount: string;
  percentAtEntry: string | null;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: string;
  date: string;
  payerId: string;
  splitMethod: SplitMethod;
  splits: ExpenseSplit[];
}

export interface Settlement {
  id: string;
  groupId: string;
  fromPersonId: string;
  toPersonId: string;
  amount: string;
  note: string;
  settledAt: string;
}

export interface Balance {
  fromPersonId: string;
  toPersonId: string;
  amount: string;
}

export interface GroupWithPeople extends Group {
  people: Person[];
  expenses: Expense[];
  settlements: Settlement[];
  balances: Balance[];
}
