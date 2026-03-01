import { router } from "expo-router";
import { getPostAuthRoute } from "./profileVitals";

/**
 * Central post-login: resolve route from personalization status and navigate.
 * Call after persisting auth and refreshing AuthContext (caller's responsibility).
 */
export async function onLoginSuccess(userId: string): Promise<void> {
  const route = await getPostAuthRoute(userId);
  router.replace(route);
}
