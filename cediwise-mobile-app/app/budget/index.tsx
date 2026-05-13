import { Redirect, usePathname } from "expo-router";
import { useIsFocused } from "@react-navigation/native";

/**
 * /budget with no child segment → Budget tab.
 *
 * Only redirect when this screen is actually focused and the global path is
 * exactly `/budget`. Otherwise a synchronous `<Redirect>` can race on Android
 * when opening `/budget/ai-chat` (index mounts briefly before the chat screen
 * commits), sending users to the tab and leaving an unmatched route.
 */
export default function BudgetIndex() {
  const pathname = usePathname();
  const focused = useIsFocused();

  if (!focused || pathname !== "/budget") {
    return null;
  }

  return <Redirect href="/(tabs)/budget" />;
}
