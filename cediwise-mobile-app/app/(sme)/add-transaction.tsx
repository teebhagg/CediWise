import { Redirect, useLocalSearchParams } from "expo-router";

/**
 * Redirect to the unified batch-transaction entry screen.
 * This screen is deprecated in favor of the adaptive batch-transaction screen.
 */
export default function AddTransactionRedirect() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: "/(sme)/batch-transaction", params }} />;
}
