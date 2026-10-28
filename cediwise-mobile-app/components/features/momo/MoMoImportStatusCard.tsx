import { useFocusEffect, useRouter } from "expo-router";
import { AlertTriangle, ChevronRight, Radio, ShieldCheck } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { getNativeMoMoQueueItems } from "@/services/androidMoMoQueue";
import { getReceiveSmsPermissionGranted } from "@/services/androidSmsPermissions";
import { useSmsTrackingStore } from "@/stores/smsTrackingStore";
import type { BudgetTransaction } from "@/types/budget";
import { isMoMoSmsLiveImportEnabled } from "@/utils/featureFlags";
import { formatCurrency } from "@/utils/formatCurrency";

type Props = {
  userId?: string;
  variant: "home" | "budget";
  transactions?: BudgetTransaction[];
  activeCycleId?: string | null;
};

export function MoMoImportStatusCard({ userId, variant, transactions = [], activeCycleId }: Props) {
  const router = useRouter();
  const optedIn = useSmsTrackingStore((state) => state.optedIn);
  const liveEnabled = useSmsTrackingStore((state) => state.liveListenerEnabled);
  const lastSyncAt = useSmsTrackingStore((state) => state.lastSyncAt);
  const hydrate = useSmsTrackingStore((state) => state.hydrate);
  const [reviewCount, setReviewCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [receivePermissionGranted, setReceivePermissionGranted] = useState(Platform.OS !== "android");
  const [liveAvailable, setLiveAvailable] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!userId) return;
    let active = true;
    void hydrate(userId);
    void getReceiveSmsPermissionGranted().then(setReceivePermissionGranted).catch(() => {
      setReceivePermissionGranted(false);
    });
    void isMoMoSmsLiveImportEnabled(userId).then((enabled) => {
      if (active) setLiveAvailable(enabled);
    }).catch(() => {
      if (active) setLiveAvailable(false);
    });
    void getNativeMoMoQueueItems().then((items) => {
      if (!active) return;
      setReviewCount(items.filter((item) => item.state === "review").length);
      setPendingCount(items.filter((item) => item.state !== "review").length);
    }).catch(() => {});
    return () => {
      active = false;
    };
  }, [hydrate, userId]));

  const imported = useMemo(() => transactions.filter((transaction) => transaction.cycleId === activeCycleId && transaction.source === "sms_webhook"), [activeCycleId, transactions]);
  const importedTotal = imported.reduce((sum, transaction) => sum + transaction.amount, 0);
  const autoCaptureUnavailable = Platform.OS === "android" && optedIn && liveEnabled && !liveAvailable;
  const receivePermissionNeeded = Platform.OS === "android" && optedIn && liveEnabled && liveAvailable && !receivePermissionGranted;
  const needsAction = reviewCount + pendingCount > 0 || receivePermissionNeeded || autoCaptureUnavailable;
  if (!optedIn && !needsAction) return null;

  const Icon = needsAction ? AlertTriangle : variant === "budget" ? ShieldCheck : Radio;
  const color = needsAction ? "#FBBF24" : "#34D399";
  const title = receivePermissionNeeded
    ? "SMS permission required"
    : autoCaptureUnavailable
    ? "Automatic capture unavailable"
    : reviewCount > 0
    ? `${reviewCount} ${reviewCount === 1 ? "transaction needs" : "transactions need"} review`
    : pendingCount > 0
      ? `${pendingCount} waiting to sync`
      : variant === "budget"
        ? "Mobile money activity"
        : liveEnabled ? "Mobile money capture is active" : "Mobile money capture is paused";
  const detail = receivePermissionNeeded
    ? "Allow Receive SMS in Android settings to resume automatic capture."
    : autoCaptureUnavailable
    ? "Automatic capture is not enabled in this release. You can still scan or paste payment texts."
    : variant === "budget"
    ? `${imported.length} added this cycle · ${formatCurrency(importedTotal)}`
    : lastSyncAt ? `Last checked ${new Date(lastSyncAt).toLocaleString()}` : "Ready for supported provider messages";

  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={`${title}. ${detail}`}
    onPress={() => router.push("/profile/import-sms" as never)}
    className="min-h-20 flex-row items-center rounded-2xl border border-slate-700/70 bg-slate-950 px-4 py-3 active:bg-slate-900"
  >
    <View className="h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}18` }}><Icon color={color} size={21} /></View>
    <View className="ml-3 flex-1"><Text className="font-semibold text-white">{title}</Text><Text className="mt-1 text-sm text-slate-400">{detail}</Text></View>
    <ChevronRight color="#64748B" size={19} />
  </Pressable>;
}
