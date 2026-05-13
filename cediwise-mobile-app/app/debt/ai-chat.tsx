import { Redirect } from "expo-router";

export default function DebtAiChatPage() {
  return (
    <Redirect
      href={{
        pathname: "/budget/ai-chat",
        params: { context_type: "debt" },
      }}
    />
  );
}
