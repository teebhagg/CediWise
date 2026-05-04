/**
 * Subscription Details Screen
 * Shows current tier status, billing info, features, and upgrade CTA.
 */

import { BackButton } from "@/components/BackButton";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ANALYTICS_EVENTS } from "@/constants/analyticsEvents";
import { useTierContext } from "@/contexts/TierContext";
import { useAuth } from "@/hooks/useAuth";
import { getPostHogOptional } from "@/utils/analytics/posthogClientRef";
import { supabase } from "@/utils/supabase";
import { reportError } from "@/utils/telemetry";
import type { UserTier } from "@/utils/tierGate";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  ArrowRight,
  Calendar,
  Check,
  Clock,
  CreditCard,
  Crown,
  Shield,
  Sparkles,
  X,
  Zap,
  ChevronRight,
} from "lucide-react-native";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlashList } from "@shopify/flash-list";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface SubscriptionData {
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  currentPeriodStart: string | null;
}

const PLAN_CONFIG: Record<
  UserTier,
  {
    name: string;
    price: string;
    icon: typeof Shield;
    color: string;
    bgColor: string;
    features: string[];
  }
> = {
  free: {
    name: "Free Plan",
    price: "GHS 0",
    icon: CreditCard,
    color: "#94A3B8",
    bgColor: "rgba(148,163,184,0.1)",
    features: [
      "Basic income tax calculator",
      "Paycheck breakdown",
      "Tier 1, 2, 3 GRA rates",
      "Limited offline access",
    ],
  },
  budget: {
    name: "Smart Budget",
    price: "GHS 15",
    icon: Zap,
    color: "#10B981",
    bgColor: "rgba(16,185,129,0.1)",
    features: [
      "Everything in Free",
      "Smart budgeting & progress bars",
      "Debt dashboard & payoff plans",
      "Recurring expenses & insights",
      "Interactive charts & graphs",
      "Full offline mode",
    ],
  },
  sme: {
    name: "SME Ledger",
    price: "GHS 25",
    icon: Crown,
    color: "#10B981",
    bgColor: "rgba(16,185,129,0.1)",
    features: [
      "Everything in Smart Budget",
      "Sales & expenses ledger",
      "Automatic 20% VAT calculations",
      "GHS 750k registration monitor",
      "Monthly business reports",
      "CSV export for accountants",
    ],
  },
};

export default function SubscriptionScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    effectiveTier,
    isOnTrial,
    trialEndsAt,
    pendingTier,
    pendingTierStartDate,
    cancelAtPeriodEnd,
  } = useTierContext();

  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null
  );
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionLoadError, setSubscriptionLoadError] = useState<
    string | null
  >(null);
  const fetchAbortRef = useRef(false);

  const loadSubscription = useCallback(() => {
    fetchAbortRef.current = false;
    if (!user?.id || !supabase) {
      setSubscription(null);
      setSubscriptionLoading(false);
      setSubscriptionLoadError(null);
      return;
    }

    setSubscriptionLoading(true);
    setSubscriptionLoadError(null);

    void (async () => {
      try {
        const { data, error } = await supabase
          .from("subscriptions")
          .select("plan, status, current_period_end, current_period_start")
          .eq("user_id", user.id)
          .maybeSingle();

        if (fetchAbortRef.current) return;

        if (error) {
          setSubscriptionLoadError(error.message);
          reportError(error, {
            feature: "subscription",
            operation: "fetch_subscription",
            screen: "/subscription",
            extra: { code: error.code },
          });
          getPostHogOptional()?.capture(ANALYTICS_EVENTS.subscriptionFetchFailed, {
            error_code: error.code ?? "unknown",
          });
          return;
        }

        if (data) {
          setSubscription({
            plan: data.plan,
            status: data.status,
            currentPeriodEnd: data.current_period_end,
            currentPeriodStart: data.current_period_start,
          });
        }
      } catch (e) {
        if (fetchAbortRef.current) return;
        const message = e instanceof Error ? e.message : "Unknown error";
        setSubscriptionLoadError(message);
        reportError(e, {
          feature: "subscription",
          operation: "fetch_subscription",
          screen: "/subscription",
        });
        getPostHogOptional()?.capture(ANALYTICS_EVENTS.subscriptionFetchFailed, {
          error_code: "exception",
        });
      } finally {
        if (!fetchAbortRef.current) {
          setSubscriptionLoading(false);
        }
      }
    })();
  }, [user?.id]);

  useEffect(() => {
    loadSubscription();
    return () => {
      fetchAbortRef.current = true;
    };
  }, [loadSubscription]);

  const getTrialDaysLeft = useCallback((endsAt: string | null) => {
    if (!endsAt) return 0;
    const end = new Date(endsAt);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const config = PLAN_CONFIG[effectiveTier];
  const PlanIcon = config.icon;
  const trialDaysLeft = getTrialDaysLeft(trialEndsAt);

  const nextUpgrade: UserTier | null =
    effectiveTier === "free"
      ? "budget"
      : effectiveTier === "budget"
        ? "sme"
        : null;

  const handleUpgradePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/upgrade");
  }, [router]);

  const renderFeatureRow = useCallback(
    ({ item: feature }: { item: string }) => (
      <View style={styles.featureRow}>
        <Check
          color={effectiveTier === "free" ? "#6B7280" : "#10B981"}
          size={18}
        />
        <Text
          style={[
            styles.featureText,
            effectiveTier === "free" && { color: "#6B7280" },
          ]}
        >
          {feature}
        </Text>
      </View>
    ),
    [effectiveTier],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <BackButton />
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={{ width: 40 }} />
      </View>

      {subscriptionLoading ? (
        <View style={styles.inlineNoticeRow}>
          <ActivityIndicator size="small" color="#94A3B8" />
          <Text style={styles.inlineNoticeMuted}>Loading subscription…</Text>
        </View>
      ) : null}
      {subscriptionLoadError ? (
        <View style={styles.inlineNotice}>
          <Text style={styles.inlineNoticeError}>
            Could not load billing details from the server.
          </Text>
          <Text style={styles.inlineNoticeMutedSmall}>{subscriptionLoadError}</Text>
          <PrimaryButton
            onPress={() => {
              loadSubscription();
            }}
            style={styles.subscriptionRetryButton}>
            <Text style={styles.subscriptionRetryLabel}>Try again</Text>
          </PrimaryButton>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Plan Card */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <View style={styles.planCard}>
            {/* Glow */}
            {effectiveTier !== "free" && (
              <View
                style={[styles.glow, { backgroundColor: `${config.color}10` }]}
              />
            )}

            {/* Plan Header */}
            <View style={styles.planHeader}>
              <View
                style={[
                  styles.planIconBg,
                  { backgroundColor: config.bgColor },
                ]}
              >
                <PlanIcon color={config.color} size={26} />
              </View>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>{config.name}</Text>
                <Text style={styles.planPrice}>
                  {config.price}
                  {effectiveTier !== "free"
                    ? subscription?.status === "trial"
                      ? " (trial)"
                      : "/month"
                    : "/forever"}
                </Text>
              </View>
              {isOnTrial && (
                <View style={styles.trialBadge}>
                  <Sparkles color="#F59E0B" size={14} />
                  <Text style={styles.trialBadgeText}>TRIAL</Text>
                </View>
              )}
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Pending Tier Banner */}
            {pendingTier && pendingTierStartDate && (
              <View style={styles.pendingBanner}>
                <Calendar color="#F59E0B" size={16} />
                <View style={styles.pendingTextWrap}>
                  <Text style={styles.pendingText}>
                    {pendingTier === "free"
                      ? cancelAtPeriodEnd
                        ? "Plan ends"
                        : "Downgrading to Free"
                      : `${pendingTier === "sme" ? "SME Ledger" : "Smart Budget"} starts`}
                  </Text>
                  <Text style={styles.pendingDate}>
                    {formatDate(pendingTierStartDate)}
                  </Text>
                </View>
              </View>
            )}

            {/* Details */}
            {isOnTrial ? (
              <>
                <DetailRow
                  icon={Clock}
                  label="Trial ends"
                  value={formatDate(trialEndsAt)}
                />
                <DetailRow
                  icon={Calendar}
                  label="Days remaining"
                  value={`${trialDaysLeft} days`}
                  valueColor="#F59E0B"
                />
                <DetailRow
                  icon={Shield}
                  label="During trial"
                  value="Full SME access"
                />
                {pendingTier && pendingTierStartDate && (
                  <DetailRow
                    icon={ChevronRight}
                    label="Paid plan starts"
                    value={`${PLAN_CONFIG[pendingTier as UserTier]?.name} · ${formatDate(pendingTierStartDate)}`}
                    valueColor="#10B981"
                  />
                )}
              </>
            ) : effectiveTier !== "free" ? (
              <>
                <DetailRow
                  icon={Calendar}
                  label={cancelAtPeriodEnd ? "Access until" : "Next billing"}
                  value={formatDate(
                    subscription?.currentPeriodEnd || trialEndsAt
                  )}
                />
                <DetailRow
                  icon={CreditCard}
                  label="Plan"
                  value={
                    subscription?.status === "trial"
                      ? "Trial"
                      : "Monthly"
                  }
                />
                <DetailRow
                  icon={Shield}
                  label="Status"
                  value={
                    cancelAtPeriodEnd
                      ? "Cancelling at period end"
                      : subscription?.status === "active"
                        ? "Active"
                        : subscription?.status || "—"
                  }
                  valueColor={cancelAtPeriodEnd ? "#F59E0B" : "#10B981"}
                />
                {pendingTier && pendingTierStartDate && (
                  <DetailRow
                    icon={ChevronRight}
                    label="Next plan"
                    value={`${PLAN_CONFIG[pendingTier as UserTier]?.name ?? pendingTier} · ${formatDate(pendingTierStartDate)}`}
                    valueColor={pendingTier === "free" ? "#EF4444" : "#F59E0B"}
                  />
                )}
              </>
            ) : (
              <>
                <DetailRow
                  icon={Shield}
                  label="Status"
                  value="Free tier"
                  valueColor="#94A3B8"
                />
                <DetailRow
                  icon={X}
                  label="Budgeting tools"
                  value="Not included"
                  valueColor="#6B7280"
                />
                <DetailRow
                  icon={X}
                  label="SME Ledger"
                  value="Not included"
                  valueColor="#6B7280"
                />
              </>
            )}

            {/* Action */}
            <View style={styles.planActions}>
              {effectiveTier !== "free" && !isOnTrial ? (
                <Pressable
                  style={styles.actionButton}
                  onPress={handleUpgradePress}
                >
                  <Text style={styles.actionButtonText}>
                    {cancelAtPeriodEnd ? "Review Plan" : "Change Plan"}
                  </Text>
                </Pressable>
              ) : isOnTrial ? (
                (
                  <PrimaryButton onPress={handleUpgradePress}>
                    <Text style={styles.primaryButtonText}>{trialDaysLeft <= 10 ? "Choose a Plan" : "Check out our plans"}</Text>
                    <ArrowRight color="#020617" size={18} />
                  </PrimaryButton>
                )
              ) : (
                <PrimaryButton onPress={handleUpgradePress}>
                  <Text style={styles.primaryButtonText}>Upgrade Now</Text>
                  <ArrowRight color="#020617" size={18} />
                </PrimaryButton>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Your Features */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <Text style={styles.sectionTitle}>Your Features</Text>
          <View style={styles.featuresCard}>
            <FlashList
              data={config.features}
              scrollEnabled={false}
              nestedScrollEnabled
              keyExtractor={(item, index) => `${effectiveTier}-${index}-${item}`}
              extraData={effectiveTier}
              renderItem={renderFeatureRow}
            />
          </View>
        </Animated.View>

        {/* Upgrade Nudge (if not on highest tier) */}
        {nextUpgrade && (
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <PrimaryButton
              onPress={handleUpgradePress}
            >
              <View style={styles.nudgeContent}>
                <Sparkles color="#F59E0B" size={22} />
                <View style={styles.nudgeText}>
                  <Text style={styles.nudgeTitle}>
                    {nextUpgrade === "budget"
                      ? "Unlock budgeting tools"
                      : "Upgrade to SME Ledger"}
                  </Text>
                  <Text style={styles.nudgeSubtitle}>
                    {nextUpgrade === "budget"
                      ? "Track spending, manage debt, get insights"
                      : "Business finance suite with VAT tracking"}
                  </Text>
                </View>
              </View>
              <ArrowRight color="#F59E0B" size={20} />
            </PrimaryButton>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Helper Components ─────────────────────────────────────────────────

function DetailRow({
  icon: Icon,
  label,
  value,
  valueColor,
}: {
  icon: typeof Shield;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Icon color="#6B7280" size={16} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, valueColor && { color: valueColor }]}>
        {value}
      </Text>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
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
  },
  inlineNotice: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  inlineNoticeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  subscriptionRetryButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    minHeight: 44,
    paddingHorizontal: 20,
  },
  subscriptionRetryLabel: {
    color: "#020617",
    fontFamily: "Figtree-SemiBold",
    fontSize: 15,
  },
  inlineNoticeMuted: {
    color: "#94a3b8",
    fontSize: 14,
  },
  inlineNoticeMutedSmall: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 4,
  },
  inlineNoticeError: {
    color: "#f87171",
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 60,
  },

  // Plan Card
  planCard: {
    backgroundColor: "rgba(18,22,33,0.9)",
    borderRadius: 32,
    padding: 24,
    borderWidth: 1.5,
    borderColor: "rgba(16,185,129,0.25)",
    overflow: "hidden",
    marginTop: 8,
  },
  glow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    opacity: 0.6,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  planIconBg: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
  },
  planPrice: {
    color: "#94A3B8",
    fontSize: 14,
    marginTop: 2,
  },
  trialBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245,158,11,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  trialBadgeText: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginVertical: 16,
  },

  // Details
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  detailLabel: {
    color: "#94A3B8",
    fontSize: 14,
    flex: 1,
  },
  detailValue: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },

  // Actions
  planActions: {
    marginTop: 8,
  },
  actionButton: {
    backgroundColor: "rgba(16,185,129,0.15)",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#10B981",
    fontSize: 15,
    fontWeight: "600",
  },
  primaryButtonText: {
    color: "#020617",
    fontSize: 15,
    fontWeight: "600",
  },

  // Section
  sectionTitle: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 12,
  },

  // Features Card
  featuresCard: {
    backgroundColor: "rgba(18,22,33,0.9)",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    gap: 14,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureText: {
    color: "#D1D5DB",
    fontSize: 14,
  },

  // Nudge Card
  nudgeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(245,158,11,0.08)",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.2)",
    marginTop: 16,
  },
  nudgeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  nudgeText: {
    flex: 1,
  },
  nudgeTitle: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
  nudgeSubtitle: {
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 2,
  },

  // Pending Tier Banner
  pendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(245,158,11,0.08)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.2)",
    marginTop: 12,
  },
  pendingTextWrap: {
    flex: 1,
  },
  pendingText: {
    color: "#F59E0B",
    fontSize: 14,
    fontWeight: "600",
  },
  pendingDate: {
    color: "#D97706",
    fontSize: 13,
    marginTop: 2,
  },

  // Choose Later (trial > 10 days)
  chooseLaterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  chooseLaterText: {
    color: "#6B7280",
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
});
