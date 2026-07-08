import { useCallback, useRef, useState } from "react";
import { Platform } from "react-native";

import {
  clearMoMoSmsListenerDebounce,
  isAndroidSmsListenerAvailable,
  isMoMoSmsListenerActive,
  startMoMoSmsListener,
  stopMoMoSmsListener,
} from "@/services/androidSmsListener";
import {
  getReadSmsPermissionGranted,
  getReceiveSmsPermissionGranted,
  getSmsPermissionStatus,
  requestSmsPermissions,
  type SmsPermissionSnapshot,
  type SmsPermissionStatus,
} from "@/services/androidSmsPermissions";
import {
  isAndroidSmsReaderAvailable,
  queryLast48hMoMoSms,
} from "@/services/androidSmsReader";
import type { MoMoSmsMessage } from "@/services/momoSmsFilters";
import {
  importSmsBatch,
  importSmsMessage,
  SmsImportClientError,
  toImportPayload,
  type SmsImportApiResult,
  type SmsImportBatchResult,
} from "@/services/smsImportClient";
import { useSmsTrackingStore } from "@/stores/smsTrackingStore";
import { hydrateBudgetStateFromRemote } from "@/utils/budgetHydrate";
import { isFeatureEnabled } from "@/utils/featureFlags";
import { log } from "@/utils/logger";
import { useBudgetStore } from "@/stores/budgetStore";

export type SmsSyncSummary = {
  found: number;
  parsed: number;
  duplicate: number;
  skipped: number;
  failed: number;
};

export type UseSmsImportOptions = {
  userId: string | null | undefined;
};

async function hydrateBudgetAfterImport(userId: string): Promise<void> {
  await hydrateBudgetStateFromRemote(userId, (state) =>
    useBudgetStore.getState().persistState(state),
  );
}

export function useSmsImport({ userId }: UseSmsImportOptions) {
  const [syncing, setSyncing] = useState(false);
  const [importingOne, setImportingOne] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const liveStartedForUserRef = useRef<string | null>(null);

  const optedIn = useSmsTrackingStore((s) => s.optedIn);
  const liveListenerEnabled = useSmsTrackingStore((s) => s.liveListenerEnabled);
  const lastSyncAt = useSmsTrackingStore((s) => s.lastSyncAt);
  const lastSyncSummary = useSmsTrackingStore((s) => s.lastSyncSummary);
  const hydrateTracking = useSmsTrackingStore((s) => s.hydrate);
  const setOptedIn = useSmsTrackingStore((s) => s.setOptedIn);
  const setLiveListenerEnabled = useSmsTrackingStore((s) => s.setLiveListenerEnabled);
  const recordSyncSummary = useSmsTrackingStore((s) => s.recordSyncSummary);

  const clearError = useCallback(() => setLastError(null), []);

  const hydrateUserTracking = useCallback(async () => {
    if (!userId) return;
    await hydrateTracking(userId);
  }, [hydrateTracking, userId]);

  const requestPermissions = useCallback(async (): Promise<SmsPermissionSnapshot> => {
    return requestSmsPermissions();
  }, []);

  const enableTracking = useCallback(async (): Promise<SmsPermissionSnapshot> => {
    if (!userId) {
      return {
        status: "unavailable",
        readSms: "unavailable",
        receiveSms: "unavailable",
      };
    }

    const snapshot = await requestSmsPermissions();
    if (snapshot.readSms === "granted") {
      await setOptedIn(userId, true);
    }
    return snapshot;
  }, [setOptedIn, userId]);

  const disableTracking = useCallback(async () => {
    if (!userId) return;
    stopMoMoSmsListener();
    liveStartedForUserRef.current = null;
    await setOptedIn(userId, false);
    await setLiveListenerEnabled(userId, false);
  }, [setLiveListenerEnabled, setOptedIn, userId]);

  const importOneMessage = useCallback(
    async (message: MoMoSmsMessage | { body: string; address?: string; date?: number }) => {
      if (!userId) {
        throw new SmsImportClientError("Not signed in", "unauthorized");
      }

      setImportingOne(true);
      setLastError(null);
      try {
        const result = await importSmsMessage(toImportPayload(message));
        if (result.status === "parsed") {
          await hydrateBudgetAfterImport(userId);
        }
        return result;
      } catch (error) {
        const messageText =
          error instanceof SmsImportClientError
            ? error.message
            : "Could not import SMS";
        setLastError(messageText);
        throw error;
      } finally {
        setImportingOne(false);
      }
    },
    [userId],
  );

  const syncLast48Hours = useCallback(async (): Promise<SmsSyncSummary> => {
    if (!userId) {
      throw new SmsImportClientError("Not signed in", "unauthorized");
    }
    if (Platform.OS !== "android") {
      throw new Error("sms_sync_android_only");
    }

    setSyncing(true);
    setLastError(null);

    try {
      const permission = await getSmsPermissionStatus();
      if (permission !== "granted") {
        throw new Error("sms_permission_denied");
      }

      const messages = await queryLast48hMoMoSms();
      let batch: SmsImportBatchResult;

      if (messages.length === 0) {
        batch = {
          ok: true,
          results: [],
          summary: { total: 0, parsed: 0, duplicate: 0, skipped: 0, failed: 0 },
        };
      } else {
        batch = await importSmsBatch(messages.map(toImportPayload));
      }

      const summary: SmsSyncSummary = {
        found: messages.length,
        parsed: batch.summary.parsed,
        duplicate: batch.summary.duplicate,
        skipped: batch.summary.skipped,
        failed: batch.summary.failed,
      };

      await recordSyncSummary(userId, summary);

      if (batch.summary.parsed > 0) {
        await hydrateBudgetAfterImport(userId);
      }

      return summary;
    } catch (error) {
      const messageText =
        error instanceof SmsImportClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Sync failed";
      log.warn("useSmsImport: sync failed", {
        message: messageText,
        code: error instanceof SmsImportClientError ? error.code : undefined,
        status: error instanceof SmsImportClientError ? error.status : undefined,
      });
      setLastError(messageText);
      throw error;
    } finally {
      setSyncing(false);
    }
  }, [recordSyncSummary, userId]);

  const toggleLiveListener = useCallback(
    async (enabled: boolean) => {
      if (!userId) return;
      await setLiveListenerEnabled(userId, enabled);
      if (!enabled) {
        stopMoMoSmsListener();
        liveStartedForUserRef.current = null;
      }
    },
    [setLiveListenerEnabled, userId],
  );

  const ensureLiveListener = useCallback(async () => {
    if (!userId || Platform.OS !== "android") return false;
    if (!optedIn || !liveListenerEnabled) return false;
    if (!isAndroidSmsListenerAvailable()) return false;

    const liveFlag = await isFeatureEnabled("momo_sms_live_import", userId);
    if (!liveFlag) return false;

    const readGranted = await getReadSmsPermissionGranted();
    const receiveGranted = await getReceiveSmsPermissionGranted();
    if (!readGranted || !receiveGranted) return false;

    if (isMoMoSmsListenerActive() && liveStartedForUserRef.current === userId) {
      return true;
    }

    const started = startMoMoSmsListener(async (message) => {
      try {
        await importOneMessage(message);
      } catch (error) {
        log.warn("useSmsImport: live import failed", error);
      }
    });

    if (started) {
      liveStartedForUserRef.current = userId;
    }
    return started;
  }, [importOneMessage, liveListenerEnabled, optedIn, userId]);

  const stopLiveListener = useCallback(() => {
    stopMoMoSmsListener();
    clearMoMoSmsListenerDebounce();
    liveStartedForUserRef.current = null;
  }, []);

  return {
    optedIn,
    liveListenerEnabled,
    lastSyncAt,
    lastSyncSummary,
    syncing,
    importingOne,
    lastError,
    clearError,
    hydrateUserTracking,
    requestPermissions,
    enableTracking,
    disableTracking,
    importOneMessage,
    syncLast48Hours,
    toggleLiveListener,
    ensureLiveListener,
    stopLiveListener,
    capabilities: {
      androidReader: isAndroidSmsReaderAvailable(),
      androidListener: isAndroidSmsListenerAvailable(),
      platform: Platform.OS,
    },
  };
}

export type { SmsImportApiResult };
