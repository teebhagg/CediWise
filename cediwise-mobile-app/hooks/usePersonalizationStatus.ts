import { useCallback, useEffect, useState } from "react";
import {
  fetchPersonalizationStatusRemote,
  readPersonalizationStatusCache,
  writePersonalizationStatusCache,
} from "../utils/profileVitals";

export type UsePersonalizationStatus = {
  isLoading: boolean;
  setupCompleted: boolean;
  hasProfile: boolean;
  refresh: () => Promise<void>;
};

export function usePersonalizationStatus(
  userId?: string | null
): UsePersonalizationStatus {
  const [isLoading, setIsLoading] = useState(true);
  const [setupCompleted, setSetupCompleted] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      setSetupCompleted(false);
      setHasProfile(false);
      return;
    }

    setIsLoading(true);
    const cached = await readPersonalizationStatusCache(userId);
    if (cached) {
      setSetupCompleted(cached.setupCompleted);
    }

    try {
      const remote = await fetchPersonalizationStatusRemote(userId);
      setHasProfile(remote.exists);
      setSetupCompleted(remote.setupCompleted);
      await writePersonalizationStatusCache(userId, remote.setupCompleted);
    } catch {
      // offline: keep cached status
      setHasProfile(false);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { isLoading, setupCompleted, hasProfile, refresh };
}
