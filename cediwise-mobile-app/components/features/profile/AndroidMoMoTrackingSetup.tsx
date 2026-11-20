import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { ClipboardPaste, Settings2, Smartphone } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { InteractionManager, Linking, Switch, Text, View } from "react-native";

import { useAppToast } from "@/hooks/useAppToast";
import { useSmsImport } from "@/hooks/useSmsImport";
import { isMoMoSmsLiveImportEnabled } from "@/utils/featureFlags";
import { ListGroup, Separator } from "heroui-native";

import {
  formatSyncResultMessage,
  MoMoEnableDialog,
  MoMoSmsPermissionDisclosureDialog,
  MoMoSmsExpenseReviewDialog,
  MoMoTrackingSettingsDialog,
  openAndroidAppSettings,
} from "./MoMoTrackingDialogs";
import type { SmsExpenseCaptureItem } from "@/services/momoSmsExpensePreview";
import { getReadSmsPermissionGranted } from "@/services/androidSmsPermissions";

const SECTION_INNER_CLASS = "rounded-xl overflow-hidden bg-[rgba(18,22,33,0.9)]";

function IconPrefix({
  icon: Icon,
  color,
}: {
  icon: React.ComponentType<{ color: string; size: number }>;
  color: string;
}) {
  return (
    <View
      className="h-10 w-10 items-center justify-center rounded-xl"
      style={{ backgroundColor: `${color}20` }}
    >
      <Icon color={color} size={20} />
    </View>
  );
}

function waitForModalDismiss(): Promise<void> {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      setTimeout(resolve, 450);
    });
  });
}

function hapticPress(action: () => void) {
  void Haptics.selectionAsync().catch(() => {});
  action();
}

type MoMoListRowProps = {
  icon: React.ComponentType<{ color: string; size: number }>;
  iconColor: string;
  title: string;
  description: string;
  onPress: () => void;
};

function MoMoListRow({
  icon,
  iconColor,
  title,
  description,
  onPress,
}: MoMoListRowProps) {
  return (
    <ListGroup.Item onPress={() => hapticPress(onPress)}>
      <ListGroup.ItemPrefix>
        <IconPrefix icon={icon} color={iconColor} />
      </ListGroup.ItemPrefix>
      <ListGroup.ItemContent>
        <ListGroup.ItemTitle>{title}</ListGroup.ItemTitle>
        <ListGroup.ItemDescription>{description}</ListGroup.ItemDescription>
      </ListGroup.ItemContent>
      <ListGroup.ItemSuffix />
    </ListGroup.Item>
  );
}

type AndroidMoMoTrackingSetupProps = {
  userId: string | undefined;
};

export function AndroidMoMoTrackingSetup({ userId }: AndroidMoMoTrackingSetupProps) {
  const router = useRouter();
  const { showError, showSuccess, showInfo } = useAppToast();
  const sms = useSmsImport({ userId });
  const [showEnableDialog, setShowEnableDialog] = useState(false);
  const [showReadDisclosure, setShowReadDisclosure] = useState(false);
  const [showReceiveDisclosure, setShowReceiveDisclosure] = useState(false);
  const [togglePending, setTogglePending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [liveFlagEnabled, setLiveFlagEnabled] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [reviewItems, setReviewItems] = useState<SmsExpenseCaptureItem[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const reviewClosedRef = useRef(true);

  useEffect(() => {
    if (!userId) return;
    void sms.hydrateUserTracking();
  }, [sms.hydrateUserTracking, userId]);

  useEffect(() => {
    if (!userId) return;
    void isMoMoSmsLiveImportEnabled(userId).then(setLiveFlagEnabled);
  }, [userId]);

  const closeEnableDialog = useCallback(() => {
    setShowEnableDialog(false);
    setTogglePending(false);
  }, []);

  const handleEnableConfirm = useCallback(async () => {
    if (!userId) return;
    setEnabling(true);
    closeEnableDialog();
    try {
      await waitForModalDismiss();
      const result = await sms.enableTracking();
      if (result.status === "granted") {
        showSuccess(
          "MoMo tracking is on",
          result.receiveSms !== "granted"
            ? "Open MoMo tracking to check recent payments. Automatic updates need the SMS receive permission too."
            : "Open MoMo tracking to check recent payments or turn on automatic updates.",
        );
      } else if (result.status === "blocked") {
        showInfo(
          "Permission blocked",
          "SMS access is blocked in Android settings. Open Apps → CediWise → Permissions and allow SMS.",
        );
        await Linking.openSettings();
      } else if (result.status === "denied") {
        showInfo(
          "Permission needed",
          "Allow SMS access when prompted, or turn it on in Android settings. You can still paste a payment text manually.",
        );
      } else {
        showError(
          "Unavailable",
          "SMS tracking needs a native Android build, not Expo Go. Rebuild the app after updating.",
        );
      }
    } catch (error) {
      showError(
        "Could not turn on tracking",
        error instanceof Error ? error.message : "Try again.",
      );
    } finally {
      setEnabling(false);
    }
  }, [closeEnableDialog, showError, showInfo, showSuccess, sms, userId]);

  const runSync48h = useCallback(async () => {
    try {
      const scan = await sms.syncLast48Hours();
      if (scan.expenses.length === 0) {
        showInfo(
          "Check complete",
          scan.found === 0
            ? "No payment texts in the last 2 days."
            : "No new expenses to save from those payment texts.",
        );
        return;
      }

      setShowSettings(false);
      reviewClosedRef.current = false;
      setReviewItems(scan.expenses);
      setShowReview(true);
    } catch (error) {
      if (error instanceof Error && error.message === "sms_permission_denied") {
        showInfo(
          "Permission needed",
          "Allow SMS access in settings, or paste a payment text manually.",
        );
        return;
      }
      if (error instanceof Error && error.message === "sms_reader_unavailable") {
        showError(
          "SMS reader unavailable",
          "Install a native Android build (not Expo Go), then rebuild after the SMS update.",
        );
        return;
      }
      showError(
        "Check failed",
        error instanceof Error ? error.message : "Try again.",
      );
    }
  }, [showError, showInfo, sms]);

  const handleSync48h = useCallback(async () => {
    if (!(await getReadSmsPermissionGranted())) {
      setShowReadDisclosure(true);
      return;
    }
    await runSync48h();
  }, [runSync48h]);

  const handleReadPermissionConfirm = useCallback(async () => {
    setShowReadDisclosure(false);
    setRequestingPermission(true);
    try {
      const permission = await sms.requestReadSmsPermission();
      if (permission.readSms !== "granted") {
        if (permission.status === "blocked") {
          showInfo("Permission blocked", "Turn on SMS access in Android settings, then try again.");
          await Linking.openSettings();
        } else {
          showInfo("Permission needed", "Allow SMS access when prompted, or paste a payment text manually.");
        }
        return;
      }
      await runSync48h();
    } catch (error) {
      showError("Could not request SMS access", error instanceof Error ? error.message : "Try again.");
    } finally {
      setRequestingPermission(false);
    }
  }, [runSync48h, showError, showInfo, sms]);

  const closeReview = useCallback(() => {
    reviewClosedRef.current = true;
    setShowReview(false);
    setReviewItems([]);
    setSavingReview(false);
  }, []);

  const handleReviewCancel = useCallback(() => {
    if (reviewClosedRef.current) return;
    closeReview();
    showInfo("Cancelled", "Those MoMo expenses were not saved.");
  }, [closeReview, showInfo]);

  const handleReviewClassify = useCallback(
    (id: string, classification: "expense" | "transfer") => {
      setReviewItems((items) => items.map((item) =>
        item.id === id ? { ...item, classification } : item,
      ));
    },
    [],
  );

  const handleReviewSave = useCallback(async () => {
    if (reviewClosedRef.current) return;
    if (reviewItems.length === 0) {
      closeReview();
      return;
    }

    setSavingReview(true);
    try {
      const summary = await sms.saveCapturedExpenses(reviewItems);
      if (summary.noActiveBudgetCycle) {
        closeReview();
        showInfo(
          "Budget cycle needed",
          "Set up a budget cycle that covers these payment dates, then scan the messages again. Already imported payments will be recognized as duplicates.",
        );
        return;
      }
      const message = formatSyncResultMessage(summary);
      if (summary.retryable > 0 || summary.failed > 0) {
        // Historical items are not stored anywhere else, so keep the review open: Save can be
        // retried, and payments that already went through come back as duplicates.
        setSavingReview(false);
        showInfo(
          "Some payments were not saved",
          `${message} They are still listed, so tap Save to try again.`,
        );
        return;
      }
      closeReview();
      if (summary.parsed > 0 || summary.reversed > 0) {
        showSuccess("Import processed", message);
      } else {
        showInfo(
          summary.needsReview > 0
            ? "Review needed"
            : summary.retryable > 0
              ? "Sync pending"
              : summary.duplicate > 0
                ? "Already recorded"
                : "Nothing added",
          message,
        );
      }
    } catch (error) {
      setSavingReview(false);
      showError(
        "Could not save",
        error instanceof Error ? error.message : "Try again.",
      );
    }
  }, [closeReview, reviewItems, showError, showInfo, showSuccess, sms]);

  const handleMoMoToggle = useCallback(
    async (value: boolean) => {
      if (!userId) return;

      if (value) {
        setTogglePending(true);
        setShowEnableDialog(true);
        return;
      }

      setTogglePending(false);
      try {
        await sms.disableTracking();
        showSuccess(
          "MoMo tracking is off",
          "We will no longer read payment texts on this phone.",
        );
      } catch (error) {
        showError(
          "Could not update",
          error instanceof Error ? error.message : "Try again.",
        );
      }
    },
    [showError, showSuccess, sms, userId],
  );

  const handleLiveToggle = useCallback(
    async (value: boolean) => {
      if (!userId) return;
      if (value) {
        setShowReceiveDisclosure(true);
        return;
      }
      await sms.toggleLiveListener(false);
      sms.stopLiveListener();
    },
    [sms, userId],
  );

  const handleReceivePermissionConfirm = useCallback(async () => {
    setShowReceiveDisclosure(false);
    if (!liveFlagEnabled) {
      showInfo("Automatic capture unavailable", "Automatic capture is not enabled in this release.");
      return;
    }
    setRequestingPermission(true);
    try {
      const permission = await sms.requestReceiveSmsPermission();
      if (permission.receiveSms !== "granted") {
        if (permission.receiveSms === "never_ask_again") {
          showInfo("Permission blocked", "Turn on SMS access in Android settings, then try again.");
          await Linking.openSettings();
        } else {
          showInfo("Permission needed", "Allow SMS receive access to capture new MoMo payment alerts.");
        }
        return;
      }
      await sms.toggleLiveListener(true);
      await sms.ensureLiveListener();
      await sms.catchUpLiveImports();
    } catch (error) {
      showError("Could not enable automatic capture", error instanceof Error ? error.message : "Try again.");
    } finally {
      setRequestingPermission(false);
    }
  }, [liveFlagEnabled, showError, showInfo, sms]);

  const handleDisable = useCallback(async () => {
    await sms.disableTracking();
    setTogglePending(false);
    setShowSettings(false);
    showSuccess(
      "MoMo tracking is off",
      "We will no longer read payment texts on this phone.",
    );
  }, [showSuccess, sms]);

  const openPasteScreen = useCallback(() => {
    router.push("/profile/import-sms" as never);
  }, [router]);

  const switchOn = sms.optedIn || togglePending;

  return (
    <View>
      <Text className="mb-2.5 ml-1 text-xs uppercase tracking-wider text-slate-400">
        MoMo expense import
      </Text>

      <ListGroup variant="tertiary" className={SECTION_INNER_CLASS}>
        <ListGroup.Item disabled>
          <ListGroup.ItemPrefix>
            <IconPrefix icon={Smartphone} color="#10B981" />
          </ListGroup.ItemPrefix>
          <ListGroup.ItemContent>
            <ListGroup.ItemTitle>MoMo SMS tracking</ListGroup.ItemTitle>
            <ListGroup.ItemDescription>
              Add MTN, Telecel, and AT Money payments from this phone
            </ListGroup.ItemDescription>
          </ListGroup.ItemContent>
          <ListGroup.ItemSuffix>
            {enabling ? (
              <Text className="text-sm text-slate-400">Turning on…</Text>
            ) : (
              <Switch
                value={switchOn}
                onValueChange={(value) => {
                  void handleMoMoToggle(value);
                }}
                trackColor={{ false: "#334155", true: "#22C55E" }}
                thumbColor="#fff"
                accessibilityLabel="MoMo SMS tracking"
              />
            )}
          </ListGroup.ItemSuffix>
        </ListGroup.Item>

        <Separator className="mx-4" />
        <MoMoListRow
          icon={ClipboardPaste}
          iconColor="#60A5FA"
          title="Paste a payment text"
          description={
            sms.optedIn
              ? "Add one payment without SMS permission"
              : "Add one MTN or Telecel payment manually"
          }
          onPress={openPasteScreen}
        />

        {sms.optedIn ? (
          <>
            <Separator className="mx-4" />
            <MoMoListRow
              icon={Settings2}
              iconColor="#A78BFA"
              title="MoMo tracking"
              description="Check recent payments, automatic updates, permissions"
              onPress={() => setShowSettings(true)}
            />
          </>
        ) : null}
      </ListGroup>

      <MoMoEnableDialog
        visible={showEnableDialog}
        loading={enabling}
        onOpenChange={(open) => {
          if (!open) closeEnableDialog();
        }}
        onConfirm={() => {
          void handleEnableConfirm();
        }}
        onCancel={closeEnableDialog}
      />

      <MoMoSmsPermissionDisclosureDialog
        visible={showReadDisclosure}
        kind="read"
        loading={requestingPermission}
        onOpenChange={setShowReadDisclosure}
        onConfirm={() => void handleReadPermissionConfirm()}
        onCancel={() => setShowReadDisclosure(false)}
      />

      <MoMoSmsPermissionDisclosureDialog
        visible={showReceiveDisclosure}
        kind="receive"
        loading={requestingPermission}
        onOpenChange={setShowReceiveDisclosure}
        onConfirm={() => void handleReceivePermissionConfirm()}
        onCancel={() => setShowReceiveDisclosure(false)}
      />

      <MoMoTrackingSettingsDialog
        visible={showSettings}
        lastSyncAt={sms.lastSyncAt}
        lastSyncSummary={sms.lastSyncSummary}
        syncing={sms.syncing}
        liveListenerEnabled={sms.liveListenerEnabled}
        liveImportAvailable={liveFlagEnabled}
        androidListenerAvailable={sms.capabilities.androidListener}
        onOpenChange={setShowSettings}
        onSync={() => {
          void handleSync48h();
        }}
        onLiveToggle={(value) => {
          void handleLiveToggle(value);
        }}
        onOpenPermissions={() => {
          hapticPress(() => {
            openAndroidAppSettings();
          });
        }}
        onDisable={() => {
          void handleDisable();
        }}
      />

      <MoMoSmsExpenseReviewDialog
        visible={showReview}
        items={reviewItems}
        saving={savingReview}
        onOpenChange={(open) => {
          if (!open) handleReviewCancel();
        }}
        onSave={() => {
          void handleReviewSave();
        }}
        onClassify={handleReviewClassify}
        onCancel={handleReviewCancel}
      />
    </View>
  );
}
