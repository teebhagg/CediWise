import type { StoredAuthData } from "./auth";
import { refreshStoredSession } from "./auth";
import { isOnline } from "./connectivity";

export class OfflineError extends Error {
  override name = "OfflineError";
  constructor(message = "No internet connectivity") {
    super(message);
  }
}

export class ReauthRequiredError extends Error {
  override name = "ReauthRequiredError";
  constructor(message = "Please sign in again") {
    super(message);
  }
}

/**
 * Call this before “important” protected actions (writes).
 * - If offline → throw OfflineError (keep user logged in)
 * - If refresh token is invalid → refreshStoredSession returns null → throw ReauthRequiredError
 */
export async function requireFreshAuth(): Promise<StoredAuthData> {
  const online = await isOnline();
  if (!online) {
    throw new OfflineError();
  }

  const auth = await refreshStoredSession();
  if (!auth) {
    throw new ReauthRequiredError();
  }

  return auth;
}

