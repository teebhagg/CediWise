import { History, ShieldCheck, Smartphone, Sparkles } from "lucide-react-native";
import { Linking, Platform, Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { AppDialog } from "@/components/AppDialog";
import type { SmsExpenseCaptureItem } from "@/services/momoSmsExpensePreview";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatLastChecked } from "@/utils/formatLastChecked";

type SyncSummary = {
  found: number;
  parsed: number;
  duplicate: number;
  skipped?: number;
  failed?: number;
  needsReview?: number;
  retryable?: number;
  reversed?: number;
  noActiveBudgetCycle?: boolean;
};

function formatLastResultLine(summary: SyncSummary | null): string | null {
  if (!summary) return null;
  if (summary.found === 0) return "No payment texts in the last 2 days";
  const parts: string[] = [];
  if (summary.parsed > 0) parts.push(`${summary.parsed} added`);
  if (summary.duplicate > 0) parts.push(`${summary.duplicate} already recorded`);
  if ((summary.needsReview ?? 0) > 0) parts.push(`${summary.needsReview} need review`);
  if ((summary.reversed ?? 0) > 0) parts.push(`${summary.reversed} reversed`);
  if ((summary.retryable ?? 0) > 0) {
    parts.push(summary.noActiveBudgetCycle
      ? `${summary.retryable} ${summary.retryable === 1 ? "needs" : "need"} a budget cycle before retry`
      : `${summary.retryable} waiting to retry`);
  }
  if ((summary.failed ?? 0) > 0) parts.push(`${summary.failed} could not be added`);
  if (parts.length === 0 && (summary.skipped ?? 0) > 0) parts.push(`${summary.skipped} skipped`);
  return parts.join(" · ") || "Nothing new to add";
}

export function formatSyncResultMessage(summary: SyncSummary): string {
  const line = formatLastResultLine(summary);
  if (line) return `${line}.`;
  return "Check complete.";
}

function InsetSurface({ children }: { children: React.ReactNode }) {
  return <View style={styles.insetSurface}>{children}</View>;
}

function StatusPanel({
  lastChecked,
  resultLine,
  automaticCaptureActive,
}: {
  lastChecked: string;
  resultLine: string | null;
  automaticCaptureActive: boolean;
}) {
  return (
    <View style={[styles.statusStrip, !automaticCaptureActive && styles.statusStripIdle]}>
      <View style={styles.statusHeader}>
        <View style={[styles.statusDot, !automaticCaptureActive && styles.statusDotIdle]} />
        <Text style={[styles.statusLabel, !automaticCaptureActive && styles.statusLabelIdle]}>
          {automaticCaptureActive ? "Automatic capture active" : "Manual scanning available"}
        </Text>
      </View>
      <Text style={styles.statusPrimary}>{lastChecked}</Text>
      {resultLine ? (
        <Text style={styles.statusSecondary}>{resultLine}</Text>
      ) : null}
    </View>
  );
}

type MoMoEnableDialogProps = {
  visible: boolean;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export function MoMoEnableDialog({
  visible,
  loading,
  onOpenChange,
  onConfirm,
  onCancel,
}: MoMoEnableDialogProps) {
  return (
    <AppDialog
      visible={visible}
      onOpenChange={onOpenChange}
      icon={<Smartphone size={22} color="#34D399" />}
      title="Turn on MoMo tracking?"
      primaryLabel={loading ? "Turning on…" : "Turn on tracking"}
      onPrimary={onConfirm}
      secondaryLabel="Not now"
      onSecondary={onCancel}
      loading={loading}
    >
      <View style={styles.enableStack}>
        <InsetSurface>
          <Text style={styles.bodyCopy}>
            Android lets CediWise read SMS on this phone. We filter for MTN,
            Telecel, and AT Money payment alerts on-device. Matching message
            text, sender, time, and parsed transaction details may be sent to
            CediWise&apos;s API on Vercel and processed or stored by Supabase to
            identify, deduplicate, and add budget transactions. Import logs
            that include message text are kept for up to 180 days. Other SMS
            are not sent.
          </Text>
        </InsetSurface>
        <Text style={styles.bodyCopy}>
          You can turn tracking off in Profile and revoke SMS access in Android
          settings. Automatic capture of new messages asks for a separate
          permission.
        </Text>
        <View style={styles.trustRow}>
          <ShieldCheck size={14} color="#6ee7b7" />
          <Text style={styles.trustCopy}>Optional. Turn off anytime in Profile.</Text>
        </View>
      </View>
    </AppDialog>
  );
}

type MoMoSmsPermissionDisclosureDialogProps = {
  visible: boolean;
  kind: "read" | "receive";
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export function MoMoSmsPermissionDisclosureDialog({
  visible,
  kind,
  loading = false,
  onOpenChange,
  onConfirm,
  onCancel,
}: MoMoSmsPermissionDisclosureDialogProps) {
  const isReceive = kind === "receive";
  return (
    <AppDialog
      visible={visible}
      onOpenChange={onOpenChange}
      icon={<ShieldCheck size={22} color="#34D399" />}
      title={isReceive ? "Allow automatic MoMo capture?" : "Allow a MoMo SMS scan?"}
      primaryLabel={loading ? "Please wait…" : "Continue"}
      onPrimary={onConfirm}
      secondaryLabel="Not now"
      onSecondary={onCancel}
      loading={loading}
    >
      <View style={styles.enableStack}>
        <Text style={styles.bodyCopy}>
          {isReceive
            ? "Android lets CediWise receive incoming SMS on this phone. We filter for MTN, Telecel, and AT Money payment alerts on-device. Matching message text, sender, time, and parsed transaction details may be sent to CediWise's API on Vercel and processed or stored by Supabase to identify, deduplicate, and add budget transactions. Import logs that include message text are kept for up to 180 days. Other SMS are not sent. You can turn automatic capture off in Profile."
            : "Android lets CediWise read SMS on this phone. We filter for MTN, Telecel, and AT Money payment alerts on-device. When you choose to import a matching payment, its message text, sender, time, and parsed transaction details may be sent to CediWise's API on Vercel and processed or stored by Supabase to identify, deduplicate, and add a budget transaction. Import logs that include message text are kept for up to 180 days. Other SMS are not sent. You can turn tracking off in Profile."}
        </Text>
        {isReceive ? (
          <Text style={styles.bodyCopy}>
            Automatic capture is optional. You can still scan recent messages
            yourself or paste a payment text.
          </Text>
        ) : null}
      </View>
    </AppDialog>
  );
}

type MoMoTrackingSettingsDialogProps = {
  visible: boolean;
  lastSyncAt: string | null;
  lastSyncSummary: SyncSummary | null;
  syncing: boolean;
  liveListenerEnabled: boolean;
  liveImportAvailable: boolean;
  androidListenerAvailable: boolean;
  onOpenChange: (open: boolean) => void;
  onSync: () => void;
  onLiveToggle: (value: boolean) => void;
  onOpenPermissions: () => void;
  onDisable: () => void;
};

export function MoMoTrackingSettingsDialog({
  visible,
  lastSyncAt,
  lastSyncSummary,
  syncing,
  liveListenerEnabled,
  liveImportAvailable,
  androidListenerAvailable,
  onOpenChange,
  onSync,
  onLiveToggle,
  onOpenPermissions,
  onDisable,
}: MoMoTrackingSettingsDialogProps) {
  const lastChecked = formatLastChecked(lastSyncAt);
  const resultLine = formatLastResultLine(lastSyncSummary);
  const canEnableLiveImport = liveImportAvailable && androidListenerAvailable;
  const automaticCaptureActive = canEnableLiveImport && liveListenerEnabled;
  const liveImportHint = !liveImportAvailable
    ? "Auto-add is not enabled in this release. You can still scan messages or paste a payment."
    : !androidListenerAvailable
      ? "Install the latest native Android build to turn on automatic capture."
      : "Captures eligible payments even when CediWise is closed";

  return (
    <AppDialog
      visible={visible}
      onOpenChange={onOpenChange}
      icon={<History size={22} color="#A78BFA" />}
      title="MoMo tracking"
      description="MTN, Telecel, and AT Money transaction alerts on this device."
      primaryLabel={syncing ? "Checking…" : "Check recent payments"}
      onPrimary={onSync}
      loading={syncing}
      tertiaryLabel="Phone permissions"
      onTertiary={onOpenPermissions}
      secondaryLabel="Turn off tracking"
      onSecondary={onDisable}
      onDismiss={() => onOpenChange(false)}
    >
      <View style={styles.settingsStack}>
        <StatusPanel
          lastChecked={lastChecked}
          resultLine={resultLine}
          automaticCaptureActive={automaticCaptureActive}
        />

        <InsetSurface>
          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              <View style={styles.toggleTitleRow}>
                <Sparkles size={14} color="#34D399" />
                <Text style={styles.toggleTitle}>Auto-add new payments</Text>
              </View>
              <Text style={styles.toggleHint}>{liveImportHint}</Text>
            </View>
            <Switch
              value={liveListenerEnabled}
              onValueChange={onLiveToggle}
              disabled={syncing || !canEnableLiveImport}
              trackColor={{ false: "#334155", true: "#22C55E" }}
              thumbColor="#fff"
              accessibilityLabel="Auto-add new payments"
            />
          </View>
        </InsetSurface>
      </View>
    </AppDialog>
  );
}

type MoMoSmsExpenseReviewDialogProps = {
  visible: boolean;
  items: SmsExpenseCaptureItem[];
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  onClassify: (id: string, classification: "expense" | "transfer") => void;
  onCancel: () => void;
};

export function MoMoSmsExpenseReviewDialog({
  visible,
  items,
  saving,
  onOpenChange,
  onSave,
  onClassify,
  onCancel,
}: MoMoSmsExpenseReviewDialogProps) {
  const count = items.length;
  const title = count === 1 ? "Review 1 MoMo payment?" : `Review ${count} MoMo payments?`;
  const needsClassification = items.some(
    (item) => item.eventType === "p2p_send" && item.classification == null,
  );

  return (
    <AppDialog
      visible={visible}
      onOpenChange={onOpenChange}
      icon={<History size={22} color="#34D399" />}
      title={title}
      description="Review the MoMo expenses captured from your payment texts, then save them to your budget."
      primaryLabel={saving ? "Saving…" : needsClassification ? "Choose expense or transfer" : "Save"}
      onPrimary={onSave}
      primaryDisabled={needsClassification}
      secondaryLabel="Cancel"
      onSecondary={onCancel}
      loading={saving}
      primaryButtonClassName="bg-emerald-500"
      primaryLabelClassName="text-slate-950"
      secondaryButtonClassName="bg-rose-500/15 border-0"
      secondaryLabelClassName="text-rose-300 font-semibold"
    >
      {items.map((item) => (
        <View key={item.id} style={styles.reviewItem}>
          <View style={styles.reviewItemHeader}>
            <Text style={styles.reviewAmount}>
              ₵{formatCurrency(item.amount)}
            </Text>
            <Text style={styles.reviewDate}>{item.receivedAtLabel}</Text>
          </View>
          <Text style={styles.reviewDescription}>{item.description}</Text>
          <Text style={styles.reviewCategory}>{item.categoryName}</Text>
          {item.eventType === "p2p_send" ? (
            <View style={styles.classificationWrap}>
              <Text style={styles.classificationHint}>
                {item.classification ? "Classified as" : "Is this an expense or a transfer?"}
              </Text>
              <View style={styles.classificationRow}>
                {(["expense", "transfer"] as const).map((classification) => {
                  const selected = item.classification === classification;
                  return (
                    <Pressable
                      key={classification}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`Classify as ${classification}`}
                      onPress={() => onClassify(item.id, classification)}
                      style={({ pressed }) => [
                        styles.classificationButton,
                        selected && styles.classificationButtonSelected,
                        pressed && styles.classificationButtonPressed,
                      ]}
                    >
                      <Text style={[styles.classificationText, selected && styles.classificationTextSelected]}>
                        {classification === "expense" ? "Expense" : "Transfer"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
      ))}
    </AppDialog>
  );
}

export function openAndroidAppSettings(): void {
  void Linking.openSettings();
}

const styles = StyleSheet.create({
  insetSurface: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.14)",
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#020617",
        shadowOpacity: 0.35,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 1 },
    }),
  },
  enableStack: {
    gap: 10,
  },
  bodyCopy: {
    fontFamily: "Figtree-Regular",
    fontSize: 14,
    lineHeight: 20,
    color: "#cbd5e1",
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 2,
  },
  trustCopy: {
    fontFamily: "Figtree-Regular",
    fontSize: 12,
    lineHeight: 16,
    color: "#94a3b8",
  },
  settingsStack: {
    gap: 10,
  },
  statusStrip: {
    borderRadius: 16,
    backgroundColor: "rgba(16, 185, 129, 0.06)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#34d399",
    ...Platform.select({
      ios: {
        shadowColor: "#34d399",
        shadowOpacity: 0.85,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 0 },
      },
      android: { elevation: 2 },
    }),
  },
  statusStripIdle: {
    backgroundColor: "rgba(148, 163, 184, 0.06)",
  },
  statusDotIdle: {
    backgroundColor: "#94a3b8",
    shadowOpacity: 0,
  },
  statusLabelIdle: {
    color: "#cbd5e1",
  },
  statusLabel: {
    fontFamily: "Figtree-SemiBold",
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "rgba(110, 231, 183, 0.95)",
  },
  statusPrimary: {
    fontFamily: "Figtree-Medium",
    fontSize: 15,
    lineHeight: 20,
    color: "#f1f5f9",
  },
  statusSecondary: {
    marginTop: 2,
    fontFamily: "Figtree-Regular",
    fontSize: 13,
    lineHeight: 18,
    color: "#94a3b8",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 44,
  },
  toggleCopy: {
    flex: 1,
    paddingRight: 4,
  },
  toggleTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  toggleTitle: {
    fontFamily: "Figtree-Medium",
    fontSize: 14,
    lineHeight: 18,
    color: "#f1f5f9",
  },
  toggleHint: {
    marginTop: 2,
    fontFamily: "Figtree-Regular",
    fontSize: 12,
    lineHeight: 16,
    color: "#94a3b8",
  },
  reviewItem: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.14)",
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#020617",
        shadowOpacity: 0.35,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 1 },
    }),
  },
  reviewItemHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  reviewAmount: {
    fontFamily: "Figtree-SemiBold",
    fontSize: 16,
    lineHeight: 20,
    color: "#f87171",
  },
  reviewDate: {
    fontFamily: "Figtree-Regular",
    fontSize: 11,
    lineHeight: 14,
    color: "#94a3b8",
    flexShrink: 0,
  },
  classificationWrap: {
    marginTop: 10,
    gap: 8,
  },
  classificationHint: {
    fontFamily: "Figtree-Regular",
    fontSize: 12,
    lineHeight: 16,
    color: "#cbd5e1",
  },
  classificationRow: {
    flexDirection: "row",
    gap: 8,
  },
  classificationButton: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.14)",
  },
  classificationButtonSelected: {
    backgroundColor: "#fbbf24",
    borderColor: "#fbbf24",
  },
  classificationButtonPressed: {
    opacity: 0.82,
  },
  classificationText: {
    fontFamily: "Figtree-Medium",
    fontSize: 13,
    color: "#e2e8f0",
  },
  classificationTextSelected: {
    fontFamily: "Figtree-SemiBold",
    color: "#422006",
  },
  reviewDescription: {
    fontFamily: "Figtree-Medium",
    fontSize: 13,
    lineHeight: 18,
    color: "#e2e8f0",
    marginBottom: 4,
  },
  reviewCategory: {
    alignSelf: "flex-start",
    fontFamily: "Figtree-SemiBold",
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    color: "#6ee7b7",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.28)",
    overflow: "hidden",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});
