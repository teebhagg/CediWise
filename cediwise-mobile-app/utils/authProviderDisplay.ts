export function isApplePrivateRelayEmail(email: string): boolean {
  return email.endsWith("@privaterelay.appleid.com");
}

export function formatAuthProviderDisplayValue(displayValue: string): string {
  if (isApplePrivateRelayEmail(displayValue)) {
    return "Private email (via Apple)";
  }
  return displayValue || "—";
}
