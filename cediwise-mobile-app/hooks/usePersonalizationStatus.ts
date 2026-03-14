import { usePersonalizationStore } from "@/stores/personalizationStore";
import { useEffect } from "react";

export type UsePersonalizationStatus = {
  isLoading: boolean;
  setupCompleted: boolean;
  hasProfile: boolean;
  refresh: () => Promise<void>;
};

export function usePersonalizationStatus(
  userId?: string | null
): UsePersonalizationStatus {
  const { isLoading, setupCompleted, hasProfile, refresh } =
    usePersonalizationStore();

  useEffect(() => {
    void usePersonalizationStore.getState().initForUser(userId ?? null);
  }, [userId]);

  return { isLoading, setupCompleted, hasProfile, refresh };
}
