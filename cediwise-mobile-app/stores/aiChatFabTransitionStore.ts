import { create } from "zustand";

/** Window-space rect from `measureInWindow`. */
export type FabWindowRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Phase = "idle" | "expanding" | "collapsing";

type CollapseComplete = () => void;

type AIChatFabTransitionState = {
  phase: Phase;
  anchor: FabWindowRect | null;
  /** True when the current chat session was opened via the budget FAB (enables collapse animation). */
  openedViaFab: boolean;
  /** Invoked after shrink animation before clearing anchor. */
  pendingAfterCollapse: CollapseComplete | null;
  startExpandFromFab: (rect: FabWindowRect) => void;
  markOpenedFromNonFab: () => void;
  requestCollapseThen: (cb: CollapseComplete) => void;
  /** Called by overlay when expand animation finishes. */
  finishExpand: () => void;
  /** Called by overlay when collapse animation finishes. */
  finishCollapse: () => void;
  reset: () => void;
  /** Clears stale FAB anchor when leaving chat without shrink (e.g. OS back / swipe). */
  releaseFabMorphIfStale: () => void;
};

export const useAIChatFabTransitionStore = create<AIChatFabTransitionState>((set, get) => ({
  phase: "idle",
  anchor: null,
  openedViaFab: false,
  pendingAfterCollapse: null,

  startExpandFromFab: (rect) => {
    if (get().phase !== "idle") return;
    set({
      anchor: rect,
      phase: "expanding",
      openedViaFab: true,
      pendingAfterCollapse: null,
    });
  },

  markOpenedFromNonFab: () =>
    set({
      openedViaFab: false,
      anchor: null,
      phase: "idle",
      pendingAfterCollapse: null,
    }),

  requestCollapseThen: (cb) => {
    const { anchor, openedViaFab, phase } = get();
    if (phase === "collapsing") {
      return;
    }
    if (phase === "expanding") {
      set({
        phase: "idle",
        anchor: null,
        openedViaFab: false,
        pendingAfterCollapse: null,
      });
      cb();
      return;
    }
    if (!openedViaFab || !anchor) {
      cb();
      set({
        anchor: null,
        openedViaFab: false,
        pendingAfterCollapse: null,
      });
      return;
    }
    set({ phase: "collapsing", pendingAfterCollapse: cb });
  },

  finishExpand: () => set({ phase: "idle" }),

  finishCollapse: () => {
    const cb = get().pendingAfterCollapse;
    set({
      phase: "idle",
      anchor: null,
      openedViaFab: false,
      pendingAfterCollapse: null,
    });
    cb?.();
  },

  /** When chat unmounts / blurs without going through FAB collapse (swipe-back). */
  releaseFabMorphIfStale: () => {
    const s = get();
    if (
      !s.openedViaFab ||
      s.phase !== "idle" ||
      !s.anchor
    ) {
      return;
    }
    set({
      anchor: null,
      openedViaFab: false,
      pendingAfterCollapse: null,
    });
  },

  reset: () =>
    set({
      phase: "idle",
      anchor: null,
      openedViaFab: false,
      pendingAfterCollapse: null,
    }),
}));
