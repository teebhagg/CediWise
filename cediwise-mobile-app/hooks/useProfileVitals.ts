import { useCallback, useEffect, useState } from "react";
import {
  fetchProfileVitalsRemote,
  readProfileVitalsCache,
  writeProfileVitalsCache,
  type ProfileVitals,
} from "../utils/profileVitals";

export type UseProfileVitalsReturn = {
  isLoading: boolean;
  vitals: ProfileVitals | null;
  refresh: () => Promise<void>;
};

export function useProfileVitals(
  userId?: string | null
): UseProfileVitalsReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [vitals, setVitals] = useState<ProfileVitals | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setVitals(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const cached = await readProfileVitalsCache(userId);
    if (cached?.vitals) {
      setVitals(cached.vitals);
    }

    try {
      const remote = await fetchProfileVitalsRemote(userId);
      if (remote) {
        setVitals(remote);
        await writeProfileVitalsCache(userId, remote);
      }
    } catch {
      // offline/failed: keep cached vitals if any
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { isLoading, vitals, refresh };
}
