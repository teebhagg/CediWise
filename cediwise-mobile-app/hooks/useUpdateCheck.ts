import { useCallback, useEffect } from "react";
import { AppState, InteractionManager, Platform } from "react-native";
import { checkAndPromptUpdate } from "../services/inAppUpdates";

/**
 * Hook that checks for Android in‑app updates using the native Play Store UI.
 * It runs on mount and whenever the app returns to the foreground.
 * The update flow is IMMEDIATE (blocking) as requested.
 */
export function useUpdateCheck() {
  const check = useCallback(() => {
    if (Platform.OS !== "android") return;
    // Immediate update flow
    void checkAndPromptUpdate({ immediate: true });
  }, []);

  // Initial check after interactions to avoid blocking first paint
  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      check();
    });
  }, [check]);

  // Re‑check when app becomes active again
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const handler = (nextState: any) => {
      if (nextState === "active") {
        check();
      }
    };
    const sub = AppState.addEventListener("change", handler);
    return () => sub.remove();
  }, [check]);

  return { check };
}
