/**
 * AI chat chrome — matches `app/globals.css` semantic tokens (primary, accent, card, border)
 * and `constants/authTokens` primary button green.
 */
export const chatTheme = {
  surface: "#020617",

  gradientColors: ["#020617", "#041810", "#03120c", "#020617"] as const,
  gradientLocations: [0, 0.38, 0.72, 1] as const,

  /** --color-primary */
  primary: "#1d6f3d",
  primaryForeground: "#ffffff",
  /** --color-accent */
  accentEmerald: "#10b981",
  /** --color-secondary (sky/cyan accent) */
  secondaryCyan: "#64d3fe",

  /** --color-card / --color-border */
  card: "#151518",
  cardGlass: "rgba(21, 21, 24, 0.96)",
  border: "#28282a",

  userBubbleBg: "#1d6f3d",
  userBubbleBorder: "rgba(52, 211, 153, 0.4)",
  userBubbleText: "#ffffff",

  assistantBubbleBg: "rgba(21, 21, 24, 0.96)",
  assistantBubbleBorder: "rgba(40, 40, 42, 0.95)",
  assistantBubbleText: "#e2e8f0",

  composerBg: "rgba(21, 21, 24, 0.88)",
  composerBorder: "rgba(29, 111, 61, 0.38)",

  sendGradient: ["#14532d", "#1d6f3d"] as const,

  welcomeRing: ["rgba(16, 185, 129, 0.5)", "rgba(100, 211, 254, 0.3)"] as const,
  welcomeInner: ["#14532d", "#1d6f3d"] as const,

  busyPillBg: "rgba(16, 185, 129, 0.12)",
  busyPillBorder: "rgba(52, 211, 153, 0.32)",
  busyPillText: "rgba(209, 250, 229, 0.92)",

  headerDivider: "rgba(29, 111, 61, 0.18)",
  headerSubtitle: "rgba(100, 211, 254, 0.55)",
  closeBtnBg: "rgba(29, 111, 61, 0.14)",
  closeBtnBorder: "rgba(52, 211, 153, 0.28)",

  chipBorder: "rgba(52, 211, 153, 0.42)",
  chipBg: "rgba(16, 185, 129, 0.1)",
  chipShadowIos: "#14532d",
  chipIcon: "#6ee7b7",

  /** Vertical gap between consecutive message rows */
  messageRowGap: 16,
} as const;
