import { Redirect } from 'expo-router';

/**
 * /budget with no segment redirects to the Budget tab.
 * Users typically navigate to /budget/categories, /budget/income, etc.
 */
export default function BudgetIndex() {
  return <Redirect href="/(tabs)/budget" />;
}
