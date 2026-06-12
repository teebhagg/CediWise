/** Curated expense priorities for Step 2 — max 5 selections feed AI suggestions. */
export const PRIORITY_EXPENSE_OPTIONS = [
  "Rent",
  "Groceries",
  "Transport",
  "Utilities",
  "School Fees",
  "Tithes/Church",
  "Data Bundles",
  "Dining Out",
  "Entertainment",
  "Subscriptions",
  "Clothing",
  "Healthcare",
  "Debt Payments",
  "Childcare",
  "Insurance",
  "Savings",
] as const;

export type PriorityExpense = (typeof PRIORITY_EXPENSE_OPTIONS)[number];

export const MAX_PRIORITY_EXPENSES = 5;
