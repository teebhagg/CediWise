import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { getStoredAuthData, REFRESH_BUFFER_MS, refreshStoredSession } from "../utils/auth";

/**
 * Keeps the user “always logged in”:
 * - refresh on mount
 * - refresh on app resume
 * - schedule a refresh shortly before expiry
 */
export function useAuthRefresh(): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const scheduleNext = async () => {
    clearTimer();
    const authData = await getStoredAuthData({ allowExpired: true });
    if (!authData?.expiresAt) return;

    const delayMs = Math.max(
      0,
      authData.expiresAt - Date.now() - REFRESH_BUFFER_MS,
    );

    timerRef.current = setTimeout(async () => {
      await refreshStoredSession();
      if (!cancelledRef.current) {
        await scheduleNext();
      }
    }, delayMs);
  };

  const refreshAndReschedule = async () => {
    await refreshStoredSession();
    if (!cancelledRef.current) {
      await scheduleNext();
    }
  };

  useEffect(() => {
    cancelledRef.current = false;
    refreshAndReschedule();

    const onAppStateChange = (state: AppStateStatus) => {
      if (state === "active") {
        refreshAndReschedule();
      }
    };

    const sub = AppState.addEventListener("change", onAppStateChange);

    return () => {
      cancelledRef.current = true;
      clearTimer();
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

