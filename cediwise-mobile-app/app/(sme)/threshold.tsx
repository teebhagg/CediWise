/**
 * SME Ledger - VAT Threshold Monitor
 * Shows GHS 750K threshold progress for goods businesses,
 * or "always register" banner for services/mixed.
 */

import { BackButton } from "@/components/BackButton";
import { GlassView } from "@/components/GlassView";
import { useSmeLedger } from "@/hooks/useSmeLedger";
import { useAuth } from "@/hooks/useAuth";
import { VAT_THRESHOLD_GHS } from "@/utils/vatEngine";
import {
  DEFAULT_EXPANDED_HEIGHT,
  DEFAULT_STANDARD_HEIGHT,
  ExpandedHeader,
} from "@/components/CediWiseHeader";
import { PULL_REFRESH_EMERALD } from "@/constants/pullToRefresh";
import { useSMELedgerStore } from "@/stores/smeLedgerStore";
import { waitWhile } from "@/utils/waitWhile";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import {
  AlertTriangle,
  CheckCircle,
  Info,
  ShieldAlert,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ThresholdScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const sme = useSmeLedger();

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const start = Date.now();
    try {
      await sme.hydrate();
    } finally {
      await waitWhile(() => useSMELedgerStore.getState().isLoading, {
        timeoutMs: 15_000,
        intervalMs: 48,
      });
      const elapsed = Date.now() - start;
      if (elapsed < 500) {
        await new Promise<void>((r) => setTimeout(r, 500 - elapsed));
      }
      setRefreshing(false);
    }
  }, [sme]);

  const formatGHS = (amount: number) =>
    `GH₵${amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const businessType = sme.profile?.businessType ?? "goods";
  const isGoods = businessType === "goods";

  const thresholdColor =
    sme.threshold.status === "over_threshold"
      ? "#EF4444"
      : sme.threshold.status === "approaching_80"
        ? "#F59E0B"
        : sme.threshold.status === "services_no_threshold"
          ? "#3B82F6"
          : "#10B981";

  const StatusIcon =
    sme.threshold.status === "over_threshold"
      ? AlertTriangle
      : sme.threshold.status === "approaching_80" || sme.threshold.status === "warning_60"
        ? ShieldAlert
        : sme.threshold.status === "services_no_threshold"
          ? Info
          : CheckCircle;

  return (
    <View style={styles.container}>
      <ExpandedHeader
        scrollY={scrollY}
        title="VAT Threshold"
        subtitle="Ghana Revenue Authority Monitor"
        leading={<BackButton />}
        refreshing={refreshing}
        refreshTintColor={PULL_REFRESH_EMERALD}
      />

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        snapToOffsets={[0, DEFAULT_EXPANDED_HEIGHT - DEFAULT_STANDARD_HEIGHT]}
        snapToEnd={false}
        decelerationRate="fast"
        contentContainerStyle={{
          paddingTop: DEFAULT_EXPANDED_HEIGHT + insets.top + 16,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 20,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PULL_REFRESH_EMERALD}
            colors={[PULL_REFRESH_EMERALD]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-4">
          {/* Status Card */}
          <GlassView style={[styles.card, { borderLeftColor: thresholdColor, borderLeftWidth: 4 }]}>
            <View className="flex-row items-center gap-4 mb-4">
              <View
                className="w-14 h-14 rounded-2xl items-center justify-center"
                style={{ backgroundColor: `${thresholdColor}15` }}
              >
                <StatusIcon color={thresholdColor} size={28} />
              </View>
              <View className="flex-1">
                <Text className="text-white text-lg font-bold">
                  {sme.threshold.status === "over_threshold"
                    ? "Over Threshold"
                    : sme.threshold.status === "approaching_80"
                      ? "Approaching Threshold"
                      : sme.threshold.status === "services_no_threshold"
                        ? "Always Register"
                        : sme.threshold.status === "warning_60"
                          ? "Warning Zone"
                          : "Below Threshold"}
                </Text>
                <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mt-0.5">
                  {businessType} Business
                </Text>
              </View>
            </View>

            <Text className="text-slate-300 text-sm leading-5">{sme.threshold.message}</Text>
          </GlassView>

          {/* Goods: Progress Bar */}
          {isGoods && (
            <GlassView style={styles.card}>
              <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-4">Annual Turnover Progress</Text>

              <View className="flex-row items-baseline gap-2 mb-4">
                <Text className="text-white text-3xl font-bold">
                  {formatGHS(sme.annualTurnover)}
                </Text>
                <Text className="text-slate-500 text-sm">
                  / {formatGHS(VAT_THRESHOLD_GHS)}
                </Text>
              </View>

              <View className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mb-3">
                <View
                  className="h-full rounded-full"
                  style={[
                    {
                      width: `${Math.min(100, sme.threshold.percentage)}%`,
                      backgroundColor: thresholdColor,
                    },
                  ]}
                />
              </View>

              <View className="flex-row justify-between">
                <Text className="text-slate-500 text-xs font-medium">Usage Level</Text>
                <Text className="text-white text-xs font-bold">{sme.threshold.percentage}% reached</Text>
              </View>

              {/* Milestones */}
              <View className="mt-6 gap-3">
                {[
                  { pct: 60, label: "Warning", reached: sme.threshold.percentage >= 60 },
                  { pct: 80, label: "Prepare", reached: sme.threshold.percentage >= 80 },
                  { pct: 100, label: "Register", reached: sme.threshold.percentage >= 100 },
                ].map((m) => (
                  <View key={m.pct} className="flex-row items-center gap-3">
                    <View
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: m.reached ? thresholdColor : "rgba(255,255,255,0.05)",
                        borderWidth: m.reached ? 0 : 1,
                        borderColor: 'rgba(255,255,255,0.1)'
                      }}
                    />
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: m.reached ? thresholdColor : "#64748b" }}
                    >
                      {m.pct}% — {m.label}
                    </Text>
                  </View>
                ))}
              </View>
            </GlassView>
          )}

          {/* Legal Info Section Header */}
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest pl-1">Registration Rules</Text>
            <View className="h-px flex-1 bg-white/5 ml-4" />
          </View>

          {/* Rules Card */}
          <GlassView style={styles.card}>
            {businessType === "goods" ? (
              <View className="gap-4">
                <View className="flex-row gap-3">
                   <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
                   <Text className="text-slate-300 text-sm leading-5 flex-1">
                     Businesses supplying <Text className="text-white font-bold">goods</Text> with
                     annual turnover exceeding <Text className="text-white font-bold">GH₵750,000</Text>{" "}
                     must register for VAT.
                   </Text>
                </View>
                <View className="flex-row gap-3">
                   <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
                   <Text className="text-slate-300 text-sm leading-5 flex-1">
                     VAT rate: <Text className="text-white font-bold">20%</Text> unified (15% VAT + 2.5% NHIL + 2.5% GETFund) under Act 1151.
                   </Text>
                </View>
                <View className="flex-row gap-3">
                   <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
                   <Text className="text-slate-300 text-sm leading-5 flex-1">
                     NHIL and GETFund are now re-coupled as input tax deductions for all registered businesses.
                   </Text>
                </View>
              </View>
            ) : (
              <View className="gap-4">
                <View className="flex-row gap-3">
                   <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
                   <Text className="text-slate-300 text-sm leading-5 flex-1">
                     <Text className="text-white font-bold">All service providers</Text> must register for VAT regardless of turnover.
                   </Text>
                </View>
                <View className="flex-row gap-3">
                   <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
                   <Text className="text-slate-300 text-sm leading-5 flex-1">
                     This applies even if your annual revenue is below GH₵750,000. Supplies of taxable services require registration.
                   </Text>
                </View>
              </View>
            )}

            <View className="mt-6 pt-4 border-t border-white/5">
              <Text className="text-slate-500 text-[11px] leading-4 italic text-center">
                This tool provides general guidance based on Ghana Revenue Authority (GRA) Act 1151. Consult a tax professional for specific advice.
              </Text>
            </View>
          </GlassView>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  card: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
});
