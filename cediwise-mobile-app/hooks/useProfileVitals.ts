import { useProfileVitalsStore } from "@/stores/profileVitalsStore";
import { useEffect } from "react";

export type UseProfileVitalsReturn = {
  isLoading: boolean;
  vitals: import("../utils/profileVitals").ProfileVitals | null;
  refresh: () => Promise<void>;
};

export function useProfileVitals(
  userId?: string | null
): UseProfileVitalsReturn {
  const { isLoading, vitals, refresh } = useProfileVitalsStore();

  useEffect(() => {
    void useProfileVitalsStore.getState().initForUser(userId ?? null);
  }, [userId]);

  return { isLoading, vitals, refresh };
}
