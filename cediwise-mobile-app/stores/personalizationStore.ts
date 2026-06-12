import {
  fetchPersonalizationStatusRemote,
  readPersonalizationStatusCache,
  writePersonalizationStatusCache,
} from "@/utils/profileVitals";
import { create } from "zustand";

export type PersonalizationStoreState = {
  userId: string | null;
  isLoading: boolean;
  setupCompleted: boolean;
  hasProfile: boolean;
};

export type PersonalizationStoreActions = {
  initForUser: (userId: string | null) => Promise<void>;
  refresh: () => Promise<void>;
  /** After vitals finish — hide personalization banner before remote catches up. */
  applyOptimisticSetupCompleted: () => void;
};

export type PersonalizationStore =
  PersonalizationStoreState & PersonalizationStoreActions;

function mergePersonalizationFromRemote(
  cachedSetupCompleted: boolean,
  remote: { exists: boolean; setupCompleted: boolean },
): { setupCompleted: boolean; hasProfile: boolean } {
  const setupCompleted = remote.setupCompleted || cachedSetupCompleted;
  const hasProfile = remote.exists || setupCompleted;
  return { setupCompleted, hasProfile };
}

export const usePersonalizationStore = create<PersonalizationStore>(
  (set, get) => ({
    userId: null,
    isLoading: true,
    setupCompleted: false,
    hasProfile: false,

    initForUser: async (userId: string | null) => {
      const { userId: currentUserId, isLoading: currentLoading } = get();
      if (userId === currentUserId && currentLoading) {
        return;
      }
      if (userId === currentUserId && userId !== null) {
        void get().refresh();
        return;
      }

      set({ userId, isLoading: true });
      if (!userId) {
        set({ setupCompleted: false, hasProfile: false, isLoading: false });
        return;
      }
      await get().refresh();
    },

    applyOptimisticSetupCompleted: () => {
      const { userId } = get();
      if (!userId) return;
      set({ setupCompleted: true, hasProfile: true, isLoading: false });
    },

    refresh: async () => {
      const { userId } = get();
      if (!userId) {
        set({ setupCompleted: false, hasProfile: false, isLoading: false });
        return;
      }

      const startUserId = userId;
      set({ isLoading: true });

      const cached = await readPersonalizationStatusCache(startUserId);
      const cachedSetupCompleted = cached?.setupCompleted === true;
      if (cached && get().userId === startUserId) {
        set({
          setupCompleted: cached.setupCompleted,
          hasProfile: cached.setupCompleted,
          isLoading: false,
        });
      }

      try {
        const remote = await fetchPersonalizationStatusRemote(startUserId);
        if (get().userId !== startUserId) return;
        const merged = mergePersonalizationFromRemote(
          cachedSetupCompleted,
          remote,
        );
        set(merged);
        await writePersonalizationStatusCache(
          startUserId,
          merged.setupCompleted,
        );
      } catch {
        if (get().userId !== startUserId) return;
        if (!cachedSetupCompleted) {
          set({ hasProfile: false });
        }
      } finally {
        if (get().userId === startUserId) {
          set({ isLoading: false });
        }
      }
    },
  }),
);
