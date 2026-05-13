import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { uuidv4 } from "@/utils/uuid";

export interface AIChatShellState {
  open: boolean;
  sessionId: string;
  remainingChats: number | null;
  chatLimit: number | null;
  setOpen: (open: boolean) => void;
  setUsageMeta: (remaining: number | null, limit: number | null) => void;
  /** Start a fresh conversation id (e.g. after 24h — caller decides). */
  resetSession: () => void;
  resetForLogout: () => void;
}

export const useAIChatShellStore = create<AIChatShellState>()(
  persist(
    (set) => ({
      open: false,
      sessionId: uuidv4(),
      remainingChats: null,
      chatLimit: null,
      setOpen: (open) => set({ open }),
      setUsageMeta: (remainingChats, chatLimit) => set({ remainingChats, chatLimit }),
      resetSession: () => set({ sessionId: uuidv4() }),
      resetForLogout: () =>
        set({
          open: false,
          sessionId: uuidv4(),
          remainingChats: null,
          chatLimit: null,
        }),
    }),
    {
      name: "ai-chat-session-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ sessionId: state.sessionId }),
    }
  )
);
