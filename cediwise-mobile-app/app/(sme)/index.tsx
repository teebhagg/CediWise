/**
 * SME Ledger Dashboard
 * Shows revenue, expenses, profit, VAT summary, and threshold status.
 */

import { GlassView } from "@/components/GlassView";
import { BackButton } from "@/components/BackButton";
import { useSmeLedger } from "@/hooks/useSmeLedger";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "expo-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  FileText,
  Plus,
  ShieldAlert,
  TrendingUp,
  ChevronRight,
  WifiOff,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton } from "@/components/PrimaryButton";
import {
  DEFAULT_EXPANDED_HEIGHT,
  DEFAULT_STANDARD_HEIGHT,
  ExpandedHeader,
  StandardHeader,
} from "@/components/CediWiseHeader";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { useConnectivity } from "@/hooks/useConnectivity";
import { log } from "@/utils/logger";
import { Card } from "heroui-native";

export default function SMEDashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sme = useSmeLedger();
  const { isConnected } = useConnectivity();

  const [refreshing, setRefreshing] = useState(false);

  // Self-Correction: If we have no profile but aren't loading, try to pull once.
  // This handles logout/login race conditions and interrupted bootstrap.
  useEffect(() => {
    if (!sme.profile && !sme.isLoading && isConnected) {
      log.info("[SME] Missing profile on dashboard. Triggering background pull...");
      void sme.hydrate();
    }
  }, [sme.profile, sme.isLoading, isConnected]);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await sme.hydrate();
    } finally {
      setRefreshing(false);
    }
  }, [sme]);

  const formatGHS = (amount: number) =>
    `GH₵${amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const connectivityIndicator = isConnected === false && (
    <View
      key="offline"
      className="mr-1 px-2 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 flex-row items-center gap-1"
    >
      <WifiOff size={12} color="#FCA5A5" />
      <Text className="text-red-300 font-medium text-[10px]">Offline</Text>
    </View>
  );

  const listAction = (
    <Pressable
      key="tx-list"
      onPress={() => router.push("/(sme)/transactions")}
      hitSlop={8}
      className="w-10 h-10 items-center justify-center rounded-full bg-white/5"
    >
      <FileText color="#9CA3AF" size={20} />
    </Pressable>
  );

  // ─── Setup Screen (no business profile yet) ─────
  if (!sme.isLoading && !sme.profile) {
    return (
      <View style={styles.container}>
        <StandardHeader
          title="Business Setup"
          centered
          actions={[connectivityIndicator]}
        />
        <Animated.ScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={{
            paddingTop: DEFAULT_EXPANDED_HEIGHT + insets.top + 16,
            paddingBottom: insets.bottom + 40,
            paddingHorizontal: 20,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" colors={["#10B981"]} />
          }
        >
          <View style={styles.setupContainer}>
            <Briefcase color="#10B981" size={48} />
            <Text style={styles.setupTitle}>Set Up Your Business</Text>
            <Text style={styles.setupSubtitle}>
              Start tracking your sales, expenses, and VAT.
            </Text>

            <PrimaryButton
              onPress={() => router.push("/(sme)/setup")}
              style={{ marginTop: 20 }}
            >
              Get Started
            </PrimaryButton>
          </View>
        </Animated.ScrollView>
      </View>
    );
  }

  // ─── Loading ────────────────────────────────────
  if (sme.isLoading) {
    return (
      <View style={styles.container}>
        <ExpandedHeader
          scrollY={scrollY}
          title="SME Ledger"
          subtitle="Loading your data..."
          leading={<BackButton />}
          actions={[connectivityIndicator]}
        />
        <View style={[styles.centered, { flex: 1 }]}>
          <Text style={styles.loadingText}>Loading business data...</Text>
        </View>
      </View>
    );
  }

  // ─── Dashboard ──────────────────────────────────
  const thresholdColor =
    sme.threshold.status === "over_threshold"
      ? "#EF4444"
      : sme.threshold.status === "approaching_80"
        ? "#F59E0B"
        : sme.threshold.status === "services_no_threshold"
          ? "#3B82F6"
          : "#10B981";

  return (
    <SafeAreaView style={styles.container}>
      <ExpandedHeader
        scrollY={scrollY}
        title={sme.profile?.businessName ?? "SME Ledger"}
        subtitle={sme.profile?.businessCategory ?? "Business Finance & VAT Tracker"}
        actions={[connectivityIndicator, listAction]}
      />

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        snapToOffsets={[0, DEFAULT_EXPANDED_HEIGHT - DEFAULT_STANDARD_HEIGHT]}
        snapToEnd={false}
        decelerationRate="fast"
        contentContainerStyle={{
          paddingTop: DEFAULT_EXPANDED_HEIGHT + 16,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 20,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" colors={["#10B981"]} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-4">
          {/* Summary Cards */}
          <View className="flex-row gap-3">
            <Card style={{ flex: 1, padding: 16, borderRadius: 35 }}>
              <View className="flex-row items-center gap-2 mb-1">
                <View className="w-8 h-8 rounded-xl bg-emerald-500/10 items-center justify-center">
                  <ArrowUpRight color="#10B981" size={16} />
                </View>
                <Text className="text-slate-400 text-xs font-semibold tracking-wider">REVENUE</Text>
              </View>
              <Text className="text-emerald-400 text-xl font-bold">
                {formatGHS(sme.totals.totalRevenue)}
              </Text>
            </Card>

            <Card style={{ flex: 1, padding: 16, borderRadius: 35 }}>
              <View className="flex-row items-center gap-2 mb-1">
                <View className="w-8 h-8 rounded-xl bg-rose-500/10 items-center justify-center">
                  <ArrowDownRight color="#EF4444" size={16} />
                </View>
                <Text className="text-slate-400 text-xs font-semibold tracking-wider">EXPENSES</Text>
              </View>
              <Text className="text-rose-400 text-xl font-bold">
                {formatGHS(sme.totals.totalExpenses)}
              </Text>
            </Card>
          </View>

          {/* Profit */}
          <Card style={{ padding: 20, borderRadius: 35 }}>
            <View className="absolute top-0 right-0 p-4 opacity-5">
              <TrendingUp color="#10B981" size={80} />
            </View>
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-slate-400 text-xs font-semibold tracking-wider mb-1">NET PROFIT</Text>
                <Text
                  className={`text-3xl font-bold ${sme.totals.profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                >
                  {formatGHS(sme.totals.profit)}
                </Text>
              </View>
              <View className={`w-12 h-12 rounded-2xl items-center justify-center ${sme.totals.profit >= 0 ? "bg-emerald-500/20" : "bg-rose-500/20"}`}>
                <TrendingUp
                  color={sme.totals.profit >= 0 ? "#10B981" : "#EF4444"}
                  size={24}
                />
              </View>
            </View>
          </Card>

          {/* VAT Summary Section Header */}
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest pl-1">Tax Management</Text>
            <View className="h-px flex-1 bg-white/5 ml-4" />
          </View>

          {/* VAT Summary */}
          <Card style={{ padding: 20, borderRadius: 35 }}>
             <View className="flex-row justify-between mb-4">
               <View>
                 <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">COLLECTED</Text>
                 <Text className="text-amber-500 text-sm font-bold">{formatGHS(sme.totals.vatCollected)}</Text>
               </View>
               <View className="items-center">
                 <View className="h-8 w-px bg-white/10" />
               </View>
               <View>
                  <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">PAID (INPUT)</Text>
                  <Text className="text-slate-300 text-sm font-bold">{formatGHS(sme.totals.vatPaid)}</Text>
               </View>
               <View className="items-center">
                 <View className="h-8 w-px bg-white/10" />
               </View>
               <View className="items-end">
                  <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">NET PAYABLE</Text>
                  <Text className={`text-sm font-bold ${sme.totals.vatPayable > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                    {formatGHS(Math.abs(sme.totals.vatPayable))}
                  </Text>
               </View>
             </View>
             
             <View className="pt-3 border-t border-white/5">
                <Text className="text-slate-500 text-[11px] leading-4 italic">
                  * Based on Act 1151 (20% Unified Rate: 15% VAT + 2.5% NHIL + 2.5% GETFund)
                </Text>
             </View>
          </Card>

          {/* Threshold Monitoring */}
          <Pressable onPress={() => router.push("/(sme)/threshold")}>
            <Card style={{ padding: 16, borderRadius: 35 }}>
              <View className="flex-row items-center gap-3 mb-3">
                <View className="w-10 h-10 rounded-2xl items-center justify-center" style={{ backgroundColor: `${thresholdColor}15` }}>
                  <ShieldAlert color={thresholdColor} size={20} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-white font-bold">VAT Registration Status</Text>
                    <ChevronRight color="#4B5563" size={16} />
                  </View>
                  <Text className="text-slate-400 text-xs mt-0.5" numberOfLines={1}>
                    {sme.threshold.message}
                  </Text>
                </View>
              </View>
              
              {sme.profile?.businessType === "goods" && (
                <View>
                  <View className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <View
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, sme.threshold.percentage)}%`,
                        backgroundColor: thresholdColor,
                      }}
                    />
                  </View>
                  <View className="flex-row justify-between mt-2">
                    <Text className="text-slate-500 text-[10px] font-bold uppercase">Progress</Text>
                    <Text className="text-white text-[10px] font-bold">{sme.threshold.percentage}%</Text>
                  </View>
                </View>
              )}
            </Card>
          </Pressable>

          {/* Monthly Section Header */}
          <View className="mt-2 flex-row items-center justify-between">
             <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest pl-1">This Month</Text>
             <View className="h-px flex-1 bg-white/5 ml-4" />
          </View>

          {/* Monthly Summary */}
          <Card style={{ padding: 20, borderRadius: 35 }}>
            <View className="flex-row justify-between">
              {[
                { label: 'REVENUE', val: sme.monthlyTotals.totalRevenue, color: 'text-white' },
                { label: 'EXPENSES', val: sme.monthlyTotals.totalExpenses, color: 'text-white' },
                { label: 'PROFIT', val: sme.monthlyTotals.profit, color: sme.monthlyTotals.profit >= 0 ? "text-emerald-400" : "text-rose-400" }
              ].map((item, i) => (
                <View key={i} className="items-center flex-1">
                  <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">{item.label}</Text>
                  <Text className={`text-sm font-bold ${item.color}`}>
                    {formatGHS(item.val)}
                  </Text>
                </View>
              ))}
            </View>
          </Card>

          {/* Navigation/Action Grid */}
          <View className="flex-row gap-3 mt-2">
             <Pressable className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-5 items-center justify-center gap-2"
                onPress={() => router.push({ pathname: "/(sme)/add-transaction", params: { type: "income" } })}>
                <View className="w-10 h-10 rounded-2xl bg-emerald-500/20 items-center justify-center">
                  <Plus color="#10B981" size={24} />
                </View>
                <Text className="text-emerald-400 font-bold">New Sale</Text>
             </Pressable>
             
             <Pressable className="flex-1 bg-rose-500/10 border border-rose-500/20 rounded-lg p-5 items-center justify-center gap-2"
                onPress={() => router.push({ pathname: "/(sme)/add-transaction", params: { type: "expense" } })}>
                <View className="w-10 h-10 rounded-2xl bg-rose-500/20 items-center justify-center">
                  <Plus color="#EF4444" size={24} />
                </View>
                <Text className="text-rose-400 font-bold">Expense</Text>
             </Pressable>
          </View>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#9CA3AF",
    fontSize: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  setupContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 16,
    marginTop: 40,
  },
  setupTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  setupSubtitle: {
    color: "#9CA3AF",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
});
