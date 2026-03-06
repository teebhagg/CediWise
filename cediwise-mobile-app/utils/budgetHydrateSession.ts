/**
 * In-memory flag: has the app run budget hydrate once this session?
 * Used to avoid duplicate hydrate when both Home and Budget mount.
 * Resets on every app launch (no AsyncStorage).
 */
let hydratedThisSession = false;

export function hasHydratedThisSession(): boolean {
  return hydratedThisSession;
}

export function setHydratedThisSession(): void {
  hydratedThisSession = true;
}
