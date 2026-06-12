import { expenseLabelsMatch } from "./expenseMatchingCore";

export { normalizeExpenseLabel, expenseLabelsMatch } from "./expenseMatchingCore";

/** True when an AI suggestion line matches a user priority expense label. */
export function expenseMatchesPriority(
  suggestionName: string,
  priorityExpenses: string[],
): boolean {
  if (priorityExpenses.length === 0) return false;
  return priorityExpenses.some((priority) =>
    expenseLabelsMatch(suggestionName, priority),
  );
}
