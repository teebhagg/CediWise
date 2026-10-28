import { useCallback, useRef, useState } from "react";
import { Platform } from "react-native";

import { ALL_MOMO_NETWORKS } from "@/constants/smsImport";
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
  requestReadSmsPermission as requestReadSmsPermissionFromAndroid,
  requestReceiveSmsPermission as requestReceiveSmsPermissionFromAndroid,
  type SmsPermissionSnapshot,
} from "@/services/androidSmsPermissions";
import {
  isAndroidSmsReaderAvailable,
  queryMoMoSmsSince,
} from "@/services/androidSmsReader";
import {
  filterMoMoSmsMessages,
  isScanEligibleSender,
  type MoMoSmsMessage,
} from "@/services/momoSmsFilters";
import {
  buildSmsExpenseCaptureItems,
  type SmsExpenseCaptureItem,
} from "@/services/momoSmsExpensePreview";
import { notifyMoMoLiveImport } from "@/services/momoLiveImportNotify";
import { formatLiveImportResultBody } from "@/utils/formatLiveImportResultBody";
import {
  importSmsBatch,
  importSmsMessage,
  SmsImportClientError,
  toImportPayload,
  type SmsImportCandidatePayload,
  type SmsImportApiResult,
  type SmsImportBatchResult,
} from "@/services/smsImportClient";
import { useSmsTrackingStore } from "@/stores/smsTrackingStore";
import { hydrateBudgetStateFromRemote } from "@/utils/budgetHydrate";
import { isFeatureEnabled } from "@/utils/featureFlags";
import { log } from "@/utils/logger";
import {
  readLiveCatchUpAtMs,
  writeLiveCatchUpAtMs,
  clearLiveCatchUpAtMs,
} from "@/utils/momoLiveCatchUpStorage";
import { resolveLiveCatchUpMinDateMs } from "@/utils/momoLiveCatchUpWindow";
import { useBudgetStore } from "@/stores/budgetStore";
import { supabase } from "@/utils/supabase";
import {
  configureNativeMoMoCapture,
  dismissNativeMoMoQueueItem,
  enqueueNativeMoMoReview,
  getNativeMoMoQueueItems,
  isNativeMoMoCaptureAvailable,
  pauseNativeMoMoCapture,
  resolveNativeMoMoQueueReview,
  retryNativeMoMoQueue,
} from "@/services/androidMoMoQueue";
import { IOS_MOMO_HISTORY_MAX_DAYS } from "@/services/iosMomoHistoryHandoff";

export type SmsSyncSummary = {
  found: number;
  parsed: number;
  duplicate: number;
  skipped: number;
  failed: number;
  needsReview: number;
  retryable: number;
  reversed: number;
  noActiveBudgetCycle?: boolean;
};

export type SmsSyncScanResult = {
  found: number;
  expenses: SmsExpenseCaptureItem[];
};

export type UseSmsImportOptions = {
  userId: string | null | undefined;
};

async function hydrateBudgetAfterImport(userId: string): Promise<void> {
  await hydrateBudgetStateFromRemote(userId, (state) =>
    useBudgetStore.getState().persistState(state),
  );
}

async function fetchProfileCreatedAtMs(userId: string): Promise<number | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("created_at")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      log.warn("useSmsImport: profile created_at fetch failed", error);
      return null;
    }
    const raw = (data as { created_at?: unknown } | null)?.created_at;
    if (typeof raw !== "string") return null;
    const ms = new Date(raw).getTime();
    return Number.isFinite(ms) ? ms : null;
  } catch (error) {
    log.warn("useSmsImport: profile created_at fetch threw", error);
    return null;
  }
}

/** Lower bound for SMS sync: later of lookback window start and profile creation. */
export { resolveSmsSyncMinDateMs } from "@/utils/smsSyncWindow";

function getActiveCycleCategories(): {
  id: string;
  name: string;
  bucket: string;
}[] {
  const state = useBudgetStore.getState().state;
  if (!state?.cycles.length) return [];
  const sorted = [...state.cycles].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
  );
  const activeCycleId = sorted[0]?.id;
  if (!activeCycleId) return [];
  return state.categories
    .filter((c) => c.cycleId === activeCycleId && !c.isArchived)
    .map((c) => ({ id: c.id, name: c.name, bucket: c.bucket }));
}

export function useSmsImport({ userId }: UseSmsImportOptions) {
  const [syncing, setSyncing] = useState(false);
  const [importingOne, setImportingOne] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const liveStartedForUserRef = useRef<string | null>(null);
  const catchUpInFlightRef = useRef(false);

  const optedIn = useSmsTrackingStore((s) => s.optedIn);
  const liveListenerEnabled = useSmsTrackingStore((s) => s.liveListenerEnabled);
  const lastSyncAt = useSmsTrackingStore((s) => s.lastSyncAt);
  const lastSyncSummary = useSmsTrackingStore((s) => s.lastSyncSummary);
  const providers = useSmsTrackingStore((s) => s.providers);
  const hydrateTracking = useSmsTrackingStore((s) => s.hydrate);
  const setOptedIn = useSmsTrackingStore((s) => s.setOptedIn);
  const setLiveListenerEnabled = useSmsTrackingStore((s) => s.setLiveListenerEnabled);
  const setProviderEnabledInStore = useSmsTrackingStore((s) => s.setProviderEnabled);
  const recordSyncSummary = useSmsTrackingStore((s) => s.recordSyncSummary);

  const clearError = useCallback(() => setLastError(null), []);

  const hydrateUserTracking = useCallback(async () => {
    if (!userId) return;
    await hydrateTracking(userId);
  }, [hydrateTracking, userId]);

  const requestPermissions = useCallback(async (): Promise<SmsPermissionSnapshot> => {
    return requestReadSmsPermissionFromAndroid();
  }, []);

  const requestReceiveSmsPermission = useCallback(async (): Promise<SmsPermissionSnapshot> => {
    return requestReceiveSmsPermissionFromAndroid();
  }, []);

  const enableTracking = useCallback(async (): Promise<SmsPermissionSnapshot> => {
    if (!userId) {
      return {
        status: "unavailable",
        readSms: "unavailable",
        receiveSms: "unavailable",
      };
    }

    const snapshot = await requestReadSmsPermissionFromAndroid();
    if (snapshot.readSms === "granted") {
      await setOptedIn(userId, true);
      const liveFlag = await isFeatureEnabled("momo_sms_live_import", userId);
      await configureNativeMoMoCapture(
        liveFlag && snapshot.receiveSms === "granted" && liveListenerEnabled,
        userId,
        [...ALL_MOMO_NETWORKS],
      );
    }
    return snapshot;
  }, [liveListenerEnabled, setOptedIn, userId]);

  const enableIosShortcutTracking = useCallback(async (): Promise<boolean> => {
    if (!userId || Platform.OS !== "ios") return false;
    if (!(await isFeatureEnabled("momo_sms_live_import", userId))) return false;
    await setOptedIn(userId, true);
    await setLiveListenerEnabled(userId, true);
    return true;
  }, [setLiveListenerEnabled, setOptedIn, userId]);

  const disableTracking = useCallback(async () => {
    if (!userId) return;
    stopMoMoSmsListener();
    liveStartedForUserRef.current = null;
    await clearLiveCatchUpAtMs(userId);
    await configureNativeMoMoCapture(false, null);
    await setOptedIn(userId, false);
    await setLiveListenerEnabled(userId, false);
  }, [setLiveListenerEnabled, setOptedIn, userId]);

  const importOneMessage = useCallback(
    async (
      message: MoMoSmsMessage | { body: string; address?: string; date?: number },
      options?: { notify?: boolean },
    ) => {
      if (!userId) {
        throw new SmsImportClientError("Not signed in", "unauthorized");
      }

      const shouldNotify = options?.notify === true;
      setImportingOne(true);
      setLastError(null);
      try {
        if (shouldNotify) {
          await notifyMoMoLiveImport({
            title: "Mobile money update",
            body: "Checking a transaction securely",
          });
        }
        const normalizedMessage = {
          ...message,
          date: message.date ?? Date.now(),
        };
        const payload = await toImportPayload(normalizedMessage);
        if (!payload) {
          throw new SmsImportClientError(
            "This message is not a supported MTN, Telecel, or AT Money transaction.",
            "invalid_payload",
          );
        }
        const result = await importSmsMessage(payload);
        if (result.status === "parsed") {
          await hydrateBudgetAfterImport(userId);
        }
        if (shouldNotify) {
          if (result.status === "parsed") {
            await notifyMoMoLiveImport({
              title: "Transaction added",
              body: "Open CediWise to view or undo it",
            });
          } else if (result.status === "duplicate") {
            await notifyMoMoLiveImport({
              title: "Already in your budget",
              body: "This MoMo payment was imported earlier",
            });
          }
        }
        return result;
      } catch (error) {
        const messageText =
          error instanceof SmsImportClientError
            ? error.message
            : "Could not import SMS";
        setLastError(messageText);
        if (shouldNotify) {
          await notifyMoMoLiveImport({
            title: "MoMo import issue",
            body: messageText,
          });
        }
        throw error;
      } finally {
        setImportingOne(false);
      }
    },
    [userId],
  );

  const scanHistory = useCallback(async (days: 2 | 7 | 30 = 2): Promise<SmsSyncScanResult> => {
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

      const nowMs = Date.now();
      const profileCreatedAtMs = await fetchProfileCreatedAtMs(userId);
      const requestedMinDateMs = nowMs - days * 24 * 60 * 60 * 1000;
      const minDateMs = profileCreatedAtMs == null
        ? requestedMinDateMs
        : Math.max(requestedMinDateMs, profileCreatedAtMs);
      const messages = await queryMoMoSmsSince(minDateMs, nowMs);
      const enabledMessages = messages.filter((message) =>
        isScanEligibleSender(message.address),
      );
      const expenses = buildSmsExpenseCaptureItems(enabledMessages, {
        categories: getActiveCycleCategories(),
        minDateMs,
        maxDateMs: nowMs,
      });

      return {
        found: enabledMessages.length,
        expenses,
      };
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
  }, [userId]);

  const prepareShortcutHistory = useCallback((messages: MoMoSmsMessage[]): SmsSyncScanResult => {
    const nowMs = Date.now();
    const minDateMs = nowMs - IOS_MOMO_HISTORY_MAX_DAYS * 24 * 60 * 60 * 1000;
    const eligibleMessages = filterMoMoSmsMessages(messages, { minDateMs, maxDateMs: nowMs })
      .filter((message) => isScanEligibleSender(message.address));

    return {
      found: eligibleMessages.length,
      expenses: buildSmsExpenseCaptureItems(eligibleMessages, {
        categories: getActiveCycleCategories(),
        minDateMs,
        maxDateMs: nowMs,
      }),
    };
  }, []);

  const saveCapturedExpenses = useCallback(
    async (items: SmsExpenseCaptureItem[]): Promise<SmsSyncSummary> => {
      if (!userId) {
        throw new SmsImportClientError("Not signed in", "unauthorized");
      }

      setSyncing(true);
      setLastError(null);

      try {
        let batch: SmsImportBatchResult;
        const locallySkipped = items.filter((item) => item.classification === "transfer").length;
        const locallyNeedsReview = items.filter(
          (item) => item.eventType === "p2p_send" && item.classification == null,
        ).length;
        const importItems = items.filter(
          (item) => item.classification !== "transfer" &&
            !(item.eventType === "p2p_send" && item.classification == null),
        );
        const builtPayloads = await Promise.all(
          importItems.map((item) => toImportPayload(item.message, item.categoryId, item.classification)),
        );
        const uploadPayloads = builtPayloads.filter(
          (payload): payload is SmsImportCandidatePayload => payload != null,
        );
        const locallyUnimportable = builtPayloads.length - uploadPayloads.length;

        if (uploadPayloads.length === 0) {
          batch = {
            ok: true,
            results: [],
            summary: { total: 0, parsed: 0, duplicate: 0, skipped: 0, failed: 0, needs_review: 0, retryable: 0, reversed: 0 },
          };
        } else {
          batch = await importSmsBatch(uploadPayloads);
        }

        const summary: SmsSyncSummary = {
          found: items.length,
          parsed: batch.summary.parsed,
          duplicate: batch.summary.duplicate,
          skipped: batch.summary.skipped + locallySkipped + locallyUnimportable,
          failed: batch.summary.failed,
          needsReview: batch.summary.needs_review + locallyNeedsReview,
          retryable: batch.summary.retryable,
          reversed: batch.summary.reversed,
          noActiveBudgetCycle: batch.results.some(
            (row) => row.errorCode === "no_active_budget_cycle",
          ),
        };

        await recordSyncSummary(userId, summary);

        const itemErrors = batch.results.flatMap((row, index) => {
          if (row.status === "parsed" || row.status === "duplicate") return [];
          return [{ index, status: row.status, error: row.error ?? null, importLogId: row.importLogId ?? null }];
        });
        if (itemErrors.length > 0) {
          console.error("[import-sms] add transactions item errors", itemErrors);
        }

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
              : "Save failed";
        console.error("[import-sms] add transactions failed", error);
        log.warn("useSmsImport: save captured expenses failed", {
          message: messageText,
          code: error instanceof SmsImportClientError ? error.code : undefined,
          status: error instanceof SmsImportClientError ? error.status : undefined,
        });
        setLastError(messageText);
        throw error;
      } finally {
        setSyncing(false);
      }
    },
    [recordSyncSummary, userId],
  );

  const toggleLiveListener = useCallback(
    async (enabled: boolean) => {
      if (!userId) return;
      if (
        enabled &&
        (!optedIn ||
          !(await isFeatureEnabled("momo_sms_live_import", userId)) ||
          !(await getReceiveSmsPermissionGranted()))
      ) {
        return;
      }
      await setLiveListenerEnabled(userId, enabled);
      await configureNativeMoMoCapture(
        enabled && optedIn,
        enabled ? userId : null,
        [...ALL_MOMO_NETWORKS],
      );
      if (!enabled) {
        stopMoMoSmsListener();
        liveStartedForUserRef.current = null;
        await clearLiveCatchUpAtMs(userId);
      }
    },
    [optedIn, setLiveListenerEnabled, userId],
  );

  const setProviderEnabled = useCallback(async (provider: keyof typeof providers, enabled: boolean) => {
    if (!userId) return;
    await setProviderEnabledInStore(userId, provider, enabled);
  }, [setProviderEnabledInStore, userId]);

  const ensureLiveListener = useCallback(async () => {
    if (!userId || Platform.OS !== "android") return false;
    if (!optedIn || !liveListenerEnabled) return false;
    if (!isAndroidSmsListenerAvailable()) return false;

    const liveFlag = await isFeatureEnabled("momo_sms_live_import", userId);
    if (!liveFlag) {
      stopMoMoSmsListener();
      liveStartedForUserRef.current = null;
      await pauseNativeMoMoCapture(userId);
      return false;
    }

    const readGranted = await getReadSmsPermissionGranted();
    const receiveGranted = await getReceiveSmsPermissionGranted();
    if (!readGranted || !receiveGranted) {
      stopMoMoSmsListener();
      liveStartedForUserRef.current = null;
      await pauseNativeMoMoCapture(userId);
      return false;
    }

    await configureNativeMoMoCapture(true, userId, [...ALL_MOMO_NETWORKS]);

    if (isMoMoSmsListenerActive() && liveStartedForUserRef.current === userId) {
      return true;
    }

    const started = startMoMoSmsListener(async (message) => {
      try {
        await importOneMessage(message, { notify: true });
        await writeLiveCatchUpAtMs(userId, Date.now());
      } catch (error) {
        log.warn("useSmsImport: live import failed", error);
      }
    });

    if (started) {
      liveStartedForUserRef.current = userId;
    }
    return started;
  }, [importOneMessage, liveListenerEnabled, optedIn, userId]);

  /**
   * When Auto-add is on, scan recent inbox on foreground.
   * Compensates for the native SMS listener unregistering while CediWise is paused
   * (e.g. user is in the MoMo app sending money).
   */
  const catchUpLiveImports = useCallback(async () => {
    if (!userId || Platform.OS !== "android") return;
    if (!optedIn || !liveListenerEnabled) return;

    const liveFlag = await isFeatureEnabled("momo_sms_live_import", userId);
    if (!liveFlag) {
      stopMoMoSmsListener();
      liveStartedForUserRef.current = null;
      await pauseNativeMoMoCapture(userId);
      return;
    }

    const receiveGranted = await getReceiveSmsPermissionGranted();
    if (!receiveGranted) {
      stopMoMoSmsListener();
      liveStartedForUserRef.current = null;
      await pauseNativeMoMoCapture(userId);
      return;
    }

    if (catchUpInFlightRef.current || syncing) return;
    if (!isAndroidSmsReaderAvailable()) return;

    const readGranted = await getReadSmsPermissionGranted();
    if (!readGranted) {
      stopMoMoSmsListener();
      liveStartedForUserRef.current = null;
      await pauseNativeMoMoCapture(userId);
      return;
    }

    catchUpInFlightRef.current = true;
    try {
      const nowMs = Date.now();
      const lastCatchUpAtMs = await readLiveCatchUpAtMs(userId);
      const minDateMs = resolveLiveCatchUpMinDateMs(nowMs, lastCatchUpAtMs);
      const messages = await queryMoMoSmsSince(minDateMs, nowMs);

      if (messages.length === 0) {
        await writeLiveCatchUpAtMs(userId, nowMs);
        return;
      }

      const uploadPayloads: SmsImportCandidatePayload[] = [];
      const reviewCandidates: SmsImportCandidatePayload[] = [];
      let locallySkipped = 0;
      for (const message of messages) {
        const payload = await toImportPayload(message);
        if (!payload) {
          locallySkipped += 1;
          continue;
        }
        const candidate = payload.candidate;
        const needsReview =
          (candidate.eventType === "p2p_send" && candidate.classification == null) ||
          (candidate.eventType === "reversal" && candidate.reversedReceiptId == null) ||
          candidate.eventType === "unknown" ||
          candidate.confidence === "low";
        if (needsReview) {
          reviewCandidates.push(payload);
          continue;
        }
        uploadPayloads.push(payload);
      }
      for (const payload of reviewCandidates) {
        const queued = await enqueueNativeMoMoReview(payload.candidate);
        if (!queued) {
          throw new Error("Could not save a MoMo payment for review. Reopen the import screen and try again.");
        }
      }
      const batch = await importSmsBatch(uploadPayloads);

      const summary: SmsSyncSummary = {
        found: messages.length,
        parsed: batch.summary.parsed,
        duplicate: batch.summary.duplicate,
        skipped: batch.summary.skipped + locallySkipped,
        failed: batch.summary.failed,
        needsReview: batch.summary.needs_review + reviewCandidates.length,
        retryable: batch.summary.retryable,
        reversed: batch.summary.reversed,
        noActiveBudgetCycle: batch.results.some(
          (row) => row.errorCode === "no_active_budget_cycle",
        ),
      };

      await recordSyncSummary(userId, summary);

      if (batch.summary.parsed > 0) {
        await hydrateBudgetAfterImport(userId);
      }

      if (batch.summary.failed === 0 && batch.summary.retryable === 0) {
        await writeLiveCatchUpAtMs(userId, nowMs);
      }

      const notificationBody = [
        formatLiveImportResultBody({
          ...batch.summary,
          needs_review: summary.needsReview,
        }),
        summary.noActiveBudgetCycle
          ? "Set up a budget cycle covering these payment dates, then scan again."
          : null,
      ].filter(Boolean).join(" · ");
      const notificationTitle = batch.summary.parsed > 1
        ? "Transactions added"
        : batch.summary.parsed === 1
          ? "Transaction added"
          : "Message check complete";

      await notifyMoMoLiveImport({
        title: notificationTitle,
        body: notificationBody,
      });
    } catch (error) {
      log.warn("useSmsImport: live catch-up failed", error);
      await notifyMoMoLiveImport({
        title: "MoMo sync issue",
        body:
          error instanceof Error
            ? error.message
            : "Could not check recent payment texts",
      });
    } finally {
      catchUpInFlightRef.current = false;
    }
  }, [
    liveListenerEnabled,
    optedIn,
    recordSyncSummary,
    syncing,
    userId,
  ]);

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
    providers,
    syncing,
    importingOne,
    lastError,
    clearError,
    hydrateUserTracking,
    requestPermissions,
    requestReadSmsPermission: requestPermissions,
    requestReceiveSmsPermission,
    enableTracking,
    enableIosShortcutTracking,
    disableTracking,
    importOneMessage,
    scanHistory,
    prepareShortcutHistory,
    syncLast48Hours: () => scanHistory(2),
    saveCapturedExpenses,
    toggleLiveListener,
    setProviderEnabled,
    ensureLiveListener,
    catchUpLiveImports,
    stopLiveListener,
    getNativeQueueItems: getNativeMoMoQueueItems,
    retryNativeQueue: retryNativeMoMoQueue,
    resolveNativeQueueReview: resolveNativeMoMoQueueReview,
    dismissNativeQueueItem: dismissNativeMoMoQueueItem,
    capabilities: {
      androidReader: isAndroidSmsReaderAvailable(),
      androidListener: isAndroidSmsListenerAvailable(),
      durableAndroidCapture: isNativeMoMoCaptureAvailable(),
      platform: Platform.OS,
    },
  };
}

export type { SmsImportApiResult, SmsExpenseCaptureItem };
