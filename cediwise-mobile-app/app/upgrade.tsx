/**
 * Upgrade Screen
 * Paystack in-app WebView for subscription payment.
 * Refactored to use heroui-native Card, StandardHeader, and PrimaryButton.
 */

import { Card } from "heroui-native";
import { BackButton } from "@/components/BackButton";
import { StandardHeader } from "@/components/CediWiseHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useTierContext } from "@/contexts/TierContext";
import { useAuth } from "@/hooks/useAuth";
import { useAppToast } from "@/hooks/useAppToast";
import { supabase } from "@/utils/supabase";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Check,
  Crown,
  Shield,
  Zap,
  X
} from "lucide-react-native";
import { log } from "@/utils/logger";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePaystack } from "react-native-paystack-webview";

type PlanKey = "free_tier" | "budget_monthly" | "budget_quarterly" | "sme_monthly" | "sme_quarterly";
type BillingCycle = "monthly" | "quarterly";

interface PlanOption {
  key: PlanKey;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  icon: typeof Zap;
  recommended?: boolean;
}

const PLANS: PlanOption[] = [
  {
    key: "free_tier",
    name: "Free",
    price: "GHS 0",
    period: "/forever",
    description: "Personal tax tools",
    features: [
      "Basic income tax calculator",
      "Paycheck breakdown",
      "Tier 1, 2, 3 GRA rates",
      "Limited offline access",
    ],
    icon: Shield,
  },
  {
    key: "budget_monthly",
    name: "Smart Budget",
    price: "GHS 15",
    period: "/month",
    description: "Budgeting, debt & insights",
    features: [
      "Everything in Free",
      "Smart budgeting & progress bars",
      "Debt dashboard & payoff plans",
      "Recurring expenses & insights",
      "Interactive charts & graphs",
    ],
    icon: Zap,
    recommended: true, // Most Popular
  },
  {
    key: "sme_monthly",
    name: "SME Ledger",
    price: "GHS 25",
    period: "/month",
    description: "Business finance suite",
    features: [
      "Everything in Smart Budget",
      "Sales & expenses ledger",
      "Automatic 20% VAT calculations",
      "GHS 750k registration monitor",
      "Monthly business reports",
      "CSV export for accountants",
    ],
    icon: Crown,
  },
];

export default function UpgradeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tier: currentTier, isOnTrial, trialEndsAt, pendingTier, pendingTierStartDate, refreshTier } = useTierContext();
  const { showSuccess, showError } = useAppToast();

  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [isProcessing, setIsProcessing] = useState(false);
  const paystack = usePaystack();

  const toggleBilling = (cycle: BillingCycle) => {
    if (billingCycle !== cycle) {
      setBillingCycle(cycle);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const getPrice = (plan: PlanOption) => {
    if (plan.key === "free_tier") return "GHS 0";
    if (billingCycle === "quarterly") {
      if (plan.key === "budget_monthly") return "GHS 39";
      if (plan.key === "sme_monthly") return "GHS 65";
    }
    return plan.price;
  };

  const getPeriod = (plan: PlanOption) => {
    if (plan.key === "free_tier") return "/forever";
    return billingCycle === "monthly" ? "/month" : "/quarter";
  };

  const trialDaysLeft = isOnTrial && trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  const showTrialButtons = !isOnTrial || trialDaysLeft <= 10;

  const onPaymentSuccess = useCallback(async (res: any, planKey: PlanKey) => {
    setIsProcessing(true);
    
    // OPTIMISTIC WRITE: Update DB immediately while waiting for webhook
    const isSme = planKey.includes("sme");
    const targetTier = isSme ? "sme" : "budget";

    try {
      const updatePayload: any = { updated_at: new Date().toISOString() };
      
      if (isOnTrial) {
        // STACK: Set as pending
        updatePayload.pending_tier = targetTier;
        updatePayload.pending_tier_start_date = trialEndsAt;
      } else {
        // UPGRADE: Immediate
        updatePayload.tier = targetTier;
        updatePayload.pending_tier = null;
        updatePayload.pending_tier_start_date = null;
      }

      if (!supabase) return;
      await supabase.from("profiles").update(updatePayload).eq("id", user?.id);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showSuccess("Success!", isOnTrial ? "Your sub is stacked! Paid plan starts after trial." : "Plan upgraded!");
    } catch (err) {
      // SILENT FALLBACK: Webhook will handle it
      log.warn("Optimistic update failed:", err);
      showSuccess("Payment Received!", "Your account is being updated. Close and reopen the app if changes don't appear in a moment.");
    }

    await refreshTier();
    setIsProcessing(false);
    router.back();
  }, [user?.id, isOnTrial, trialEndsAt, refreshTier, showSuccess, router]);

  const onPaymentCancel = useCallback(() => {
    setIsProcessing(false);
  }, []);

  const handleSelectPlan = useCallback(
    async (plan: PlanOption) => {
      if (plan.key === "free_tier") {
        router.back();
        return;
      }
      if (!user?.id || !supabase) return;

      const planKey = billingCycle === "quarterly"
        ? (plan.key.replace("monthly", "quarterly") as PlanKey)
        : plan.key;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const amount = planKey.includes("budget") 
        ? (planKey.includes("quarterly") ? 39 : 15)
        : (planKey.includes("quarterly") ? 65 : 25);

      paystack.popup.checkout({
        amount: amount, // Paystack uses kobo/pesewas
        email: user?.email || `user-${user.id}@cediwise.app`,
        metadata: {
          planKey,
          userId: user.id
        },
        onSuccess: (res: any) => onPaymentSuccess(res, planKey),
        onCancel: onPaymentCancel,
      });
    },
    [user, billingCycle, router, paystack, onPaymentSuccess, onPaymentCancel]
  );

  // Downgrade handler — schedules change for end of current period
  const handleDowngrade = useCallback(
    async (targetTier: "budget" | "free") => {
      if (!user?.id || !supabase) return;

      setIsProcessing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      try {
        // Get current period end
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("current_period_end")
          .eq("user_id", user.id)
          .single();

        const periodEnd =
          sub?.current_period_end ||
          new Date(Date.now() + 30 * 86400000).toISOString();

        // Set pending tier + cancel flag
        await supabase
          .from("profiles")
          .update({
            pending_tier: targetTier,
            pending_tier_start_date: periodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);

        await supabase
          .from("subscriptions")
          .update({
            cancel_at_period_end: true,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);

        await refreshTier();

        const label =
          targetTier === "budget" ? "Smart Budget" : "Free Plan";
        const date = new Date(periodEnd).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showSuccess(
          "Downgrade Scheduled",
          `${label} starts on ${date}. You keep current access until then.`
        );
        router.back();
      } catch {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showError("Error", "Could not schedule downgrade. Try again.");
      } finally {
        setIsProcessing(false);
      }
    },
    [user?.id, refreshTier, showSuccess, showError, router]
  );

  return (
    <View style={styles.container}>
      <StandardHeader 
        title="Upgrade Plan" 
        centered
        leading={<BackButton />}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent, 
          { 
            paddingTop: 140, // Safe spacing under the floating StandardHeader
            paddingBottom: insets.bottom + 40 
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isOnTrial && (
          <View style={styles.trialBanner}>
            <Shield color="#10B981" size={18} />
            <Text style={styles.trialText}>
              {pendingTier 
                ? `Trial active. Next plan (${pendingTier.toUpperCase()}) starts ${pendingTierStartDate ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(pendingTierStartDate)) : ''}` 
                : "You're currently enjoying a free trial"
              }
            </Text>
          </View>
        )}

        {/* Current Tier Context */}
        <View style={styles.currentTierBar}>
          <Text style={styles.currentTierLabel}>Currently on</Text>
          <Text style={styles.currentTierName}>
            {currentTier === "sme" ? "SME Ledger" : currentTier === "budget" ? "Smart Budget" : "Free Plan"}
          </Text>
        </View>

        {/* Billing Toggle */}
        <View style={styles.billingToggleWrapper}>
            <View style={styles.billingToggle}>
            <Pressable
                style={[
                styles.billingPill,
                billingCycle === "monthly" && styles.billingPillActive,
                ]}
                onPress={() => toggleBilling("monthly")}
            >
                <Text
                style={[
                    styles.billingText,
                    billingCycle === "monthly" && styles.billingTextActive,
                ]}
                >
                Monthly
                </Text>
            </Pressable>
            <Pressable
                style={[
                styles.billingPill,
                billingCycle === "quarterly" && styles.billingPillActive,
                ]}
                onPress={() => toggleBilling("quarterly")}
            >
                <Text
                style={[
                    styles.billingText,
                    billingCycle === "quarterly" && styles.billingTextActive,
                ]}
                >
                Quarterly
                </Text>
                <View style={styles.saveBadge}>
                <Text style={styles.saveBadgeText}>-13%</Text>
                </View>
            </Pressable>
            </View>
        </View>

        {/* Plan Cards */}
        <View style={styles.plansList}>
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isFree = plan.key === "free_tier";

            return (
              <Card 
                key={plan.key} 
                className={`mb-4 ${plan.recommended ? "border-emerald-500/40 border-2" : "border-white/10"}`}
                style={[styles.planCard]}
              >
                {plan.recommended && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>MOST POPULAR</Text>
                  </View>
                )}

                <View style={styles.planHeader}>
                  <View className={`w-12 h-12 rounded-2xl items-center justify-center ${plan.recommended ? "bg-emerald-500/20" : "bg-white/5"}`}>
                    <Icon color={plan.recommended ? "#10B981" : "#9CA3AF"} size={22} />
                  </View>
                  <View>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planDescription}>{plan.description}</Text>
                  </View>
                </View>

                <View style={styles.priceRow}>
                  <Text style={styles.price}>{getPrice(plan)}</Text>
                  <Text style={styles.pricePeriod}>{getPeriod(plan)}</Text>
                </View>

                <View style={styles.featuresList}>
                  {plan.features.map((feature, i) => (
                    <View key={i} style={styles.featureRow}>
                      <View className="w-5 h-5 rounded-full bg-emerald-500/10 items-center justify-center">
                        <Check color="#10B981" size={12} strokeWidth={3} />
                      </View>
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                {showTrialButtons ? (
                  <PrimaryButton
                    onPress={() => handleSelectPlan(plan)}
                    loading={isProcessing && !isFree}
                    disabled={(currentTier === "budget" && (plan.key === "budget_monthly" || plan.key === "budget_quarterly" || plan.name === "Smart Budget")) || (currentTier === "sme" && (plan.key === "sme_monthly" || plan.key === "sme_quarterly" || plan.name === "SME Ledger")) || (currentTier === "free" && isFree)}
                    style={{ marginTop: 8 }}
                  >
                    {isFree 
                      ? (currentTier === "free" ? "Current Plan" : "Default Plan") 
                      : (currentTier === "budget" && (plan.key === "budget_monthly" || plan.key === "budget_quarterly" || plan.name === "Smart Budget")) || (currentTier === "sme" && (plan.key === "sme_monthly" || plan.key === "sme_quarterly" || plan.name === "SME Ledger"))
                        ? (pendingTier === (plan.key.includes('sme') ? 'sme' : 'budget') ? "Active at Period End" : "Current Plan")
                        : isOnTrial ? "Subscribe Now" : "Upgrade"
                    }
                  </PrimaryButton>
                ) : !isFree ? (
                  <View style={styles.chooseLaterRow}>
                    <Text style={styles.chooseLaterText}>
                      Available to subscribe when your trial has 10 days or fewer left.
                    </Text>
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>

        <View style={styles.trustRow}>
          <Shield color="#4B5563" size={14} />
          <Text style={styles.trustText}>
            Secure payments via Paystack. Cancel anytime.
          </Text>
        </View>

        {/* Downgrade Options */}
        {currentTier === "sme" && !pendingTier && !isOnTrial && (
          <View style={styles.downgradeSection}>
            <Text style={styles.downgradeLabel}>Looking to downgrade?</Text>
            <Pressable
              style={styles.downgradeLink}
              onPress={() => handleDowngrade("budget")}
              disabled={isProcessing}
            >
              <Text style={styles.downgradeLinkText}>Downgrade to Smart Budget</Text>
            </Pressable>
            <Pressable
              style={styles.downgradeLink}
              onPress={() => handleDowngrade("free")}
              disabled={isProcessing}
            >
              <Text style={styles.downgradeLinkTextCancel}>Cancel subscription</Text>
            </Pressable>
          </View>
        )}
        {currentTier === "budget" && !pendingTier && !isOnTrial && (
          <View style={styles.downgradeSection}>
            <Text style={styles.downgradeLabel}>Looking to downgrade?</Text>
            <Pressable
              style={styles.downgradeLink}
              onPress={() => handleDowngrade("free")}
              disabled={isProcessing}
            >
              <Text style={styles.downgradeLinkTextCancel}>Cancel subscription</Text>
            </Pressable>
          </View>
        )}
        {pendingTier && (
          <View style={styles.downgradeSection}>
            <Text style={styles.downgradeLabel}>
              Downgrade to {pendingTier === "free" ? "Free" : "Smart Budget"} scheduled
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Paystack integration handled via usePaystack hook */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  trialBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 24,
    marginBottom: 20,
    backgroundColor: "rgba(16,185,129,0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(16,185,129,0.2)",
  },
  trialText: {
    color: "#10B981",
    fontSize: 14,
    fontWeight: "600",
  },
  currentTierBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  currentTierLabel: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "500",
  },
  currentTierName: {
    color: "#D1D5DB",
    fontSize: 13,
    fontWeight: "700",
  },
  billingToggleWrapper: {
    alignItems: 'center',
    marginBottom: 24,
  },
  billingToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    padding: 4,
    width: '100%',
    maxWidth: 280,
  },
  billingPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 18,
  },
  billingPillActive: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  billingText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
  },
  billingTextActive: {
    color: "white",
  },
  saveBadge: {
    backgroundColor: "rgba(16,185,129,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  saveBadgeText: {
    color: "#10B981",
    fontSize: 10,
    fontWeight: "800",
  },
  plansList: {
    gap: 8,
  },
  planCard: {
    padding: 24,
    borderRadius: 35,
    overflow: "visible", // Critical for absolute badges to show over borders
    zIndex: 1,
  },
  recommendedBadge: {
    backgroundColor: "#10B981",
    position: 'absolute',
    top: -12,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 100,
  },
  recommendedText: {
    color: "white",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },
  planName: {
    color: "white",
    fontSize: 22,
    fontWeight: "800",
  },
  planDescription: {
    color: "#9CA3AF",
    fontSize: 14,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginBottom: 24,
  },
  price: {
    color: "white",
    fontSize: 36,
    fontWeight: "800",
  },
  pricePeriod: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "500",
  },
  featuresList: {
    gap: 14,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureText: {
    color: "#D1D5DB",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 24,
    opacity: 0.6,
  },
  trustText: {
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "500",
  },
  webviewContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  webviewLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },

  // Downgrade section
  downgradeSection: {
    marginTop: 24,
    alignItems: "center",
    gap: 8,
  },
  downgradeLabel: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "500",
  },
  downgradeLink: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  downgradeLinkText: {
    color: "#F59E0B",
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  downgradeLinkTextCancel: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },

  // Trial > 10 days: choose later message
  chooseLaterRow: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
  },
  chooseLaterText: {
    color: "#6B7280",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },
});
