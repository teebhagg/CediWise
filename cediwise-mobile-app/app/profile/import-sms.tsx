import Constants from "expo-constants";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { BookOpen, CalendarDays, Check, ClipboardPaste, Cog, ExternalLink, MessageSquareText, RefreshCw, ShieldCheck, Smartphone } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, AppState, Linking, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppTextField } from "@/components/AppTextField";
import { CustomBottomSheet } from "@/components/common/CustomBottomSheet";
import { BackButton } from "@/components/BackButton";
import { Card } from "@/components/Card";
import { DEFAULT_STANDARD_HEIGHT, StandardHeader } from "@/components/CediWiseHeader";
import { KeyboardAwareScrollView } from "@/components/KeyboardAwareScrollView";
import { PrimaryButton } from "@/components/PrimaryButton";
import { getScanButtonState, PASTE_TOO_SHORT_MESSAGE } from "@/constants/smsImport";
import { useAppToast } from "@/hooks/useAppToast";
import { useAuth } from "@/hooks/useAuth";
import { useSmsImport } from "@/hooks/useSmsImport";
import { formatSyncResultMessage, MoMoSmsPermissionDisclosureDialog } from "@/components/features/profile/MoMoTrackingDialogs";
import type { NativeMoMoQueueItem } from "@/services/androidMoMoQueue";
import { getReadSmsPermissionGranted, getReceiveSmsPermissionGranted, getSmsPermissionStatus } from "@/services/androidSmsPermissions";
import { previewSmsExpense, type SmsExpenseCaptureItem } from "@/services/momoSmsExpensePreview";
import { SmsImportClientError } from "@/services/smsImportClient";
import { formatCurrency } from "@/utils/formatCurrency";
import { clearMomoImportIntros, markMomoImportStepsSeen, readMomoImportStepsSeen } from "@/utils/momoImportIntro";
import { getStandardHeaderBodyOffsetTop } from "@/utils/screenHeaderInsets";
import { isMoMoSmsLiveImportEnabled } from "@/utils/featureFlags";
import { useSmsTrackingStore } from "@/stores/smsTrackingStore";
import {
  IOS_MOMO_HISTORY_MAX_DAYS,
  IOS_MOMO_HISTORY_MAX_MESSAGES,
  parseShortcutHistoryParams,
  type ShortcutHistoryParams,
} from "@/services/iosMomoHistoryHandoff";

const IMPORT_STEPS = [
  { icon: CalendarDays, color: "#34D399", title: "Choose a window", detail: "Look back 2, 7, or 30 days for MoMo expenses." },
  { icon: RefreshCw, color: "#34D399", title: "Tap Scan SMS", detail: "We list the MoMo expenses we find. Nothing is logged yet." },
  { icon: Check, color: "#34D399", title: "Review, then log", detail: "Untick any you do not want, then log the rest as budget expenses." },
  { icon: MessageSquareText, color: "#60A5FA", title: "Or paste one SMS", detail: "Paste one MoMo SMS and log that expense yourself." },
  { icon: Smartphone, color: "#E2E8F0", title: "Capture settings", detail: "Turn on automatic logging of new MoMo expenses." },
  { icon: BookOpen, color: "#E2E8F0", title: "Open this again", detail: "Use the book beside the phone settings." },
] as const;

const IOS_IMPORT_STEPS = [
  { icon: Smartphone, color: "#60A5FA", title: "Find recent messages", detail: "On iOS 26 or later, use Find Messages in a Shortcut. Filter to a MoMo sender and the last 30 days, then limit results to 10." },
  { icon: MessageSquareText, color: "#60A5FA", title: "Send one batch", detail: "For each result, URL Encode the body, sender, and received date in ISO 8601 format. Join the repeated query fields and open the CediWise link shown below." },
  { icon: Check, color: "#34D399", title: "Review, then log", detail: "CediWise filters supported Ghana MoMo payments and shows the expenses for review before saving." },
  { icon: Smartphone, color: "#E2E8F0", title: "Capture new messages", detail: "A Message automation can send each new alert to CediWise. The app opens to process every match." },
  { icon: ClipboardPaste, color: "#60A5FA", title: "Paste one message", detail: "Use the paste option for a single alert. CediWise cannot scan the iPhone Messages inbox directly." },
] as const;

type ScanDays = 2 | 7 | 30;

/** Two 44px actions plus the header's 10px gap before each one. */
const HEADER_ACTIONS_WIDTH = 108;
const ADD_BUTTON_HEIGHT = 52;
const ADD_BAR_TOP_PADDING = 12;

function addBarHeight(bottomInset: number) {
  return ADD_BAR_TOP_PADDING + ADD_BUTTON_HEIGHT + Math.max(bottomInset, 16);
}

function searchParamValues(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value;
  return typeof value === "string" ? [value] : [];
}

function getHistoryShortcutUrl(): string {
  const configuredScheme = Constants.expoConfig?.scheme;
  const scheme = typeof configuredScheme === "string"
    ? configuredScheme
    : Array.isArray(configuredScheme) && configuredScheme[0]
      ? configuredScheme[0]
      : Constants.expoConfig?.ios?.bundleIdentifier ?? "com.cediwise.app";
  return scheme + "://profile/import-sms?";
}

function reviewPayee(description: string): { name: string; reference: string | null } {
  const withoutPrefix = description.replace(/^MoMo\s*(?:→|->)\s*/, "");
  const reference = withoutPrefix.match(/\(#(\d+)\)$/)?.[1] ?? null;
  const name = withoutPrefix.replace(/\s*\(#\d+\)$/, "").trim();
  return { name: name || description, reference };
}

function reviewKind(eventType: SmsExpenseCaptureItem["eventType"]): string | null {
  if (eventType === "airtime_data") return "Airtime";
  if (eventType === "bill_payment") return "Bill";
  if (eventType === "merchant_payment") return "Payment";
  if (eventType === "reversal") return "Reversal";
  return null;
}

function ReviewTransactionCard({
  item,
  selected,
  onToggle,
  onClassify,
}: {
  item: SmsExpenseCaptureItem;
  selected: boolean;
  onToggle: () => void;
  onClassify: (classification: "expense" | "transfer") => void;
}) {
  const { name, reference } = reviewPayee(item.description);
  const kind = reviewKind(item.eventType);
  const needsChoice = item.eventType === "p2p_send" && item.classification == null;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${selected ? "Selected" : "Not selected"}, ${name}, ${formatCurrency(item.amount)} cedis`}
      onPress={onToggle}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
      className={`mb-2 rounded-md border p-4 ${selected ? "border-emerald-400/80 bg-emerald-500/10" : "border-slate-800 bg-slate-950"}`}
    >
      <View className="flex-row items-start gap-3">
        <View className={`mt-0.5 h-6 w-6 items-center justify-center rounded-md border ${selected ? "border-emerald-400 bg-emerald-500" : "border-slate-600"}`}>
          {selected ? <Check size={15} color="#052e22" /> : null}
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-base font-semibold text-white" numberOfLines={2}>{name}</Text>
          <Text className="mt-1 text-sm text-slate-300">
            {[kind, item.categoryName].filter(Boolean).join(" · ")}
          </Text>
          <Text className="mt-0.5 text-sm text-slate-400">{item.receivedAtLabel}</Text>
          {reference ? <Text className="mt-0.5 text-sm text-slate-400">Ref {reference}</Text> : null}
        </View>
        {item.eventType === "reversal" ? (
          <Text className="shrink-0 text-base font-semibold text-emerald-300">
            {item.amount > 0 ? `+₵${formatCurrency(item.amount)}` : "Refund"}
          </Text>
        ) : (
          <Text className="shrink-0 text-base font-semibold text-rose-300">−₵{formatCurrency(item.amount)}</Text>
        )}
      </View>
      {item.eventType === "p2p_send" ? (
        <View className="ml-9 mt-3">
          <Text className="mb-2 text-sm text-slate-300">
            {needsChoice ? "Choose expense or transfer before adding." : "What was this?"}
          </Text>
          <View className="flex-row gap-2">
            {(["expense", "transfer"] as const).map((value) => {
              const active = item.classification === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Mark as ${value}`}
                  onPress={(event) => {
                    event.stopPropagation();
                    onClassify(value);
                  }}
                  style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
                  className={`min-h-11 flex-1 items-center justify-center rounded-md ${active ? "bg-amber-400" : "bg-slate-800"}`}
                >
                  <Text className={active ? "font-semibold capitalize text-amber-950" : "font-medium capitalize text-slate-200"}>{value}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function ImportSmsScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{
    momoMessage?: string | string[];
    momoSender?: string | string[];
    momoHistoryMessage?: string | string[];
    momoHistorySender?: string | string[];
    momoHistoryDate?: string | string[];
  }>();
  const insets = useSafeAreaInsets();
  const barHeight = addBarHeight(insets.bottom);
  const { user, isLoading: authLoading } = useAuth();
  const { showError, showInfo, showSuccess } = useAppToast();
  const sms = useSmsImport({ userId: user?.id });
  const hydrateUserTracking = sms.hydrateUserTracking;
  const importOneMessage = sms.importOneMessage;
  const getNativeQueueItems = sms.getNativeQueueItems;
  const shortcutMessage = Array.isArray(searchParams.momoMessage)
    ? searchParams.momoMessage[0] ?? ""
    : searchParams.momoMessage ?? "";
  const shortcutSender = Array.isArray(searchParams.momoSender)
    ? searchParams.momoSender[0] ?? ""
    : searchParams.momoSender ?? "";
  const shortcutHistoryKey = JSON.stringify([
    searchParamValues(searchParams.momoHistoryMessage),
    searchParamValues(searchParams.momoHistorySender),
    searchParamValues(searchParams.momoHistoryDate),
  ]);
  const shortcutHistoryParams = useMemo(() => {
    const [message = [], sender = [], date = []] = JSON.parse(shortcutHistoryKey) as [
      string[],
      string[],
      string[],
    ];
    return { message, sender, date } satisfies ShortcutHistoryParams;
  }, [shortcutHistoryKey]);
  const hasShortcutHistory =
    (shortcutHistoryParams.message?.length ?? 0) > 0 ||
    (shortcutHistoryParams.sender?.length ?? 0) > 0 ||
    (shortcutHistoryParams.date?.length ?? 0) > 0;
  const [message, setMessage] = useState("");
  const [days, setDays] = useState<ScanDays>(2);
  const [permission, setPermission] = useState<string>("checking");
  const [receivePermissionGranted, setReceivePermissionGranted] = useState(false);
  const [queueItems, setQueueItems] = useState<NativeMoMoQueueItem[]>([]);
  const [liveImportAvailable, setLiveImportAvailable] = useState(false);
  const [queueActionId, setQueueActionId] = useState<string | null>(null);
  const [reviewItems, setReviewItems] = useState<SmsExpenseCaptureItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [scanningInbox, setScanningInbox] = useState(false);
  const [showReadDisclosure, setShowReadDisclosure] = useState(false);
  const [requestingReadPermission, setRequestingReadPermission] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  // State lags a render behind a tap; this ref makes scan and save mutually exclusive at entry,
  // including while a scan is still waiting on the SMS permission.
  const busyRef = useRef<"scan" | "save" | null>(null);
  const [stepsOpen, setStepsOpen] = useState(false);
  const stepsMarkedFor = useRef<string | null>(null);
  const processedShortcutRef = useRef<string | null>(null);
  const shortcutOperationRef = useRef(0);
  const processedShortcutHistoryRef = useRef(false);
  const steps = Platform.OS === "ios" ? IOS_IMPORT_STEPS : IMPORT_STEPS;
  const prepareShortcutHistory = sms.prepareShortcutHistory;
  const historyShortcutUrl = getHistoryShortcutUrl();

  const openSteps = useCallback(() => {
    if (user?.id && stepsMarkedFor.current !== user.id) {
      stepsMarkedFor.current = user.id;
      void markMomoImportStepsSeen(user.id);
    }
    setStepsOpen(true);
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    setStepsOpen(false);
    if (!user?.id) return;
    const userId = user.id;
    if (shortcutMessage || hasShortcutHistory) {
      stepsMarkedFor.current = userId;
      void markMomoImportStepsSeen(userId);
      return;
    }
    void readMomoImportStepsSeen(userId).then((seen) => {
      if (cancelled || stepsMarkedFor.current === userId) return;
      if (!seen) openSteps();
    });
    return () => {
      cancelled = true;
    };
  }, [hasShortcutHistory, openSteps, shortcutMessage, user?.id]);

  const refreshStatus = useCallback(async () => {
    const [readStatus, receiveGranted, items] = await Promise.all([
      getSmsPermissionStatus(),
      getReceiveSmsPermissionGranted(),
      getNativeQueueItems().catch(() => []),
    ]);
    setPermission(readStatus);
    setReceivePermissionGranted(receiveGranted);
    setQueueItems(items);
  }, [getNativeQueueItems]);

  useEffect(() => {
    if (!user?.id) {
      setLiveImportAvailable(false);
      return;
    }
    let active = true;
    void isMoMoSmsLiveImportEnabled(user.id).then((enabled) => {
      if (active) setLiveImportAvailable(enabled);
    });
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) void hydrateUserTracking();
    void refreshStatus();
  }, [hydrateUserTracking, refreshStatus, user?.id]);

  useEffect(() => {
    if (!hasShortcutHistory) {
      processedShortcutHistoryRef.current = false;
      return;
    }
    if (Platform.OS !== "ios" || authLoading || processedShortcutHistoryRef.current) return;
    processedShortcutHistoryRef.current = true;

    const clearShortcutHistoryParams = () => {
      router.setParams({
        momoHistoryMessage: undefined,
        momoHistorySender: undefined,
        momoHistoryDate: undefined,
      } as never);
    };

    const parsed = parseShortcutHistoryParams(shortcutHistoryParams);
    clearShortcutHistoryParams();

    if (!parsed.ok) {
      const detail = parsed.reason === "too_many_messages"
        ? `Send no more than ${IOS_MOMO_HISTORY_MAX_MESSAGES} messages at a time.`
        : parsed.reason === "outside_window"
          ? `Only messages from the last ${IOS_MOMO_HISTORY_MAX_DAYS} days can be imported. Adjust the Shortcut date filter.`
          : parsed.reason === "payload_too_large"
            ? "Shorten the date range or reduce the number of messages, then run the Shortcut again."
            : "Check that the Shortcut includes each message body, sender, and received date.";
      showInfo("Could not read Shortcut results", detail);
      return;
    }

    setMessage("");
    const result = prepareShortcutHistory(parsed.messages);
    if (result.expenses.length === 0) {
      showInfo("No MoMo expenses found", "Check the sender and date filters in Shortcuts, then try again.");
      return;
    }
    setReviewItems(result.expenses);
    setSelectedIds(new Set(result.expenses.map((item) => item.id)));
    showSuccess(
      "MoMo payments ready to review",
      `${result.expenses.length} supported expense${result.expenses.length === 1 ? "" : "s"} found. Nothing is saved until you tap Add.`,
    );
  }, [
    authLoading,
    hasShortcutHistory,
    prepareShortcutHistory,
    router,
    shortcutHistoryParams,
    showInfo,
    showSuccess,
  ]);

  useEffect(() => {
    if (!shortcutMessage) {
      processedShortcutRef.current = null;
      return;
    }
    if (Platform.OS !== "ios" || !shortcutMessage || authLoading) return;
    const key = `${shortcutSender}\u0000${shortcutMessage}`;
    if (processedShortcutRef.current === key) return;
    processedShortcutRef.current = key;

    const clearShortcutParams = () => {
      router.setParams({ momoMessage: undefined, momoSender: undefined } as never);
    };

    const receiveShortcutMessage = async () => {
      if (shortcutMessage.length > 4000) {
        clearShortcutParams();
        showInfo("Message is too long", "Paste the payment text into CediWise to import it.");
        return;
      }

      const operationId = ++shortcutOperationRef.current;
      setMessage(shortcutMessage);
      clearShortcutParams();
      if (!user?.id) {
        showInfo("Sign in to import", "The message is ready below. Sign in, then add it to your budget.");
        return;
      }

      try {
        await hydrateUserTracking();
        const tracking = useSmsTrackingStore.getState();
        const liveImportEnabled = await isMoMoSmsLiveImportEnabled(user.id);
        if (!tracking.optedIn || !tracking.liveListenerEnabled || !liveImportEnabled) {
          showInfo("Message ready", "Turn on Automatic MoMo import in Profile, or tap Add this payment below.");
          return;
        }

        const result = await importOneMessage(
          { body: shortcutMessage, address: shortcutSender || undefined, date: Date.now() },
          { notify: true },
        );
        // Only the newest Shortcut message may clear the paste box, and only once the payment is
        // settled. Anything else (needs review, retryable) keeps the text so it can be added by hand.
        const settled = result.status === "parsed" || result.status === "duplicate" || result.status === "reversed";
        if (settled && operationId === shortcutOperationRef.current) setMessage("");
        if (result.status === "parsed") {
          showSuccess("Transaction added", "Your budget is up to date.");
        } else if (result.status === "duplicate") {
          showInfo("Already imported", "This MoMo payment is already in your budget.");
        } else if (result.status === "reversed") {
          showInfo("Payment already reversed", "A reversal for this payment was already received, so nothing was added.");
        } else {
          showInfo("Message not added", `${result.error ?? "CediWise could not confirm a supported payment."} The text is kept below so you can add it yourself.`);
        }
      } catch (error) {
        showError("Could not import message", error instanceof SmsImportClientError ? error.message : error instanceof Error ? error.message : "Try again.");
      }
    };

    void receiveShortcutMessage();
  }, [authLoading, hydrateUserTracking, importOneMessage, router, showError, showInfo, showSuccess, shortcutMessage, shortcutSender, user?.id]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshStatus();
    });
    return () => subscription.remove();
  }, [refreshStatus]);

  const queueCount = queueItems.length;

  const status = useMemo(() => {
    if (Platform.OS === "ios") {
      if (!liveImportAvailable) return { label: "Shortcut import unavailable", detail: "Automatic MoMo import is not enabled in this release. You can still paste a payment text.", color: "#94A3B8" };
      if (!sms.optedIn || !sms.liveListenerEnabled) return { label: "Shortcut import paused", detail: "Enable Automatic MoMo import in Profile, then pass new payment texts through Shortcuts.", color: "#94A3B8" };
      return { label: "Shortcut import enabled", detail: "Create a Message automation in Shortcuts. CediWise opens for each matching message it receives.", color: "#34D399" };
    }
    if (permission !== "granted") return { label: "Permission required", detail: "Allow SMS access so CediWise can find MoMo expenses and log them in your budget.", color: "#FBBF24" };
    if (!sms.optedIn) return { label: "Automatic capture paused", detail: "You can still scan SMS or paste one MoMo expense.", color: "#94A3B8" };
    if (queueCount > 0) return { label: `${queueCount} waiting`, detail: "Captured securely and waiting to sync or review.", color: "#FBBF24" };
    if (scanningInbox || savingReview) return { label: "Checking messages", detail: "Looking for MoMo expenses in recent SMS.", color: "#60A5FA" };
    if (!liveImportAvailable) return { label: "Automatic capture unavailable", detail: "You can still scan messages or paste a payment text.", color: "#94A3B8" };
    if (sms.liveListenerEnabled && !receivePermissionGranted) return { label: "SMS permission required", detail: "Allow Receive SMS in Android settings to resume automatic capture.", color: "#FBBF24" };
    if (!sms.liveListenerEnabled) return { label: "Automatic capture paused", detail: "You can still scan SMS or paste one MoMo expense.", color: "#94A3B8" };
    return { label: "Automatic capture active", detail: sms.lastSyncAt ? `Last checked ${new Date(sms.lastSyncAt).toLocaleString()}` : "Ready to log MoMo expenses from MTN, Telecel, and AT Money.", color: "#34D399" };
  }, [liveImportAvailable, permission, queueCount, receivePermissionGranted, savingReview, scanningInbox, sms.lastSyncAt, sms.liveListenerEnabled, sms.optedIn]);

  const openShortcuts = useCallback(() => {
    void Linking.openURL("shortcuts://").catch(() => {
      showInfo("Shortcuts is unavailable", "Open the Shortcuts app on this iPhone to create the import Shortcut.");
    });
  }, [showInfo]);

  const selectedItems = useMemo(() => reviewItems.filter((item) => selectedIds.has(item.id)), [reviewItems, selectedIds]);
  const selectedNeedsClassification = selectedItems.some((item) => item.eventType === "p2p_send" && item.classification == null);
  const selectedTotal = selectedItems.reduce((sum, item) => sum + (item.classification === "transfer" || item.eventType === "reversal" ? 0 : item.amount), 0);
  const scanButton = getScanButtonState(scanningInbox, savingReview);
  const pasteBusy = scanningInbox || savingReview || sms.importingOne;

  // Callers own the busy guard; this only runs the scan and publishes its result.
  const runScan = useCallback(async () => {
    try {
      const result = await sms.scanHistory(days);
      setReviewItems(result.expenses);
      setSelectedIds(new Set(result.expenses.map((item) => item.id)));
      if (!result.expenses.length) showInfo("Scan complete", "No eligible expenses were found in this period.");
      await refreshStatus();
    } catch (error) {
      showError("Could not scan messages", error instanceof Error ? error.message : "Try again.");
    }
  }, [days, refreshStatus, showError, showInfo, sms]);

  const scanHistory = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = "scan";
    // Busy from the first tap, so Add is disabled while the permission check is pending.
    setScanningInbox(true);
    try {
      if (!(await getReadSmsPermissionGranted())) {
        setShowReadDisclosure(true);
        return;
      }
      await runScan();
    } finally {
      busyRef.current = null;
      setScanningInbox(false);
    }
  }, [runScan]);

  const confirmReadPermission = useCallback(async () => {
    setShowReadDisclosure(false);
    if (busyRef.current) return;
    busyRef.current = "scan";
    setScanningInbox(true);
    setRequestingReadPermission(true);
    try {
      const result = await sms.requestReadSmsPermission();
      if (result.readSms !== "granted") {
        showInfo("SMS permission needed", "Allow SMS access to scan messages. You can still paste one manually.");
        if (result.status === "blocked") await Linking.openSettings();
        return;
      }
      await runScan();
    } catch (error) {
      showError("Could not request SMS access", error instanceof Error ? error.message : "Try again.");
    } finally {
      busyRef.current = null;
      setScanningInbox(false);
      setRequestingReadPermission(false);
      await refreshStatus();
    }
  }, [refreshStatus, runScan, showError, showInfo, sms]);

  const saveReview = useCallback(async () => {
    if (!selectedItems.length || busyRef.current) return;
    if (selectedNeedsClassification) {
      showInfo("Choose expense or transfer", "Classify each selected person-to-person payment before adding it.");
      return;
    }
    busyRef.current = "save";
    setSavingReview(true);
    try {
      const result = await sms.saveCapturedExpenses(selectedItems);
      const message = formatSyncResultMessage(result);
      if (result.noActiveBudgetCycle) {
        const added = result.parsed > 0
          ? `${result.parsed} payment${result.parsed === 1 ? " was" : "s were"} added. `
          : "";
        showInfo(
          "Budget cycle needed",
          `${added}Set up a budget cycle covering the remaining payment dates, then tap Add to retry. You can scan the messages again if you leave this screen.`,
        );
        await refreshStatus();
        return;
      }
      if (result.retryable > 0 || result.failed > 0) {
        // Historical items are not stored anywhere else, so keep the list: Add can be retried and
        // payments that already went through come back as duplicates.
        showInfo(
          "Some payments were not saved",
          `${message} They are still listed, so tap Add to try again.`,
        );
        await refreshStatus();
        return;
      }
      if (result.parsed > 0 || result.reversed > 0) showSuccess("Import processed", message);
      else showInfo(result.needsReview > 0 ? "Review needed" : "Nothing added", message);
      setReviewItems([]);
      setSelectedIds(new Set());
      await refreshStatus();
    } catch (error) {
      console.error("[import-sms] add transactions failed", error);
      showError("Could not add transactions", error instanceof Error ? error.message : "Try again.");
    } finally {
      busyRef.current = null;
      setSavingReview(false);
    }
  }, [refreshStatus, selectedItems, selectedNeedsClassification, showError, showInfo, showSuccess, sms]);

  const resolveQueueItem = useCallback(async (
    item: NativeMoMoQueueItem,
    classification: "expense" | "transfer",
  ) => {
    if (queueActionId) return;
    setQueueActionId(item.candidate.clientImportId);
    try {
      if (classification === "transfer") {
        const dismissed = await sms.dismissNativeQueueItem(item.candidate.clientImportId);
        if (!dismissed) throw new Error("Could not update this queued payment.");
        showInfo("Transfer skipped", "It will not be added to your expenses.");
      } else {
        const resolved = await sms.resolveNativeQueueReview(item.candidate.clientImportId, classification);
        if (!resolved) throw new Error("Could not update this queued payment.");
        showInfo("Expense queued", "CediWise will add it when the secure sync completes.");
      }
      await refreshStatus();
    } catch (error) {
      showError("Could not update review", error instanceof Error ? error.message : "Try again.");
    } finally {
      setQueueActionId(null);
    }
  }, [queueActionId, refreshStatus, showError, showInfo, sms]);

  const dismissQueueItem = useCallback(async (item: NativeMoMoQueueItem) => {
    if (queueActionId) return;
    setQueueActionId(item.candidate.clientImportId);
    try {
      const dismissed = await sms.dismissNativeQueueItem(item.candidate.clientImportId);
      if (!dismissed) throw new Error("Could not dismiss this queued alert.");
      await refreshStatus();
      showInfo("Alert dismissed", "No budget transaction was changed.");
    } catch (error) {
      showError("Could not dismiss alert", error instanceof Error ? error.message : "Try again.");
    } finally {
      setQueueActionId(null);
    }
  }, [queueActionId, refreshStatus, showError, showInfo, sms]);

  const retryQueue = useCallback(async () => {
    try {
      await sms.retryNativeQueue();
      showInfo("Sync queued", "CediWise will retry when a network is available.");
      await refreshStatus();
    } catch (error) {
      showError("Could not retry sync", error instanceof Error ? error.message : "Try again.");
    }
  }, [refreshStatus, showError, showInfo, sms]);

  const importPasted = useCallback(async () => {
    if (scanningInbox || savingReview || busyRef.current) return;
    const trimmed = message.trim();
    if (trimmed.length < 20) return showError("Message too short", PASTE_TOO_SHORT_MESSAGE);
    try {
      const preview = previewSmsExpense({ body: trimmed, date: Date.now() });
      if (preview?.eventType === "p2p_send") {
        const id = `paste-${Date.now()}`;
        setReviewItems([{ id, ...preview }]);
        setSelectedIds(new Set([id]));
        setMessage("");
        return;
      }
      const result = await sms.importOneMessage({ body: trimmed });
      if (result.status === "parsed" || result.status === "duplicate") {
        showSuccess(result.status === "parsed" ? "Transaction added" : "Already imported", "Your budget is up to date.");
        setMessage("");
      } else if (result.status === "reversed") {
        showInfo("Payment already reversed", "A reversal for this payment was already received, so nothing was added.");
        setMessage("");
      } else showInfo("Review needed", result.error ?? "This message could not be added automatically.");
    } catch (error) {
      showError("Import failed", error instanceof SmsImportClientError ? error.message : error instanceof Error ? error.message : "Try again.");
    }
  }, [message, savingReview, scanningInbox, showError, showInfo, showSuccess, sms]);

  const toggleSelected = (id: string) => setSelectedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const classify = (id: string, classification: "expense" | "transfer") => setReviewItems((items) => items.map((item) => item.id === id ? { ...item, classification } : item));
  const addLabel = selectedNeedsClassification
    ? "Choose expense or transfer"
    : `Add ${selectedItems.length} ${selectedItems.length === 1 ? "payment" : "payments"}`;
  const cancelReview = () => {
    if (savingReview || scanningInbox) return;
    setReviewItems([]);
    setSelectedIds(new Set());
  };

  return <>
    <Stack.Screen options={{ headerShown: false }} />
    <View className="flex-1 bg-black">
      <StandardHeader
        title="Import MoMo"
        leading={<BackButton onPress={() => router.back()} />}
        centered
        centeredSideWidth={HEADER_ACTIONS_WIDTH}
        actions={[
          <Pressable
            key="how-to-import"
            accessibilityRole="button"
            accessibilityLabel="How to import"
            onPress={openSteps}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => ({ width: 44, height: 44, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}
          >
            <BookOpen color="#E2E8F0" size={20} />
          </Pressable>,
          <Pressable
            key="capture-settings"
            accessibilityRole="button"
            accessibilityLabel="Automatic capture settings"
            onPress={() => router.push("/profile" as never)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => ({ width: 44, height: 44, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}
          >
            <View style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}>
              <Smartphone color="#E2E8F0" size={20} />
              <View style={{ position: "absolute", right: -3, bottom: -3, width: 14, height: 14, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: "#151518" }}>
                <Cog color="#34D399" size={11} />
              </View>
            </View>
          </Pressable>,
        ]}
      />
      <KeyboardAwareScrollView className="px-5" contentContainerStyle={{ paddingTop: getStandardHeaderBodyOffsetTop(insets.top, DEFAULT_STANDARD_HEIGHT), paddingBottom: reviewItems.length > 0 ? 12 : insets.bottom + 36 }} keyboardShouldPersistTaps="handled">
        <Card className="mb-5 border border-slate-700/70 bg-slate-950">
          <View className="flex-row items-center gap-3"><View className="h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10"><ShieldCheck color={status.color} size={23} /></View><View className="flex-1"><Text className="text-base font-semibold text-white">{status.label}</Text><Text className="mt-1 text-sm leading-5 text-slate-400">{status.detail}</Text></View></View>
        </Card>

        {__DEV__ ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (!user?.id) return;
              stepsMarkedFor.current = null;
              setStepsOpen(false);
              void clearMomoImportIntros(user.id).then(() => {
                showSuccess("Cleared", "Import intro storage cleared. Open Home, then come back here.");
              });
            }}
            className="mb-4 min-h-11 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 px-3"
          >
            <Text className="text-sm font-semibold text-amber-300">Clear import intro storage</Text>
          </Pressable>
        ) : null}

        {Platform.OS === "android" && queueItems.length > 0 ? (
          <View className="mb-5">
            <Text className="mb-2 ml-1 text-xs font-semibold uppercase tracking-widest text-slate-500">Automatic capture queue</Text>
            <Card>
              <Text className="mb-3 text-sm text-slate-300">
                These payment alerts are stored on this phone until sync or review is complete.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void refreshStatus()}
                className="mb-3 min-h-10 items-center justify-center rounded-lg bg-slate-800 px-3"
              >
                <Text className="font-medium text-slate-200">Refresh queue status</Text>
              </Pressable>
              {queueItems.slice(0, 20).map((item) => {
                const candidate = item.candidate;
                const amount = candidate.principalPesewas == null
                  ? "Amount unavailable"
                  : `₵${formatCurrency(candidate.principalPesewas / 100)}`;
                const title = candidate.counterparty?.trim() ||
                  (candidate.eventType === "reversal" ? "Reversal alert" : "MoMo payment");
                const statusLabel = item.state === "review"
                  ? "Needs review"
                  : item.state === "retryable"
                    ? "Waiting to retry"
                    : item.state === "auth_required"
                      ? "Sign-in needed"
                      : item.state === "failed_terminal"
                        ? "Could not sync"
                        : "Waiting to sync";
                const busy = queueActionId === candidate.clientImportId;
                return (
                  <View key={candidate.clientImportId} className="mb-2 rounded-xl border border-slate-700 bg-slate-900 p-4">
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="min-w-0 flex-1">
                        <Text className="text-base font-semibold text-white" numberOfLines={2}>{title}</Text>
                        <Text className="mt-1 text-sm text-slate-300">{candidate.eventType.replaceAll("_", " ")} · {amount}</Text>
                        <Text className="mt-1 text-xs text-slate-400">{new Date(candidate.receivedAt).toLocaleString()} · {statusLabel}</Text>
                      </View>
                      {busy ? <ActivityIndicator color="#34D399" /> : null}
                    </View>

                    {item.state === "review" && candidate.eventType === "p2p_send" ? (
                      <View className="mt-3 flex-row gap-2">
                        <Pressable
                          accessibilityRole="button"
                          disabled={Boolean(queueActionId)}
                          onPress={() => void resolveQueueItem(item, "expense")}
                          className="min-h-11 flex-1 items-center justify-center rounded-lg bg-emerald-500 px-3"
                        >
                          <Text className="font-semibold text-emerald-950">Add as expense</Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          disabled={Boolean(queueActionId)}
                          onPress={() => void resolveQueueItem(item, "transfer")}
                          className="min-h-11 flex-1 items-center justify-center rounded-lg bg-slate-800 px-3"
                        >
                          <Text className="font-semibold text-slate-200">Skip transfer</Text>
                        </Pressable>
                      </View>
                    ) : null}

                    {item.state === "review" && candidate.eventType !== "p2p_send" ? (
                      <View className="mt-3">
                        <Text className="text-sm leading-5 text-slate-400">
                          {candidate.eventType === "reversal"
                            ? "This reversal could not be linked to a CediWise import. Check the original expense before dismissing it."
                            : "CediWise could not verify this payment safely. No transaction has been added."}
                        </Text>
                        <Pressable
                          accessibilityRole="button"
                          disabled={Boolean(queueActionId)}
                          onPress={() => void dismissQueueItem(item)}
                          className="mt-3 min-h-11 items-center justify-center rounded-lg bg-slate-800 px-3"
                        >
                          <Text className="font-semibold text-slate-200">Dismiss alert</Text>
                        </Pressable>
                      </View>
                    ) : null}

                    {item.state === "retryable" ? (
                      <View className="mt-3">
                        {item.errorCode === "no_active_budget_cycle" ? (
                          <Text className="mb-2 text-sm leading-5 text-amber-200">
                            Set up a budget cycle that covers this payment date, then retry.
                          </Text>
                        ) : null}
                        <Pressable
                          accessibilityRole="button"
                          disabled={Boolean(queueActionId)}
                          onPress={() => void retryQueue()}
                          className="min-h-11 items-center justify-center rounded-lg bg-emerald-500/15 px-3"
                        >
                          <Text className="font-semibold text-emerald-300">Retry sync</Text>
                        </Pressable>
                      </View>
                    ) : null}

                    {item.state === "failed_terminal" ? (
                      <Pressable
                        accessibilityRole="button"
                        disabled={Boolean(queueActionId)}
                        onPress={() => void dismissQueueItem(item)}
                        className="mt-3 min-h-11 items-center justify-center rounded-lg bg-slate-800 px-3"
                      >
                        <Text className="font-semibold text-slate-200">Dismiss</Text>
                      </Pressable>
                    ) : null}

                    {item.state === "auth_required" ? (
                      <Text className="mt-3 text-sm leading-5 text-amber-200">
                        Sign in again and reopen this screen to refresh the secure sync session.
                      </Text>
                    ) : null}
                  </View>
                );
              })}
              {queueItems.length > 20 ? (
                <Text className="mt-1 text-xs text-slate-400">Showing the first 20 of {queueItems.length} queued alerts.</Text>
              ) : null}
            </Card>
          </View>
        ) : null}

        {Platform.OS === "android" ? (
          <>
            <Text className="mb-2 ml-1 text-xs font-semibold uppercase tracking-widest text-slate-500">Message history</Text>
            <Card className="mb-5">
              <Text className="text-sm text-slate-300">Choose how far back to scan for MoMo expenses. Nothing is logged in your budget until you review it.</Text>
              <View className="mt-4 flex-row gap-2">{([2, 7, 30] as ScanDays[]).map((value) => <Pressable key={value} accessibilityRole="button" onPress={() => setDays(value)} className={`min-h-12 flex-1 items-center justify-center rounded-xl border ${days === value ? "border-emerald-400 bg-emerald-500/15" : "border-slate-700 bg-slate-900"}`}><Text className={days === value ? "font-semibold text-emerald-300" : "font-medium text-slate-300"}>{value} days</Text></Pressable>)}</View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={scanButton.accessibilityLabel}
                disabled={scanButton.disabled}
                onPress={() => void scanHistory()}
                className={`mt-3 min-h-12 flex-row items-center justify-center gap-2 rounded-xl bg-emerald-500 ${scanButton.disabled ? "opacity-70" : ""}`}
              >
                {scanButton.showSpinner ? <ActivityIndicator color="#052e22" accessibilityElementsHidden importantForAccessibility="no" /> : <RefreshCw color="#052e22" size={18} />}
                <Text className="font-bold text-emerald-950">{scanButton.title}</Text>
              </Pressable>
            </Card>
          </>
        ) : null}

        {Platform.OS === "ios" && reviewItems.length === 0 ? (
          <>
            <Text className="mb-2 ml-1 text-xs font-semibold uppercase tracking-widest text-slate-500">Message history</Text>
            <Card className="mb-5">
              <Text className="text-sm leading-5 text-slate-300">
                CediWise cannot scan the iPhone inbox. On iOS 26 or later, a user-run Shortcut can find recent Messages and send a small batch here for review.
              </Text>
              <Text className="mt-3 text-sm leading-5 text-slate-300">
                In Shortcuts, use Find Messages with a MoMo sender filter and a received date within the last {IOS_MOMO_HISTORY_MAX_DAYS} days. Limit results to {IOS_MOMO_HISTORY_MAX_MESSAGES}. Use Repeat with Each and a Text action to build the fields below for every result. URL Encode the body, sender, and received date formatted as ISO 8601, then combine the Repeat Results with &amp;:
              </Text>
              <Text selectable className="mt-3 rounded-lg bg-black/50 p-3 text-xs leading-5 text-slate-200">
                momoHistoryMessage=[encoded body]&amp;momoHistorySender=[encoded sender]&amp;momoHistoryDate=[encoded ISO date]
              </Text>
              <Text className="mt-3 text-sm leading-5 text-slate-300">
                Open one URL with the combined fields:
              </Text>
              <Text selectable className="mt-2 rounded-lg bg-black/50 p-3 text-xs leading-5 text-slate-200">
                {historyShortcutUrl}[combined fields]
              </Text>
              <Text className="mt-3 text-xs leading-5 text-slate-400">
                The Shortcut sends the messages to CediWise, which filters supported Ghana MoMo alerts. Review the expense list before adding anything to your budget.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={openShortcuts}
                className="mt-3 min-h-11 flex-row items-center justify-center gap-2 rounded-xl bg-blue-500/15 px-4"
              >
                <ExternalLink size={16} color="#93C5FD" />
                <Text className="font-semibold text-blue-200">Open Shortcuts</Text>
              </Pressable>
            </Card>
          </>
        ) : null}

        {reviewItems.length > 0 ? (
          <View style={{ paddingBottom: barHeight }}>
            <Text className="text-lg font-semibold text-white">Review MoMo payments</Text>
            <Text className="mb-3 mt-1 text-sm text-slate-300">
              {selectedItems.length} selected · ₵{formatCurrency(selectedTotal)}
            </Text>
            {selectedNeedsClassification ? (
              <Text className="mb-3 text-sm text-amber-200">
                Choose expense or transfer for every selected person-to-person payment.
              </Text>
            ) : null}
            {reviewItems.map((item) => (
              <ReviewTransactionCard
                key={item.id}
                item={item}
                selected={selectedIds.has(item.id)}
                onToggle={() => toggleSelected(item.id)}
                onClassify={(classification) => classify(item.id, classification)}
              />
            ))}
          </View>
        ) : null}

        {reviewItems.length === 0 ? (
          <>
            <Text className="mb-2 ml-1 text-xs font-semibold uppercase tracking-widest text-slate-500">Add a payment yourself</Text>
            <Card className="mb-5">
              <View className="mb-4 flex-row items-center gap-3"><View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10"><MessageSquareText color="#60A5FA" size={20} /></View><View className="flex-1"><Text className="text-sm leading-5 text-slate-300">Paste one MoMo SMS to log that expense in your budget.</Text><Text className="mt-1 text-sm text-slate-400">Available even when SMS permission is off.</Text></View></View>
              <AppTextField label="Message" placeholder="Paste the complete transaction message" value={message} onChangeText={setMessage} multiline numberOfLines={6} textAlignVertical="top" inputClassName="min-h-[132px] py-3" containerClassName="mb-3" />
              <PrimaryButton loading={sms.importingOne} disabled={pasteBusy || message.trim().length < 20} onPress={() => void importPasted()}>Add this payment</PrimaryButton>
            </Card>
          </>
        ) : null}

      </KeyboardAwareScrollView>
      {reviewItems.length > 0 ? (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 20,
            paddingTop: ADD_BAR_TOP_PADDING,
            paddingBottom: Math.max(insets.bottom, 16),
            paddingHorizontal: 20,
            backgroundColor: "#000",
            borderTopWidth: 1,
            borderTopColor: "#1e293b",
          }}
        >
          <View className="flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel review"
              disabled={savingReview || scanningInbox}
              onPress={cancelReview}
              style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
              className={`h-[52px] min-w-[44px] items-center justify-center rounded-full border border-slate-700 px-5 ${savingReview || scanningInbox ? "opacity-70" : ""}`}
            >
              <Text className="text-base font-semibold text-slate-200">Cancel</Text>
            </Pressable>
            <View className="min-w-0 flex-1">
              <PrimaryButton
                disabled={!selectedItems.length || selectedNeedsClassification || scanningInbox}
                loading={savingReview}
                onPress={() => void saveReview()}
                accessibilityLabel={addLabel}
              >
                {addLabel}
              </PrimaryButton>
            </View>
          </View>
        </View>
      ) : null}
      <CustomBottomSheet
        title="How to import"
        titleIcon={<BookOpen color="#34D399" size={22} />}
        isOpen={stepsOpen}
        onOpenChange={setStepsOpen}
      >
        <View className="gap-4">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <View key={step.title} className="flex-row items-start gap-3">
                <Icon color={step.color} size={20} style={{ marginTop: 1 }} />
                <View className="min-w-0 flex-1">
                  <Text className="font-semibold text-white">{step.title}</Text>
                  <Text className="mt-0.5 text-sm leading-5 text-slate-400">{step.detail}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </CustomBottomSheet>
      <MoMoSmsPermissionDisclosureDialog
        visible={showReadDisclosure}
        kind="read"
        loading={requestingReadPermission}
        onOpenChange={setShowReadDisclosure}
        onConfirm={() => void confirmReadPermission()}
        onCancel={() => setShowReadDisclosure(false)}
      />
    </View>
  </>;
}
