import {
  StepIncome,
  StepPreferences,
  StepSetupBudget,
} from "@/components/features/vitals/Steps";
import type { Draft, StepErrors } from "@/components/features/vitals/types";
import {
  computeIntelligentStrategy,
  getNetPreview,
  strategyToPercents,
  toMoney,
  toMonthlySalary,
} from "@/components/features/vitals/utils";
import { KeyboardAwareScrollView } from "@/components/KeyboardAwareScrollView";
import { BackButton } from "@/components/BackButton";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { useAuth } from "@/hooks/useAuth";
import { useBudget } from "@/hooks/useBudget";
import { analytics } from "@/utils/analytics";
import { isOnline } from "@/utils/connectivity";
import { log } from "@/utils/logger";
import {
  writePersonalizationStatusCache,
  writeProfileVitalsCache,
} from "@/utils/profileVitals";
import { trySyncProfileWithRetries } from "@/utils/budgetSync";
import { enqueueMutation } from "@/utils/budgetStorage";
import { readTourSeen } from "@/utils/tourStorage";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  Extrapolate,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Separator } from "heroui-native";

const AnimatedView = Animated.createAnimatedComponent(View);
const SETUP_LOGO = require("../../assets/images/logo/cediwise-transparent-emerald-logo.png");

function makeDefaultDraft(): Draft {
  return {
    step: 0,
    stableSalary: "",
    autoTax: true,
    paydayDay: 25,
    incomeFrequency: "monthly",
    lifeStage: null,
    spendingStyle: null,
    financialPriority: null,
    interests: [],
    strategyChoice: "balanced",
  };
}

export default function VitalsWizard() {
  const keyboardAccessoryId = "cediwise_vitals_done";
  const params = useLocalSearchParams<{ mode?: string }>();
  const editMode = params?.mode === "edit";

  const { width } = useWindowDimensions();
  const { user, isLoading: authLoading } = useAuth();
  const budget = useBudget(user?.id);

  const noUser = !authLoading && !user?.id;

  const totalSteps = 3;
  const [draft, setDraft] = useState<Draft>(makeDefaultDraft());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transition = useSharedValue(1);
  const direction = useSharedValue<1 | -1>(1);
  const containerHeight = useSharedValue(360);
  const outgoingStepRef = useRef<number | null>(null);
  const scrollViewRef = useRef<any>(null);
  const [showValidationHint, setShowValidationHint] = useState(false);
  const insets = useSafeAreaInsets();

  const bottomBarHeight = 16 + 48 + 10 + Math.max(16, insets.bottom);

  const progress = useSharedValue(0);
  const setupProgress = useSharedValue(0.1);

  const clearOutgoing = useCallback(() => {
    outgoingStepRef.current = null;
  }, []);

  const completeSetupProgress = useCallback(async () => {
    setupProgress.value = withTiming(1, {
      duration: 1000,
      easing: Easing.out(Easing.cubic),
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }, [setupProgress]);

  useEffect(() => {
    progress.value = withTiming((draft.step + 1) / totalSteps, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [draft.step, progress]);

  useEffect(() => {
    if (!loading) {
      setupProgress.value = 0.1;
      return;
    }
    const id = setInterval(() => {
      const next = Math.min(0.9, setupProgress.value + 0.01);
      setupProgress.value = withTiming(next, {
        duration: 100,
        easing: Easing.linear,
      });
    }, 100);
    return () => clearInterval(id);
  }, [loading, setupProgress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: Math.max(0, Math.min(1, progress.value)) * width,
  }));
  const setupProgressStyle = useAnimatedStyle(() => ({
    width: 260 * Math.max(0.08, Math.min(1, setupProgress.value)),
  }));

  const title = useMemo(() => {
    switch (draft.step) {
      case 0:
        return "Income";
      case 1:
        return "Setup Budget";
      case 2:
        return "Preferences";
      default:
        return editMode ? "Update your profile" : "Vitals";
    }
  }, [draft.step, editMode]);

  const stepErrors: StepErrors = useMemo(() => {
    const e: Record<string, string> = {};
    if (draft.step === 0) {
      if (toMoney(draft.stableSalary) <= 0) {
        e.stableSalary = "Enter your salary";
      }
    }
    if (draft.step === 1) {
      if (!Number.isFinite(draft.paydayDay) || draft.paydayDay < 1 || draft.paydayDay > 31) {
        e.paydayDay = "Select a payday between 1 and 31";
      }
    }
    return e;
  }, [draft]);

  const allStepsErrors: StepErrors = useMemo(() => {
    const e: Record<string, string> = {};
    if (toMoney(draft.stableSalary) <= 0) {
      e.stableSalary = "Enter your salary";
    }
    if (!Number.isFinite(draft.paydayDay) || draft.paydayDay < 1 || draft.paydayDay > 31) {
      e.paydayDay = "Select a payday between 1 and 31";
    }
    return e;
  }, [draft]);

  const canContinue = Object.keys(stepErrors).length === 0;
  const canFinish = draft.step === totalSteps - 1 && Object.keys(allStepsErrors).length === 0;

  const netPreview = useMemo(
    () => getNetPreview(draft.stableSalary, draft.incomeFrequency),
    [draft.stableSalary, draft.incomeFrequency],
  );

  const animateStepChange = useCallback(
    (nextStep: number, dir: "forward" | "back") => {
      outgoingStepRef.current = draft.step;
      direction.value = dir === "forward" ? 1 : -1;
      transition.value = 0;
      transition.value = withSpring(
        1,
        {
          damping: 22,
          stiffness: 180,
          overshootClamping: false,
        },
        (finished) => {
          if (finished) runOnJS(clearOutgoing)();
        },
      );
    },
    [clearOutgoing, direction, draft.step, transition],
  );

  const outgoingStyle = useAnimatedStyle(() => {
    const t = transition.value;
    const opacity = interpolate(t, [0, 0.6], [1, 0], Extrapolate.CLAMP);
    const scale = interpolate(t, [0, 1], [1, 0.96], Extrapolate.CLAMP);
    const translateX =
      direction.value === 1
        ? interpolate(t, [0, 1], [0, -16], Extrapolate.CLAMP)
        : interpolate(t, [0, 1], [0, 16], Extrapolate.CLAMP);
    return { opacity, transform: [{ translateX }, { scale }] };
  }, [direction, transition]);

  const incomingStyle = useAnimatedStyle(() => {
    const t = transition.value;
    const opacity = interpolate(t, [0.2, 0.8], [0, 1], Extrapolate.CLAMP);
    const translateX = interpolate(
      t,
      [0, 1],
      [direction.value * 24, 0],
      Extrapolate.CLAMP,
    );
    const scale = interpolate(t, [0, 1], [0.98, 1], Extrapolate.CLAMP);
    return { opacity, transform: [{ translateX }, { scale }] };
  }, [direction, transition]);

  const containerStyle = useAnimatedStyle(() => ({
    height: containerHeight.value,
  }));

  const onStepLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      if (h > 0) {
        containerHeight.value = withSpring(Math.max(200, h), {
          damping: 20,
          stiffness: 200,
        });
      }
    },
    [containerHeight],
  );

  const updateDraft = useCallback((patch: Partial<Draft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleInterest = useCallback((interest: string) => {
    setDraft((prev) => {
      const selected = prev.interests.includes(interest);
      return {
        ...prev,
        interests: selected
          ? prev.interests.filter((x) => x !== interest)
          : [...prev.interests, interest],
      };
    });
  }, []);

  const exitWizard = useCallback(() => {
    setDraft(makeDefaultDraft());
    router.replace("/(tabs)");
  }, []);

  const goNext = useCallback(async () => {
    Keyboard.dismiss();
    setError(null);
    setShowValidationHint(false);
    if (!canContinue) {
      setShowValidationHint(true);
      scrollViewRef.current?.scrollTo({ y: 120, animated: true });
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch {
        // ignore
      }
      return;
    }
    const nextStep = Math.min(totalSteps - 1, draft.step + 1);
    updateDraft({ step: nextStep });
    animateStepChange(nextStep, "forward");
  }, [animateStepChange, canContinue, draft.step, totalSteps, updateDraft]);

  const goBack = useCallback(() => {
    Keyboard.dismiss();
    setError(null);
    setShowValidationHint(false);
    if (draft.step === 0) {
      exitWizard();
      return;
    }
    const nextStep = Math.max(0, draft.step - 1);
    updateDraft({ step: nextStep });
    animateStepChange(nextStep, "back");
  }, [animateStepChange, draft.step, exitWizard, updateDraft]);

  const handleFinish = useCallback(async () => {
    Keyboard.dismiss();
    if (!user?.id) return;
    if (Object.keys(allStepsErrors).length > 0) {
      setShowValidationHint(true);
      scrollViewRef.current?.scrollTo({ y: 120, animated: true });
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch {
        // ignore
      }
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const rawSalary = toMoney(draft.stableSalary);
      const stableSalary = toMonthlySalary(rawSalary, draft.incomeFrequency);
      const computedIntelligent = computeIntelligentStrategy({
        stableSalary,
        autoTax: draft.autoTax,
        sideIncome: 0,
        rent: 0,
        titheRemittance: 0,
        debtObligations: 0,
        utilitiesTotal: 0,
        lifeStage: draft.lifeStage,
        dependentsCount: 0,
        incomeFrequency: draft.incomeFrequency,
        spendingStyle: draft.spendingStyle,
        financialPriority: draft.financialPriority,
      });

      const userOverride =
        draft.strategyChoice === "survival" || draft.strategyChoice === "aggressive";
      const computed = userOverride
        ? {
            ...computedIntelligent,
            strategy: draft.strategyChoice,
            ...strategyToPercents(draft.strategyChoice),
          }
        : {
            ...computedIntelligent,
            strategy: computedIntelligent.strategy,
            needsPct: computedIntelligent.needsPct,
            wantsPct: computedIntelligent.wantsPct,
            savingsPct: computedIntelligent.savingsPct,
          };

      const createdAt = new Date().toISOString();

      const payload = {
        id: user.id,
        setup_completed: true,
        payday_day: draft.paydayDay,
        interests: draft.interests,
        stable_salary: stableSalary,
        auto_tax: draft.autoTax,
        side_income: 0,
        rent: 0,
        tithe_remittance: 0,
        debt_obligations: 0,
        utilities_mode: "general",
        utilities_total: 0,
        utilities_ecg: 0,
        utilities_water: 0,
        primary_goal: null,
        strategy: computed.strategy,
        needs_pct: computed.needsPct,
        wants_pct: computed.wantsPct,
        savings_pct: computed.savingsPct,
        life_stage: draft.lifeStage ?? null,
        dependents_count: 0,
        income_frequency: draft.incomeFrequency,
        spending_style: draft.spendingStyle ?? null,
        financial_priority: draft.financialPriority ?? null,
      };

      const queued = await enqueueMutation(user.id, {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        userId: user.id,
        createdAt,
        kind: "upsert_profile",
        payload,
      });

      const online = await isOnline();
      if (online) {
        void trySyncProfileWithRetries(user.id, queued).then((syncResult) => {
          if (!syncResult.ok) {
            log.error("[Vitals] Background profile sync failed", { syncResult });
          }
        });
      }

      await writePersonalizationStatusCache(user.id, true);
      await writeProfileVitalsCache(user.id, {
        setup_completed: true,
        payday_day: draft.paydayDay,
        interests: draft.interests,
        stable_salary: stableSalary,
        auto_tax: draft.autoTax,
        side_income: 0,
        rent: 0,
        tithe_remittance: 0,
        debt_obligations: 0,
        utilities_mode: "general",
        utilities_total: 0,
        utilities_ecg: 0,
        utilities_water: 0,
        primary_goal: null,
        strategy: computed.strategy,
        needs_pct: computed.needsPct,
        wants_pct: computed.wantsPct,
        savings_pct: computed.savingsPct,
      });

      const existingPrimaryIncome = budget.state?.incomeSources?.find(
        (source) => source.type === "primary",
      );
      if (existingPrimaryIncome) {
        await budget.updateIncomeSource(existingPrimaryIncome.id, {
          name: existingPrimaryIncome.name || "Primary income",
          type: "primary",
          amount: stableSalary,
          applyDeductions: draft.autoTax,
        });
      } else {
        await budget.addIncomeSource({
          name: "Primary income",
          type: "primary",
          amount: stableSalary,
          applyDeductions: draft.autoTax,
        });
      }

      // Create the first cycle from vitals inputs, but keep categories explicit/manual.
      await budget.setupBudget({
        paydayDay: draft.paydayDay,
        needsPct: computed.needsPct,
        wantsPct: computed.wantsPct,
        savingsPct: computed.savingsPct,
        interests: draft.interests,
        seedCategories: false,
        lifeStage: draft.lifeStage ?? null,
      });

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // ignore
      }

      analytics.onboardingEssentialCompleted({ userId: user.id });
      const [seenHomeTour, seenBudgetTour, seenLearnTour] = await Promise.all([
        readTourSeen(user.id, "home"),
        readTourSeen(user.id, "budget"),
        readTourSeen(user.id, "learn"),
      ]);
      analytics.vitalsCompleteAfterTour({
        userId: user.id,
        seenHomeTour,
        seenBudgetTour,
        seenLearnTour,
      });

      await completeSetupProgress();
      router.replace("/(tabs)/budget");
    } catch (e) {
      const offline = !(await isOnline());
      const message = offline
        ? "You are offline. Your profile changes are queued and will sync later."
        : e instanceof Error
          ? e.message
          : "Something went wrong";
      setError(message);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  }, [allStepsErrors, budget, completeSetupProgress, draft, user?.id]);

  const currentStepNode = () => {
    if (draft.step === 0) {
      return (
        <StepIncome
          draft={draft}
          errors={stepErrors}
          keyboardAccessoryId={keyboardAccessoryId}
          netPreview={netPreview}
          updateDraft={updateDraft}
        />
      );
    }
    if (draft.step === 1) {
      return (
        <StepSetupBudget
          draft={draft}
          errors={stepErrors}
          updateDraft={updateDraft}
        />
      );
    }
    return (
      <StepPreferences
        draft={draft}
        toggleInterest={toggleInterest}
        updateDraft={updateDraft}
      />
    );
  };

  const outgoingNode = () => {
    const s = outgoingStepRef.current;
    if (s === null) return null;
    if (s === 0) {
      return (
        <StepIncome
          draft={draft}
          errors={stepErrors}
          keyboardAccessoryId={keyboardAccessoryId}
          netPreview={netPreview}
          updateDraft={updateDraft}
        />
      );
    }
    if (s === 1) {
      return (
        <StepSetupBudget
          draft={draft}
          errors={stepErrors}
          updateDraft={updateDraft}
        />
      );
    }
    return (
      <StepPreferences
        draft={draft}
        toggleInterest={toggleInterest}
        updateDraft={updateDraft}
      />
    );
  };

  if (noUser) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: "#000000" }}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}>
          <Text
            style={{
              color: "#E2E8F0",
              fontFamily: "Figtree-Medium",
              fontSize: 18,
              textAlign: "center",
              marginBottom: 16,
            }}>
            Please sign in to set up your budget.
          </Text>
          <PrimaryButton onPress={() => router.replace("/auth")} style={{ minWidth: 200 }}>
            Sign in
          </PrimaryButton>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: "#000000" }}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
            marginTop: -60,
          }}>
          <Image source={SETUP_LOGO} contentFit="contain" style={{ width: 120, height: 120 }} />
          <View
            style={{
              width: 260,
              height: 6,
              borderRadius: 999,
              backgroundColor: "rgba(148,163,184,0.30)",
              marginTop: 22,
              overflow: "hidden",
            }}>
            <AnimatedView
              style={[
                {
                  height: 6,
                  borderRadius: 999,
                  backgroundColor: "#22C55E",
                },
                setupProgressStyle,
              ]}
            />
          </View>
          <Text
            style={{
              marginTop: 28,
              color: "#94A3B8",
              fontFamily: "Figtree-SemiBold",
              fontSize: 14,
              lineHeight: 20,
              textAlign: "center",
            }}>
            Saving your profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: "#000000" }}>
      <View
        style={{
          height: 44,
          paddingHorizontal: 12,
          justifyContent: "center",
          alignItems: "flex-start",
        }}>
        <BackButton onPress={goBack} />
      </View>
      <View style={{ height: 3, backgroundColor: "rgba(16,185,129,0.18)" }}>
        <AnimatedView
          style={[
            {
              height: 3,
              backgroundColor: "rgba(16,185,129,0.95)",
              borderRadius: 10,
            },
            progressStyle,
          ]}
        />
      </View>

      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 4,
          }}>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: "#9CA3AF",
                fontFamily: "Figtree-Medium",
                fontSize: 12,
                letterSpacing: 0.8,
                textTransform: "uppercase",
              }}>
              Step {draft.step + 1} of {totalSteps}
            </Text>
            <Text
              style={{
                color: "#FFFFFF",
                fontFamily: "Figtree-Bold",
                fontSize: 28,
                marginTop: 8,
                letterSpacing: -0.5,
              }}>
              {title}
            </Text>
          </View>
          {/* Skip intentionally disabled for now. */}
          {/*
          <Button variant="outline" size="sm">
            <Text>Skip</Text>
          </Button>
          */}
        </View>

        <Separator className="mt-4 mx-4" />

        <KeyboardAwareScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: bottomBarHeight }}
          className="px-5 py-4">
          {showValidationHint && (draft.step === totalSteps - 1 ? !canFinish : !canContinue) ? (
            <Text
              style={{
                color: "#FCA5A5",
                fontFamily: "Figtree-Regular",
                fontSize: 13,
                marginBottom: 12,
              }}>
              Complete required fields above to continue.
            </Text>
          ) : null}

          {error ? (
            <View
              style={{
                borderWidth: 1,
                borderColor: "rgba(248,113,113,0.5)",
                backgroundColor: "rgba(127,29,29,0.25)",
                borderRadius: 12,
                padding: 12,
                marginBottom: 12,
              }}>
              <Text style={{ color: "#FCA5A5", fontFamily: "Figtree-Regular", fontSize: 12 }}>
                {error}
              </Text>
            </View>
          ) : null}

          <Animated.View style={[containerStyle]}>
            {outgoingStepRef.current !== null ? (
              <Animated.View
                style={[StyleSheet.absoluteFill, outgoingStyle]}
                accessibilityElementsHidden>
                {outgoingNode()}
              </Animated.View>
            ) : null}

            <Animated.View
              style={[
                { position: "absolute", left: 0, right: 0, top: 0 },
                incomingStyle,
              ]}
              onLayout={onStepLayout}>
              {currentStepNode()}
            </Animated.View>
          </Animated.View>
        </KeyboardAwareScrollView>

        <View
          style={{
            flexShrink: 0,
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: Math.max(16, insets.bottom),
            gap: 10,
            backgroundColor: "#000000",
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.06)",
          }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <SecondaryButton onPress={goBack} style={{ flex: 1 }}>
              Back
            </SecondaryButton>

            {draft.step < totalSteps - 1 ? (
              <PrimaryButton
                onPress={goNext}
                disabled={!canContinue}
                style={{
                  flex: 1,
                  opacity: canContinue ? 1 : 0.5,
                }}>
                Next
              </PrimaryButton>
            ) : (
              <PrimaryButton
                onPress={handleFinish}
                loading={loading}
                disabled={loading || !canFinish}
                style={{ flex: 1, opacity: canFinish ? 1 : 0.5 }}>
                {loading ? "Saving…" : editMode ? "Save changes" : "Finish"}
              </PrimaryButton>
            )}
          </View>

          <Pressable
            onPress={exitWizard}
            style={{
              alignSelf: "center",
              paddingVertical: 10,
              paddingHorizontal: 16,
            }}>
            <Text
              style={{
                color: "#64748B",
                fontFamily: "Figtree-Regular",
                fontSize: 12,
                textDecorationLine: "underline",
              }}>
              Exit setup
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
