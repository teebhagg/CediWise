import {
  fetchProfileVitalsRemote,
  readProfileVitalsCache,
  writeProfileVitalsCache,
  type ProfileVitals,
} from "@/utils/profileVitals";
import { create } from "zustand";

export type ProfileVitalsStoreState = {
  userId: string | null;
  vitals: ProfileVitals | null;
  isLoading: boolean;
};

export type ProfileVitalsStoreActions = {
  initForUser: (userId: string | null) => Promise<void>;
  refresh: () => Promise<void>;
};

export type ProfileVitalsStore = ProfileVitalsStoreState & ProfileVitalsStoreActions;

export const useProfileVitalsStore = create<ProfileVitalsStore>((set, get) => ({
  userId: null,
  vitals: null,
  isLoading: true,

  initForUser: async (userId: string | null) => {
    const { userId: currentUserId, isLoading: currentLoading } = get();
    if (userId === currentUserId && (currentLoading || currentUserId !== null)) {
      return;
    }

    set({ userId, isLoading: true });
    if (!userId) {
      set({ vitals: null, isLoading: false });
      return;
    }
    await get().refresh();
  },

  refresh: async () => {
    const { userId } = get();
    if (!userId) {
      set({ vitals: null, isLoading: false });
      return;
    }

    const startUserId = userId;
    set({ isLoading: true });

    const cached = await readProfileVitalsCache(startUserId);
    if (cached?.vitals && get().userId === startUserId) {
      set({ vitals: cached.vitals, isLoading: false });
    }

    try {
      const remote = await fetchProfileVitalsRemote(startUserId);
      if (get().userId !== startUserId) return;
      if (remote) {
        set({ vitals: remote });
        await writeProfileVitalsCache(startUserId, remote);
      }
    } catch {
      if (get().userId !== startUserId) return;
      // offline/failed: keep cached vitals if any
    } finally {
      if (get().userId === startUserId) {
        set({ isLoading: false });
      }
    }
  },
}));
