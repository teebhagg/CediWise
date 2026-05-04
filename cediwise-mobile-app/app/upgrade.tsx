/**
 * Upgrade Screen
 * Paystack in-app WebView (PaystackPop) for subscription payment.
 * Card and Mobile Money both use the same SDK modal; channels are set via a nested PaystackProvider.
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
  Clock,
  Crown,
  Shield,
  Zap,
  X
} from "lucide-react-native";
import { ANALYTICS_EVENTS } from "@/constants/analyticsEvents";
import { getPostHogOptional } from "@/utils/analytics/posthogClientRef";
import { log } from "@/utils/logger";
import { reportError } from "@/utils/telemetry";
import { waitForSubscriptionAfterPayment } from "@/utils/subscriptionSync";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PaystackProvider, usePaystack } from "react-native-paystack-webview";
import { FlashList } from "@shopify/flash-list";

type PlanKey = "free_tier" | "budget_monthly" | "budget_quarterly" | "sme_monthly" | "sme_quarterly";
type BillingCycle = "monthly" | "quarterly";
type PayMethod = "momo" | "card";

/** Search tag for device logs when debugging Paystack + cadence issues */
const CHECKOUT_DEBUG = "[upgrade-paystack]";

type LastCheckoutDebug = {
  attemptId: number;
  billingCycle: BillingCycle;
  serverCadence: BillingCycle;
  planKey: PlanKey;
  metaPlanKey: string;
  amountGhs: number;
  quoteKind?: string;
  /** From quote `pending_billing_cycle_after` when proration schedules a cadence switch */
  expectedPendingBillingCycleAfter?: BillingCycle;
  payMethod: PayMethod;
  openedAt: number;
  /** Unique per checkout — required because react-native-paystack-webview reuses one fallback ref for life of provider */
  paystackReference?: string;
};

type UpgradeScreenContentProps = {
  payMethod: PayMethod;
  setPayMethod: (m: PayMethod) => void;
};

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

function UpgradeScreenContent({
  payMethod,
  setPayMethod,
}: UpgradeScreenContentProps) {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    tier: currentTier,
    isOnTrial,
    trialEndsAt,
    pendingTier,
    pendingTierStartDate,
    refreshTier,
    isInGracePeriod,
    gracePeriodEnd,
    billingCycle: serverBillingCycle,
    pendingBillingCycle,
  } = useTierContext();
  const { showSuccess, showError, showInfo } = useAppToast();

  /** Actual invoice cadence from the server (toggle must match for “Current plan”). */
  const serverCadence: BillingCycle =
    serverBillingCycle === "quarterly" || serverBillingCycle === "monthly"
      ? serverBillingCycle
      : "monthly";

  const [billingCycle, setBillingCycle] = useState<BillingCycle>(() =>
    serverBillingCycle === "quarterly" || serverBillingCycle === "monthly"
      ? serverBillingCycle
      : "monthly"
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isWaitingForBillingSync, setIsWaitingForBillingSync] = useState(false);
  const paystack = usePaystack();
  const lastCheckoutPlanKeyRef = useRef<PlanKey | null>(null);
  const checkoutAttemptRef = useRef(0);
  const lastCheckoutDebugRef = useRef<LastCheckoutDebug | null>(null);
  /** After user taps Monthly/Quarterly, stop mirroring server (avoids refreshTier resetting the pill). */
  const billingCycleTouchedRef = useRef(false);

  useEffect(() => {
    if (billingCycleTouchedRef.current) return;
    if (serverBillingCycle === "monthly" || serverBillingCycle === "quarterly") {
      setBillingCycle(serverBillingCycle);
    }
  }, [serverBillingCycle]);

  const toggleBilling = (cycle: BillingCycle) => {
    if (billingCycle !== cycle) {
      billingCycleTouchedRef.current = true;
      log.info(`${CHECKOUT_DEBUG} billing toggle`, {
        from: billingCycle,
        to: cycle,
        serverCadence,
      });
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

  const onPaymentSuccess = useCallback(
    async (_res: unknown, planKey: PlanKey) => {
      const meta = lastCheckoutDebugRef.current;
      log.info(`${CHECKOUT_DEBUG} onPaymentSuccess`, {
        planKey,
        lastAttempt: meta?.attemptId ?? null,
        elapsedSinceOpenMs: meta ? Date.now() - meta.openedAt : null,
      });
      if (planKey === "free_tier") return;
      if (!supabase || !user?.id) {
        showError("Session", "Sign in again to continue.");
        return;
      }

      const targetTier = planKey.includes("sme") ? "sme" : "budget";
      setIsProcessing(true);
      setIsWaitingForBillingSync(true);

      try {
        const { ok } = await waitForSubscriptionAfterPayment(
          supabase,
          user.id,
          targetTier,
          {
            timeoutMs: 120_000,
            onTick: () => void refreshTier(),
            expectedPendingBillingCycleAfter: meta?.expectedPendingBillingCycleAfter,
          }
        );
        await refreshTier();
        if (ok) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showSuccess(
            "Success!",
            isOnTrial
              ? "Your paid plan starts after your trial ends."
              : "Plan upgraded!"
          );
          router.back();
        } else {
          showInfo(
            "Still updating",
            "If your plan does not change shortly, pull to refresh or reopen the app."
          );
        }
      } catch (err) {
        reportError(err, {
          feature: "billing",
          operation: "paystack_checkout_subscription_sync",
          extra: { planKey },
        });
        log.warn("Subscription sync after Paystack checkout:", err);
        showInfo(
          "Couldn’t verify subscription",
          "We couldn’t reach our servers to confirm your plan. If you were charged, pull to refresh or reopen the app.",
        );
      } finally {
        setIsWaitingForBillingSync(false);
        setIsProcessing(false);
      }
    },
    [
      user?.id,
      isOnTrial,
      refreshTier,
      showSuccess,
      showInfo,
      showError,
      router,
    ]
  );

  const onPaymentCancel = useCallback(() => {
    const meta = lastCheckoutDebugRef.current;
    const elapsedMs = meta ? Date.now() - meta.openedAt : null;
    log.warn(`${CHECKOUT_DEBUG} onPaymentCancel — Paystack UI dismissed without success`, {
      elapsedMs,
      ...meta,
    });
    setIsProcessing(false);
    getPostHogOptional()?.capture(ANALYTICS_EVENTS.paystackCheckoutCancelled, {
      stage: "user_cancelled",
      elapsedMs,
      attemptId: meta?.attemptId ?? null,
    });
  }, []);

  const resolvePaidPlanKey = useCallback(
    (plan: PlanOption): PlanKey | null => {
      if (plan.key === "free_tier") return null;
      return billingCycle === "quarterly"
        ? (plan.key.replace("monthly", "quarterly") as PlanKey)
        : plan.key;
    },
    [billingCycle]
  );

  const handleCheckoutPlan = useCallback(
    async (plan: PlanOption) => {
      if (plan.key === "free_tier") {
        router.back();
        return;
      }
      if (!user?.id || !supabase) return;

      const planKey = resolvePaidPlanKey(plan);
      if (!planKey) return;

      checkoutAttemptRef.current += 1;
      const attemptId = checkoutAttemptRef.current;
      log.info(`${CHECKOUT_DEBUG} handleCheckoutPlan start`, {
        attemptId,
        planRowKey: plan.key,
        resolvedPlanKey: planKey,
        billingCycle,
        serverCadence,
        payMethod,
        billingCycleTouched: billingCycleTouchedRef.current,
      });

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsProcessing(true);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          log.warn(`${CHECKOUT_DEBUG} abort: no session token`, { attemptId, planKey });
          showError("Session expired", "Sign in again to pay.");
          return;
        }

        const { data: quote, error: quoteErr } = await supabase.functions.invoke(
          "billing-upgrade-quote",
          {
            body: { target_plan_key: planKey },
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (quoteErr) {
          log.warn(`${CHECKOUT_DEBUG} quote invoke error`, {
            attemptId,
            planKey,
            message: quoteErr.message,
          });
          reportError(quoteErr, {
            feature: "billing",
            operation: "billing_upgrade_quote",
            extra: { planKey },
          });
          showError("Quote failed", quoteErr.message || "Could not load price.");
          return;
        }

        const q = quote as {
          ok?: boolean;
          error?: string;
          kind?: string;
          amount_ghs?: number;
          plan_key?: string;
          period_end?: string;
          message?: string;
          pending_billing_cycle_after?: string;
        };

        log.info(`${CHECKOUT_DEBUG} quote response`, {
          attemptId,
          planKey,
          ok: q?.ok,
          error: q?.error,
          kind: q?.kind,
          amount_ghs: q?.amount_ghs,
          plan_key: q?.plan_key,
          has_period_end: !!q?.period_end,
        });

        if (!q?.ok) {
          log.warn(`${CHECKOUT_DEBUG} abort: quote not ok`, {
            attemptId,
            planKey,
            error: q?.error,
          });
          if (q.error === "already_on_plan") {
            showInfo("Current plan", "You’re already on this plan and billing cadence.");
          } else if (q.error === "use_downgrade_flow") {
            showError("Downgrade", "Use the downgrade options below to switch to a lower tier.");
          } else if (q.error === "grace_period_resolve_payment") {
            showError(
              "Payment pending",
              "Resolve your grace period payment before changing plans."
            );
          } else {
            showError("Unavailable", q.error || "Could not start checkout.");
          }
          return;
        }

        if (q.kind === "deferred_cadence") {
          log.info(`${CHECKOUT_DEBUG} deferred_cadence — no Paystack; calling schedule function`, {
            attemptId,
            planKey,
          });
          const { error: schErr } = await supabase.functions.invoke(
            "billing-schedule-cadence",
            {
              body: { target_plan_key: planKey },
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (schErr) {
            log.warn(`${CHECKOUT_DEBUG} billing-schedule-cadence failed`, {
              attemptId,
              planKey,
              message: schErr.message,
            });
            reportError(schErr, {
              feature: "billing",
              operation: "billing_schedule_cadence",
              extra: { planKey },
            });
            showError("Could not schedule", schErr.message || "Try again.");
            return;
          }
          await refreshTier();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showSuccess(
            "Billing update scheduled",
            q.message ||
              "Your billing cadence will change after the current period ends. No charge today."
          );
          return;
        }

        const amountGhs = typeof q.amount_ghs === "number" ? q.amount_ghs : 0;
        if (amountGhs <= 0) {
          log.warn(`${CHECKOUT_DEBUG} abort: invalid amount_ghs`, {
            attemptId,
            planKey,
            amountGhs,
            kind: q.kind,
          });
          showError("Invalid amount", "Refresh and try again.");
          return;
        }

        const metaPlanKey = (q.plan_key || planKey) as string;
        lastCheckoutPlanKeyRef.current = metaPlanKey as PlanKey;

        const metadata: Record<string, string> = {
          planKey: metaPlanKey,
          userId: user.id,
        };
        if (q.kind === "immediate_proration" && q.period_end) {
          metadata.billingIntent = "prorated_upgrade";
          metadata.periodEnd = q.period_end;
        }

        /**
         * Paystack reference must be unique per charge. The WebView SDK uses a single
         * `ref_${Date.now()}` for the whole PaystackProvider lifetime when `reference` is omitted,
         * so a second checkout reuses the same ref and Paystack can error-close the modal
         * without firing onCancel (see node_modules/.../PaystackProvider.js fallbackRef).
         */
        const paystackReference = `cw_${attemptId}_${Date.now()}_${user.id.replace(/-/g, "").slice(0, 16)}`;

        const expectedPendingBillingCycleAfter =
          q.kind === "immediate_proration" &&
          (q.pending_billing_cycle_after === "monthly" ||
            q.pending_billing_cycle_after === "quarterly")
            ? q.pending_billing_cycle_after
            : undefined;

        lastCheckoutDebugRef.current = {
          attemptId,
          billingCycle,
          serverCadence,
          planKey,
          metaPlanKey,
          amountGhs,
          quoteKind: q.kind,
          expectedPendingBillingCycleAfter,
          payMethod,
          openedAt: Date.now(),
          paystackReference,
        };

        log.info(`${CHECKOUT_DEBUG} invoking paystack.popup.checkout`, {
          attemptId,
          amountGhs,
          metaPlanKey,
          billingCycle,
          serverCadence,
          payMethod,
          paystackReference,
          metadataKeys: Object.keys(metadata),
          billingIntent: metadata.billingIntent ?? null,
        });

        paystack.popup.checkout({
          email: user?.email || `user-${user.id}@cediwise.app`,
          amount: amountGhs,
          reference: paystackReference,
          metadata,
          onSuccess: (res: unknown) =>
            void onPaymentSuccess(
              res,
              (lastCheckoutPlanKeyRef.current ?? planKey) as PlanKey
            ),
          onCancel: onPaymentCancel,
        });
      } catch (e) {
        log.error(`${CHECKOUT_DEBUG} handleCheckoutPlan catch`, e);
        reportError(e, { feature: "billing", operation: "checkout_plan" });
        showError("Error", "Something went wrong. Try again.");
      } finally {
        setIsProcessing(false);
      }
    },
    [
      user,
      supabase,
      router,
      paystack,
      onPaymentSuccess,
      onPaymentCancel,
      resolvePaidPlanKey,
      showError,
      showInfo,
      showSuccess,
      refreshTier,
      billingCycle,
      serverCadence,
      payMethod,
    ]
  );

  // Downgrade handler — schedules change for end of current period
  const handleDowngrade = useCallback(
    async (targetTier: "budget" | "free") => {
      if (!user?.id || !supabase) return;

      setIsProcessing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      try {
        const { data: sub, error: fetchError } = await supabase
          .from("subscriptions")
          .select("current_period_end")
          .eq("user_id", user.id)
          .maybeSingle();

        if (fetchError) {
          reportError(fetchError, {
            feature: "billing",
            operation: "downgrade_fetch_subscription",
            extra: { code: fetchError.code },
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          showError("Error", "Could not load subscription. Try again.");
          return;
        }

        const periodEnd =
          sub?.current_period_end ||
          new Date(Date.now() + 30 * 86400000).toISOString();

        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({
            pending_tier: targetTier,
            pending_tier_start_date: periodEnd,
            cancel_at_period_end: true,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);

        if (updateError) {
          reportError(updateError, {
            feature: "billing",
            operation: "downgrade_schedule_update",
            extra: { code: updateError.code, targetTier },
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          showError("Error", "Could not schedule downgrade. Try again.");
          return;
        }

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
      } catch (e) {
        reportError(e, {
          feature: "billing",
          operation: "downgrade_unexpected",
          extra: { targetTier },
        });
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

        {isInGracePeriod && (
          <View style={styles.graceBanner}>
            <Clock color="#F59E0B" size={18} />
            <Text style={styles.graceBannerText}>
              {gracePeriodEnd
                ? `Payment pending — pay before ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(gracePeriodEnd.includes(" ") ? gracePeriodEnd.replace(" ", "T") : gracePeriodEnd))} to keep your plan.`
                : "Payment pending — complete payment to keep your plan."}
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

        <View style={styles.payMethodSection}>
          <Text style={styles.payMethodLabel}>Payment method</Text>
          <View style={styles.payMethodToggle}>
            <Pressable
              style={[
                styles.payMethodPill,
                payMethod === "momo" && styles.payMethodPillActive,
              ]}
              onPress={() => {
                setPayMethod("momo");
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text
                style={[
                  styles.payMethodText,
                  payMethod === "momo" && styles.payMethodTextActive,
                ]}
              >
                Mobile Money
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.payMethodPill,
                payMethod === "card" && styles.payMethodPillActive,
              ]}
              onPress={() => {
                setPayMethod("card");
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text
                style={[
                  styles.payMethodText,
                  payMethod === "card" && styles.payMethodTextActive,
                ]}
              >
                Card
              </Text>
            </Pressable>
          </View>
          {payMethod === "momo" && (
            <Text style={styles.payMethodHint}>
              You&apos;ll complete Mobile Money in Paystack&apos;s secure screen — same as card checkout. Enter your number and approve on your phone (MTN, Telecel, AirtelTigo).
            </Text>
          )}
          {pendingBillingCycle && (
            <Text style={styles.payMethodHint}>
              After this period ends, billing switches to{" "}
              {pendingBillingCycle === "quarterly" ? "quarterly" : "monthly"}.
            </Text>
          )}
        </View>

        {/* Plan Cards */}
        <FlashList
          data={PLANS}
          keyExtractor={(p) => p.key}
          scrollEnabled={false}
          nestedScrollEnabled
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          extraData={{
            billingCycle,
            serverCadence,
            showTrialButtons,
            isProcessing,
            currentTier,
            pendingTier,
            isOnTrial,
            payMethod,
            pendingBillingCycle,
          }}
          renderItem={({ item: plan }) => {
            const Icon = plan.icon;
            const isFree = plan.key === "free_tier";
            const isBudgetPlan = plan.key.startsWith("budget_");
            const isSmePlan = plan.key.startsWith("sme_");
            const isCurrentPlan =
              (currentTier === "free" && isFree) ||
              (currentTier === "budget" &&
                isBudgetPlan &&
                billingCycle === serverCadence) ||
              (currentTier === "sme" &&
                isSmePlan &&
                billingCycle === serverCadence);
            const planPaidTier: "budget" | "sme" | null = isFree
              ? null
              : isSmePlan
                ? "sme"
                : "budget";

            return (
              <Card 
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
                  {plan.features.map((feature) => (
                    <View key={feature} style={styles.featureRow}>
                      <View className="w-5 h-5 rounded-full bg-emerald-500/10 items-center justify-center">
                        <Check color="#10B981" size={12} strokeWidth={3} />
                      </View>
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                {showTrialButtons ? (
                  <PrimaryButton
                    onPress={() => void handleCheckoutPlan(plan)}
                    loading={isProcessing && !isFree}
                    disabled={isCurrentPlan}
                    style={{ marginTop: 8 }}
                  >
                    {isFree
                      ? currentTier === "free"
                        ? "Current Plan"
                        : "Default Plan"
                      : isCurrentPlan
                        ? pendingTier === planPaidTier
                          ? "Active at Period End"
                          : "Current Plan"
                        : isOnTrial
                          ? "Subscribe Now"
                          : "Upgrade"}
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
          }}
        />

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

      <Modal
        visible={isWaitingForBillingSync}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.syncOverlay}>
          <View style={styles.syncCard}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.syncTitle}>Updating your plan</Text>
            <Text style={styles.syncSubtitle}>
              Syncing your subscription. This usually takes a few seconds.
            </Text>
          </View>
        </View>
      </Modal>
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
  syncOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  syncCard: {
    backgroundColor: "#111827",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    gap: 16,
    maxWidth: 320,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  syncTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  syncSubtitle: {
    color: "#9CA3AF",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
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
  graceBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 24,
    marginBottom: 20,
    backgroundColor: "rgba(245,158,11,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(245,158,11,0.35)",
  },
  graceBannerText: {
    color: "#FBBF24",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  payMethodSection: {
    marginBottom: 20,
  },
  payMethodLabel: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
  },
  payMethodToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    padding: 4,
    gap: 4,
  },
  payMethodPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: "center",
  },
  payMethodPillActive: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  payMethodText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
  },
  payMethodTextActive: {
    color: "white",
  },
  payMethodHint: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 14,
    lineHeight: 17,
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

export default function UpgradeScreen() {
  const [payMethod, setPayMethod] = useState<PayMethod>("momo");
  const publicKey = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY || "";

  return (
    <PaystackProvider
      publicKey={publicKey}
      currency="GHS"
      defaultChannels={payMethod === "momo" ? ["mobile_money"] : ["card"]}
    >
      <UpgradeScreenContent payMethod={payMethod} setPayMethod={setPayMethod} />
    </PaystackProvider>
  );
}
