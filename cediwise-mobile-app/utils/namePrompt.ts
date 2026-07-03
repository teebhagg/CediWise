import AsyncStorage from "@react-native-async-storage/async-storage";

const NAME_PROMPT_DISMISS_KEY_PREFIX = "cediwise:name_prompt_dismissed:";
const DISMISSAL_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

export function namePromptDismissKey(userId: string): string {
  return `${NAME_PROMPT_DISMISS_KEY_PREFIX}${userId}`;
}

export async function recordNamePromptDismissed(userId: string): Promise<void> {
  await AsyncStorage.setItem(
    namePromptDismissKey(userId),
    new Date().toISOString(),
  );
}

/**
 * Whether to show the optional name collection screen for a user without a name.
 * Returns false if the user dismissed the prompt within the last 14 days.
 */
export async function shouldShowNamePrompt(userId: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(namePromptDismissKey(userId));
  if (!raw) return true;
  const dismissedAt = Date.parse(raw);
  if (Number.isNaN(dismissedAt)) return true;
  return Date.now() - dismissedAt >= DISMISSAL_COOLDOWN_MS;
}
