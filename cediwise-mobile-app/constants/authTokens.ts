/**
 * Design tokens for auth screens (root index, callback, name, OTP).
 * Single source for background, text, spinner, and error colors.
 */
export const authTokens = {
  background: "#020617",
  textMuted: "#9CA3AF",
  textError: "#94A3B8",
  spinner: "#E5E7EB",
  buttonPrimary: "#1d6f3d",
  buttonPrimaryText: "#ffffff",
  borderMuted: "#64748b",
} as const;

/**
 * Phone field + country modal: explicit light/dark pairs for `AnimatedPhoneNumberInput`
 * (aligns with app `userInterfaceStyle` / Uniwind; default usage is `dark`).
 */
export const phoneFieldPalettes = {
  light: {
    divider: "#9CA3AF",
    inputText: "#1A1A1A",
    validationOk: "#16A34A",
    validationErr: "#DC2626",
    modalCard: "#FFFFFF",
    modalTitle: "#111827",
    modalOptionSelected: "#EFF6FF",
    modalOptionIdle: "#F3F4F6",
    modalCountryName: "#111827",
    modalDialCode: "#4B5563",
    modalShadow: "#000000",
    shellDefaultBg: "#FFFFFF",
    shellDefaultBorder: "#E5E7EB",
    shellFocusedEmptyBg: "#FFFFFF",
    shellFocusedEmptyBorder: "#2563EB",
    shellErrorBg: "#FEE2E2",
    shellErrorBorder: "#F87171",
    shellValidBg: "#DCFCE7",
    shellValidBorder: "#4ADE80",
    shellInvalidBg: "#FEF08A",
    shellInvalidBorder: "#FACC15",
    countryCodeText: "#111827",
    chevronIcon: "#6B7280",
    modalBackdrop: "rgba(0,0,0,0.5)",
  },
  dark: {
    divider: "#475569",
    inputText: "#F1F5F9",
    validationOk: "#4ADE80",
    validationErr: "#F87171",
    modalCard: "#0F172A",
    modalTitle: "#F8FAFC",
    modalOptionSelected: "rgba(59, 130, 246, 0.22)",
    modalOptionIdle: "#1E293B",
    modalCountryName: "#F8FAFC",
    modalDialCode: "#94A3B8",
    modalShadow: "#000000",
    shellDefaultBg: "#0F172A",
    shellDefaultBorder: "#334155",
    shellFocusedEmptyBg: "#0F172A",
    shellFocusedEmptyBorder: "#3B82F6",
    shellErrorBg: "rgba(127, 29, 29, 0.35)",
    shellErrorBorder: "#F87171",
    shellValidBg: "rgba(6, 78, 59, 0.45)",
    shellValidBorder: "#4ADE80",
    shellInvalidBg: "rgba(113, 63, 18, 0.4)",
    shellInvalidBorder: "#FBBF24",
    countryCodeText: "#F8FAFC",
    chevronIcon: "#94A3B8",
    modalBackdrop: "rgba(0,0,0,0.65)",
  },
} as const;

export type PhoneFieldPalette = (typeof phoneFieldPalettes)["dark"];
