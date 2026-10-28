import { NativeModules, Platform } from "react-native";

import { ALL_MOMO_NETWORKS, getSmsImportApiUrl } from "@/constants/smsImport";
import type { MoMoImportCandidate } from "@/services/momoImportCandidate";
import { getStoredAuthData, refreshStoredSession } from "@/utils/auth";

export type NativeMoMoQueueItem = {
  userId?: string;
  state: "pending" | "review" | "retryable" | "auth_required" | "failed_terminal";
  attempts: number;
  errorCode?: "no_active_budget_cycle" | string;
  candidate: MoMoImportCandidate;
};

type NativeMoMoModule = {
  configure(enabled: boolean, userId: string | null, token: string | null, apiUrl: string, providers: string[]): Promise<boolean>;
  pause(userId: string): Promise<boolean>;
  getQueueItems(): Promise<NativeMoMoQueueItem[]>;
  enqueueReview(candidateJson: string): Promise<boolean>;
  retry(): Promise<boolean>;
  resolveReview(clientImportId: string, classification: "expense" | "transfer"): Promise<boolean>;
  dismissQueueItem(clientImportId: string): Promise<boolean>;
  clearQueue(): Promise<boolean>;
};

function module(): NativeMoMoModule | null {
  if (Platform.OS !== "android") return null;
  return (NativeModules.CediWiseMoMoSms as NativeMoMoModule | undefined) ?? null;
}

export async function configureNativeMoMoCapture(enabled: boolean, userId: string | null, providers: string[] = [...ALL_MOMO_NETWORKS]): Promise<boolean> {
  const native = module();
  if (!native) return false;
  const apiUrl = getSmsImportApiUrl();
  if (!userId) {
    return native.configure(false, null, null, apiUrl, providers);
  }
  if (!enabled || !apiUrl.startsWith("https://")) {
    await pauseNativeMoMoCapture(userId);
    return false;
  }

  let token: string | null = null;
  try {
    await refreshStoredSession();
    token = (await getStoredAuthData({ allowExpired: false }))?.accessToken ?? null;
  } catch {
    await pauseNativeMoMoCapture(userId);
    return false;
  }
  if (!token) {
    await pauseNativeMoMoCapture(userId);
    return false;
  }
  return native.configure(true, userId, token, apiUrl, providers);
}

export async function getNativeMoMoQueueItems(): Promise<NativeMoMoQueueItem[]> {
  return (await module()?.getQueueItems()) ?? [];
}

export async function enqueueNativeMoMoReview(
  candidate: MoMoImportCandidate,
): Promise<boolean> {
  return (await module()?.enqueueReview(JSON.stringify(candidate))) ?? false;
}

export async function retryNativeMoMoQueue(): Promise<void> {
  await module()?.retry();
}

export async function resolveNativeMoMoQueueReview(
  clientImportId: string,
  classification: "expense" | "transfer",
): Promise<boolean> {
  return (await module()?.resolveReview(clientImportId, classification)) ?? false;
}

export async function dismissNativeMoMoQueueItem(clientImportId: string): Promise<boolean> {
  return (await module()?.dismissQueueItem(clientImportId)) ?? false;
}

export async function clearNativeMoMoQueue(): Promise<void> {
  await module()?.clearQueue();
}

/** Stop background work and erase account-bound SMS captures before logout or opt-out. */
export async function stopAndClearNativeMoMoCapture(): Promise<void> {
  const native = module();
  if (!native) return;
  try {
    await native.configure(false, null, null, getSmsImportApiUrl(), [...ALL_MOMO_NETWORKS]);
  } catch {
    // Continue with queue removal even if native configuration is unavailable during teardown.
  }
  try {
    await native.clearQueue();
  } catch {
    // Logout and opt-out must still complete if the native module is already shutting down.
  }
}

/** Pause the release-gated worker without discarding this signed-in user's queue. */
export async function pauseNativeMoMoCapture(userId: string): Promise<void> {
  const native = module();
  if (!native) return;
  try {
    await native.pause(userId);
  } catch {
    // Do not erase recoverable imports when native pause is temporarily unavailable.
  }
}

export function isNativeMoMoCaptureAvailable(): boolean {
  return module() != null;
}
