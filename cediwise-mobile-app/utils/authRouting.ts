import { router } from "expo-router";
import { getPostAuthRoute } from "./profileVitals";
import {
  hasNotificationGateCompleted,
  setPendingNotificationRoute,
} from "@/services/notifications";

/**
 * Central post-login: resolve route from personalization status and navigate.
 * Call after persisting auth and refreshing AuthContext (caller's responsibility).
 */
export async function onLoginSuccess(userId: string): Promise<void> {
  const route = await getPostAuthRoute(userId);
  const notificationGateCompleted = await hasNotificationGateCompleted();

  if (!notificationGateCompleted) {
    await setPendingNotificationRoute(route);
    router.replace("/notifications");
    return;
  }

  router.replace(route);
}
