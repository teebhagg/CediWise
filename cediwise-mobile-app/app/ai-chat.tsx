import { Redirect, useLocalSearchParams } from "expo-router";

/**
 * Canonical chat lives at `/budget/ai-chat`. Some entry points (deep links,
 * dev URLs, stale clients) hit `/ai-chat` — forward them so routing never 404s.
 */
export default function AiChatRootAlias() {
  const p = useLocalSearchParams<{
    initialMessage?: string;
    context_type?: string;
    draftMessage?: string;
  }>();

  const params: Record<string, string> = {};
  if (p.initialMessage != null) params.initialMessage = String(p.initialMessage);
  if (p.context_type != null) params.context_type = String(p.context_type);
  if (p.draftMessage != null) params.draftMessage = String(p.draftMessage);

  if (Object.keys(params).length === 0) {
    return <Redirect href="/budget/ai-chat" />;
  }

  return (
    <Redirect
      href={{
        pathname: "/budget/ai-chat",
        params,
      }}
    />
  );
}
