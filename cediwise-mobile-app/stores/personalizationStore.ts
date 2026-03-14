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
};

export type PersonalizationStore =
  PersonalizationStoreState & PersonalizationStoreActions;

export const usePersonalizationStore = create<PersonalizationStore>(
  (set, get) => ({
    userId: null,
    isLoading: true,
    setupCompleted: false,
    hasProfile: false,

    initForUser: async (userId: string | null) => {
      set({ userId, isLoading: true });
      if (!userId) {
        set({ setupCompleted: false, hasProfile: false, isLoading: false });
        return;
      }
      await get().refresh();
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
      if (cached && get().userId === startUserId) {
        set({ setupCompleted: cached.setupCompleted });
      }

      try {
        const remote = await fetchPersonalizationStatusRemote(startUserId);
        if (get().userId !== startUserId) return;
        set({ hasProfile: remote.exists, setupCompleted: remote.setupCompleted });
        await writePersonalizationStatusCache(
          startUserId,
          remote.setupCompleted
        );
      } catch {
        if (get().userId !== startUserId) return;
        set({ hasProfile: false });
      } finally {
        if (get().userId === startUserId) {
          set({ isLoading: false });
        }
      }
    },
  })
);
