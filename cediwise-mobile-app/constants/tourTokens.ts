/**
 * Design tokens for tour (onboarding overlay, card, zone highlight).
 * Single source for colors, radii, offsets, and timing.
 */
export const tourTokens = {
  card: {
    background: "#151518",
    border: "rgb(40, 40, 42)",
    borderRadius: 36,
    padding: 16,
    width: 320,
  },
  title: {
    color: "#ffffff",
  },
  body: {
    color: "#94A3B8",
  },
  buttons: {
    backText: "#ffffff",
    skipText: "#94A3B8",
    nextBackground: "#1d6f3d",
    nextBackgroundDisabled: "rgba(29, 111, 61, 0.5)",
    nextText: "#ffffff",
    nextTextDisabled: "rgba(255,255,255,0.6)",
    minHeight: 48,
    minWidth: 80,
    nextRadius: 24,
  },
  zone: {
    borderColor: "#22C55E",
    borderWidth: 2,
  },
} as const;

/** Delay before starting tour (allows layout to settle). */
export const TOUR_START_DELAY_MS = 500;

/** Horizontal offset for card when targeting profile/learn tab (aligns with tab icon). */
export const TOUR_CARD_OFFSET_X = -35;

/** Max wait before skipping budget tour when zones are not ready. */
export const BUDGET_TOUR_READY_TIMEOUT_MS = 5000;
