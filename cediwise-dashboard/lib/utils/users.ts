/**
 * If email contains "cediwise.phone", treat as phone-auth user and show phone as primary.
 */
export function isCediwisePhoneUser(email: string | null): boolean {
  return !!email?.toLowerCase().includes("cediwise.phone");
}

export function getPrimaryContact(
  email: string | null,
  phone: string | null
): { primary: string; secondary: string | null } {
  if (isCediwisePhoneUser(email) && phone) {
    return { primary: phone, secondary: email };
  }
  if (email) {
    return { primary: email, secondary: phone || null };
  }
  if (phone) {
    return { primary: phone, secondary: null };
  }
  return { primary: "—", secondary: null };
}
