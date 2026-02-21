import { StepFixedExpenses, StepGoal, StepIncome, StepInterests, StepLifeStage, StepWelcome } from "@/components/features/vitals/Steps";
import type { Draft, StepErrors } from "@/components/features/vitals/types";
import { clampDay, computeIntelligentStrategy, getNetPreview, strategyToPercents, toMoney, toMonthlySalary } from "@/components/features/vitals/utils";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { KeyboardAwareScrollView } from "@/components/KeyboardAwareScrollView";
import { KeyboardDoneAccessory } from "@/components/KeyboardDoneAccessory";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { useAuth } from "@/hooks/useAuth";
import { useBudget } from "@/hooks/useBudget";
import { usePersonalizationStatus } from "@/hooks/usePersonalizationStatus";
import { enqueueMutation, loadBudgetState, saveBudgetState } from "@/utils/budgetStorage";
import { trySyncMutation } from "@/utils/budgetSync";
import { isOnline } from "@/utils/connectivity";
import { vitalsDraftKey, writePersonalizationStatusCache, writeProfileVitalsCache } from "@/utils/profileVitals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Button, Separator } from "heroui-native";

const AnimatedView = Animated.createAnimatedComponent(View);

function makeDefaultDraft(): Draft {
  return {
    step: 0,
    stableSalary: "",
    autoTax: true,
    lifeStage: null,
    dependentsCount: "0",
    incomeFrequency: "monthly",
    spendingStyle: null,
    financialPriority: null,
    sideIncome: "",
    paydayDay: "25",
    rent: "",
    titheRemittance: "",
    debtObligations: "",
    utilitiesMode: "general",
    utilitiesTotal: "",
    utilitiesECG: "",
    utilitiesWater: "",
    interests: [],
    primaryGoal: "emergency_fund",
    strategyChoice: "balanced",
  };
}

export default function VitalsWizard() {
  const keyboardAccessoryId = "cediwise_vitals_done";
  const params = useLocalSearchParams<{ mode?: string }>();
  const editMode = params?.mode === "edit";

  const { width } = useWindowDimensions();
  const { user, isLoading: authLoading } = useAuth();
  const { setupCompleted } = usePersonalizationStatus(user?.id);

  const noUser = !authLoading && !user?.id;
  const budget = useBudget(user?.id);

  const totalSteps = 6;
  const [draft, setDraft] = useState<Draft>(makeDefaultDraft());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transition = useSharedValue(1);
  const direction = useSharedValue<1 | -1>(1);
  const containerHeight = useSharedValue(480);
  const outgoingStepRef = useRef<number | null>(null);
  const scrollViewRef = useRef<any>(null);
  const [showValidationHint, setShowValidationHint] = useState(false);
  const insets = useSafeAreaInsets();

  // Reserve space so scroll content can scroll above the bottom bar (button row + optional link + padding)
  const bottomBarHeight = 16 + 48 + 10 + (draft.step > 0 && draft.step < totalSteps - 1 && !editMode ? 48 : 0) + Math.max(16, insets.bottom);

  const progress = useSharedValue(0);

  const clearOutgoing = useCallback(() => {
    outgoingStepRef.current = null;
  }, []);

  const persistDraft = useCallback(
    async (next: Draft) => {
      if (!user?.id) return;
      try {
        await AsyncStorage.setItem(vitalsDraftKey(user.id), JSON.stringify(next));
      } catch {
        // ignore
      }
    },
    [user?.id]
  );

  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      try {
        const raw = await AsyncStorage.getItem(vitalsDraftKey(user.id));
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<Draft>;
        setDraft((prev) => ({
          ...prev,
          ...parsed,
          utilitiesMode: parsed.utilitiesMode === "precise" ? "precise" : "general",
          interests: Array.isArray(parsed.interests) ? parsed.interests : prev.interests,
          lifeStage:
            parsed.lifeStage != null && ["student", "young_professional", "family", "retiree"].includes(parsed.lifeStage)
              ? parsed.lifeStage
              : prev.lifeStage,
          dependentsCount: typeof parsed.dependentsCount === "string" ? parsed.dependentsCount : prev.dependentsCount,
          incomeFrequency:
            parsed.incomeFrequency != null && ["weekly", "bi_weekly", "monthly"].includes(parsed.incomeFrequency)
              ? parsed.incomeFrequency
              : prev.incomeFrequency,
          spendingStyle:
            parsed.spendingStyle != null && ["conservative", "moderate", "liberal"].includes(parsed.spendingStyle)
              ? parsed.spendingStyle
              : prev.spendingStyle,
          financialPriority:
            parsed.financialPriority != null &&
              ["debt_payoff", "savings_growth", "lifestyle", "balanced"].includes(parsed.financialPriority)
              ? parsed.financialPriority
              : prev.financialPriority,
          primaryGoal:
            parsed.primaryGoal != null &&
              ["emergency_fund", "project", "investment"].includes(parsed.primaryGoal)
              ? parsed.primaryGoal
              : prev.primaryGoal,
          strategyChoice:
            parsed.strategyChoice != null &&
              ["survival", "balanced", "aggressive"].includes(parsed.strategyChoice)
              ? parsed.strategyChoice
              : prev.strategyChoice,
          step:
            typeof parsed.step === "number"
              ? parsed.step <= 4
                ? Math.min(5, parsed.step + 1)
                : Math.min(5, parsed.step)
              : prev.step,
        }));
      } catch {
        // ignore
      }
    })();
  }, [totalSteps, user?.id]);

  useEffect(() => {
    progress.value = withTiming((draft.step + 1) / totalSteps, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [draft.step, progress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: Math.max(0, Math.min(1, progress.value)) * width,
  }));

  const title = useMemo(() => {
    if (editMode && draft.step > 0) {
      switch (draft.step) {
        case 1: return "Income & Jobs";
        case 2: return "Life Stage & Context";
        case 3: return "Fixed Expenses";
        case 4: return "Interests & Wants";
        case 5: return "Goal Setting";
        default: return "Update your profile";
      }
    }
    switch (draft.step) {
      case 0:
        return "Welcome";
      case 1:
        return "Income & Jobs";
      case 2:
        return "Life Stage & Context";
      case 3:
        return "Fixed Expenses";
      case 4:
        return "Interests & Wants";
      case 5:
        return "Goal Setting";
      default:
        return editMode ? "Update your profile" : "Vitals";
    }
  }, [draft.step, editMode]);

  const stepErrors: StepErrors = useMemo(() => {
    const e: Record<string, string> = {};
    if (draft.step === 1) {
      if (toMoney(draft.stableSalary) <= 0) e.stableSalary = "Enter your salary";
      if (clampDay(draft.paydayDay) === null) e.paydayDay = "Enter a day between 1 and 31";
    }
    if (draft.step === 3) {
      const total =
        draft.utilitiesMode === "precise"
          ? toMoney(draft.utilitiesECG) + toMoney(draft.utilitiesWater)
          : toMoney(draft.utilitiesTotal);
      if (total <= 0) e.utilities = "Enter utilities amount (or 0 if none)";
    }
    if (draft.step === 5) {
      if (!draft.primaryGoal) e.goal = "Select a primary goal";
    }
    return e;
  }, [draft]);

  /** Full validation for all required steps. Used for Finish button and submit. */
  const allStepsErrors: StepErrors = useMemo(() => {
    const e: Record<string, string> = {};
    if (toMoney(draft.stableSalary) <= 0) e.stableSalary = "Enter your salary";
    if (clampDay(draft.paydayDay) === null) e.paydayDay = "Enter a day between 1 and 31";
    const utilitiesTotal =
      draft.utilitiesMode === "precise"
        ? toMoney(draft.utilitiesECG) + toMoney(draft.utilitiesWater)
        : toMoney(draft.utilitiesTotal);
    if (utilitiesTotal <= 0) e.utilities = "Enter utilities amount (or 0 if none)";
    if (!draft.primaryGoal) e.goal = "Select a primary goal";
    return e;
  }, [draft]);

  const canContinue = Object.keys(stepErrors).length === 0;
  const canFinish = draft.step === 5 && Object.keys(allStepsErrors).length === 0;

  const netPreview = useMemo(
    () => getNetPreview(draft.stableSalary, draft.incomeFrequency),
    [draft.stableSalary, draft.incomeFrequency]
  );

  const animateStepChange = useCallback(
    (nextStep: number, dir: "forward" | "back") => {
      outgoingStepRef.current = draft.step;
      direction.value = dir === "forward" ? 1 : -1;
      transition.value = 0;
      transition.value = withSpring(1, {
        damping: 22,
        stiffness: 180,
        overshootClamping: false,
      }, (finished) => {
        if (finished) runOnJS(clearOutgoing)();
      });
    },
    [clearOutgoing, direction, draft.step, transition]
  );

  const outgoingStyle = useAnimatedStyle(() => {
    const t = transition.value;
    // Fade out with subtle scale/slide
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
    // Fade in with subtle slide
    const opacity = interpolate(t, [0.2, 0.8], [0, 1], Extrapolate.CLAMP);
    const translateX = interpolate(
      t,
      [0, 1],
      [direction.value * 24, 0],
      Extrapolate.CLAMP
    );
    const scale = interpolate(t, [0, 1], [0.98, 1], Extrapolate.CLAMP);
    return { opacity, transform: [{ translateX }, { scale }] };
  }, [direction, transition]);

  const containerStyle = useAnimatedStyle(() => ({
    height: containerHeight.value,
  }));

  const onStepLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) {
      containerHeight.value = withSpring(Math.max(200, h), {
        damping: 20,
        stiffness: 200,
      });
    }
  }, [containerHeight]);

  const updateDraft = useCallback(
    (patch: Partial<Draft>) => {
      setDraft((prev) => {
        const next = { ...prev, ...patch };
        void persistDraft(next);
        return next;
      });
    },
    [persistDraft]
  );

  const toggleInterest = useCallback(
    (interest: string) => {
      try {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // ignore
      }
      setDraft((prev) => {
        const selected = prev.interests.includes(interest);
        const next: Draft = {
          ...prev,
          interests: selected
            ? prev.interests.filter((x) => x !== interest)
            : [...prev.interests, interest],
        };
        void persistDraft(next);
        return next;
      });
    },
    [persistDraft]
  );

  useEffect(() => {
    if (editMode && draft.step === 0) {
      updateDraft({ step: 1 });
    }
  }, [editMode, draft.step, updateDraft]);

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
    const nextStep = Math.max(0, draft.step - 1);
    updateDraft({ step: nextStep });
    animateStepChange(nextStep, "back");
  }, [animateStepChange, draft.step, updateDraft]);

  const handleSkip = useCallback(async () => {
    if (!user?.id) return;
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore
    }
    await writePersonalizationStatusCache(user.id, false, { skippedVitals: true });
    router.replace("/(tabs)/budget");
  }, [user?.id]);

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
      const sideIncome = toMoney(draft.sideIncome);
      const rent = toMoney(draft.rent);
      const titheRemittance = toMoney(draft.titheRemittance);
      const debtObligations = toMoney(draft.debtObligations);
      const utilitiesTotal =
        draft.utilitiesMode === "precise"
          ? toMoney(draft.utilitiesECG) + toMoney(draft.utilitiesWater)
          : toMoney(draft.utilitiesTotal);
      const utilitiesECG = toMoney(draft.utilitiesECG);
      const utilitiesWater = toMoney(draft.utilitiesWater);
      const paydayDay = clampDay(draft.paydayDay) ?? 25;

      const computedIntelligent = computeIntelligentStrategy({
        stableSalary,
        autoTax: draft.autoTax,
        sideIncome,
        rent,
        titheRemittance,
        debtObligations,
        utilitiesTotal,
        lifeStage: draft.lifeStage,
        dependentsCount: Math.max(0, parseInt(draft.dependentsCount, 10) || 0),
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

      // 1) Persist personalization profile (offline-first via existing queue + immediate attempt)
      const createdAt = new Date().toISOString();
      const payload = {
        id: user.id,
        setup_completed: true,
        payday_day: paydayDay,
        interests: draft.interests,
        stable_salary: stableSalary,
        auto_tax: draft.autoTax,
        side_income: sideIncome,
        rent,
        tithe_remittance: titheRemittance,
        debt_obligations: debtObligations,
        utilities_mode: draft.utilitiesMode,
        utilities_total: utilitiesTotal,
        utilities_ecg: utilitiesECG,
        utilities_water: utilitiesWater,
        primary_goal: draft.primaryGoal,
        strategy: computed.strategy,
        needs_pct: computed.needsPct,
        wants_pct: computed.wantsPct,
        savings_pct: computed.savingsPct,
        // Life stage & context (step 1)
        life_stage: draft.lifeStage ?? null,
        dependents_count: Math.max(0, parseInt(draft.dependentsCount, 10) || 0),
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
      await trySyncMutation(user.id, queued);
      await writePersonalizationStatusCache(user.id, true);
      // Cache vitals locally so Budget can display them instantly/offline.
      await writeProfileVitalsCache(user.id, {
        setup_completed: true,
        payday_day: paydayDay,
        interests: draft.interests,
        stable_salary: stableSalary,
        auto_tax: draft.autoTax,
        side_income: sideIncome,
        rent,
        tithe_remittance: titheRemittance,
        debt_obligations: debtObligations,
        utilities_mode: draft.utilitiesMode,
        utilities_total: utilitiesTotal,
        utilities_ecg: utilitiesECG,
        utilities_water: utilitiesWater,
        primary_goal: draft.primaryGoal,
        strategy: computed.strategy,
        needs_pct: computed.needsPct,
        wants_pct: computed.wantsPct,
        savings_pct: computed.savingsPct,
      });

      // 2) Also copy interests into local budget prefs (so UI can use offline)
      const state = await loadBudgetState(user.id);
      await saveBudgetState({
        ...state,
        prefs: { ...state.prefs, interests: draft.interests },
      });

      // 3) Apply strategy to budgeting (offline-first) with obligation-first allocation
      const fixedAmountsByCategory: Record<string, number> = {};
      if (rent > 0) fixedAmountsByCategory["Rent"] = rent;
      if (utilitiesTotal > 0) {
        if (draft.utilitiesMode === "precise") {
          if (utilitiesECG > 0) fixedAmountsByCategory["ECG"] = utilitiesECG;
          if (utilitiesWater > 0) fixedAmountsByCategory["Ghana Water"] = utilitiesWater;
        } else {
          fixedAmountsByCategory["ECG"] = Math.round(utilitiesTotal * 0.6);
          fixedAmountsByCategory["Ghana Water"] = Math.round(utilitiesTotal * 0.4);
        }
      }
      if (titheRemittance > 0) fixedAmountsByCategory["Tithes/Church"] = titheRemittance;
      if (debtObligations > 0) fixedAmountsByCategory["Debt Payments"] = debtObligations;
      await budget.setupBudget({
        paydayDay,
        needsPct: computed.needsPct,
        wantsPct: computed.wantsPct,
        savingsPct: computed.savingsPct,
        interests: draft.interests,
        fixedAmountsByCategory: Object.keys(fixedAmountsByCategory).length > 0 ? fixedAmountsByCategory : undefined,
        lifeStage: draft.lifeStage,
      });

      // Income sources
      await budget.addIncomeSource({
        name: "Monthly Basic Salary",
        type: "primary",
        amount: stableSalary,
        applyDeductions: draft.autoTax,
      });
      if (sideIncome > 0) {
        await budget.addIncomeSource({
          name: "Side Hustle",
          type: "side",
          amount: sideIncome,
          applyDeductions: false,
        });
      }

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // ignore
      }

      // Clear draft once complete
      try {
        await AsyncStorage.removeItem(vitalsDraftKey(user.id));
      } catch {
        // ignore
      }

      router.replace("/(tabs)/budget");
    } catch (e) {
      const offline = !(await isOnline());
      const message = offline
        ? "You're offline. Your progress is saved—try again when you're back online."
        : (e instanceof Error ? e.message : "Something went wrong");
      setError(message);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  }, [allStepsErrors, budget, draft, user?.id]);

  const currentStepNode = () => {
    if (draft.step === 0) return <StepWelcome />;
    if (draft.step === 1) {
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
    if (draft.step === 2) return <StepLifeStage draft={draft} updateDraft={updateDraft} />;
    if (draft.step === 3) {
      return (
        <StepFixedExpenses
          draft={draft}
          errors={stepErrors}
          keyboardAccessoryId={keyboardAccessoryId}
          updateDraft={updateDraft}
        />
      );
    }
    if (draft.step === 4) {
      return <StepInterests interests={draft.interests} onToggleInterest={toggleInterest} />;
    }
    return <StepGoal draft={draft} error={error} updateDraft={updateDraft} />;
  };

  const outgoingNode = () => {
    const s = outgoingStepRef.current;
    if (s === null) return null;
    if (s === 0) return <StepWelcome />;
    if (s === 1) {
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
    if (s === 2) return <StepLifeStage draft={draft} updateDraft={updateDraft} />;
    if (s === 3) {
      return (
        <StepFixedExpenses
          draft={draft}
          errors={stepErrors}
          keyboardAccessoryId={keyboardAccessoryId}
          updateDraft={updateDraft}
        />
      );
    }
    if (s === 4) {
      return <StepInterests interests={draft.interests} onToggleInterest={toggleInterest} />;
    }
    return <StepGoal draft={draft} error={error} updateDraft={updateDraft} />;
  };

  const showSkip = !!user?.id && !editMode && !setupCompleted;

  if (noUser) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: "#000000" }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
          <Text
            style={{
              color: "#E2E8F0",
              fontFamily: "Figtree-Medium",
              fontSize: 18,
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            Please sign in to set up your budget.
          </Text>
          <PrimaryButton onPress={() => router.replace("/auth")} style={{ minWidth: 200 }}>
            Sign in
          </PrimaryButton>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: "#000000" }}>
      {/* Progress neon line */}
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
        {/* Header with Skip in top-right */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 4,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#9CA3AF", fontFamily: "Figtree-Medium", fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase" }}>
              Step {draft.step + 1} of {totalSteps}
            </Text>
            <Text style={{ color: "#FFFFFF", fontFamily: "Figtree-Bold", fontSize: 28, marginTop: 8, letterSpacing: -0.5 }}>
              {title}
            </Text>
          </View>
          {showSkip ? (
            <Button
              variant="outline"
              size="sm"
              onPress={async () => {
                try {
                  await Haptics.selectionAsync();
                } catch {
                  // ignore
                }
                await handleSkip();
              }}
              style={{ paddingVertical: 8, paddingHorizontal: 12, marginTop: 4 }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={{ color: "#94A3B8", fontFamily: "Figtree-Medium", fontSize: 15 }}>
                Skip
              </Text>
            </Button>
          ) : null}
        </View>

        <Separator className="mt-4 mx-4" />

        <KeyboardAwareScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: bottomBarHeight }}
          className="px-5 py-4"
        >
          {showValidationHint && draft.step > 0 && (draft.step === 5 ? !canFinish : !canContinue) && (
            <Text
              style={{
                color: "#FCA5A5",
                fontFamily: "Figtree-Regular",
                fontSize: 13,
                marginBottom: 12,
              }}
            >
              Complete required fields above to continue.
            </Text>
          )}

          {/* Slide/scale transition stack - height adapts to step content */}
          <Animated.View style={[containerStyle]}>
            {outgoingStepRef.current !== null ? (
              <Animated.View
                style={[StyleSheet.absoluteFill, outgoingStyle]}
                accessibilityElementsHidden
              >
                {outgoingNode()}
              </Animated.View>
            ) : null}

            <Animated.View
              style={[{ position: "absolute", left: 0, right: 0, top: 0 }, incomingStyle]}
              onLayout={onStepLayout}
            >
              {currentStepNode()}
            </Animated.View>
          </Animated.View>
        </KeyboardAwareScrollView>

        {/* iOS: ensure every keyboard has a Done/Close control */}
        <KeyboardDoneAccessory accessoryId={keyboardAccessoryId} />

        {/* Bottom bar - in normal flow, never shrink */}
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
          }}
        >
          <View style={{ flexDirection: "row", gap: 10 }}>
            <SecondaryButton
              onPress={draft.step === 0 ? () => router.replace("/(tabs)/budget") : goBack}
              style={{ flex: 1 }}
            >
              {draft.step === 0 ? "I'll do this later" : "Back"}
            </SecondaryButton>

            {draft.step < totalSteps - 1 ? (
              <PrimaryButton
                onPress={goNext}
                disabled={!canContinue && draft.step > 0}
                style={{ flex: 1, opacity: canContinue || draft.step === 0 ? 1 : 0.5 }}
              >
                Next
              </PrimaryButton>
            ) : (
              <PrimaryButton
                onPress={handleFinish}
                loading={loading}
                disabled={loading}
                style={{ flex: 1, opacity: canFinish ? 1 : 0.5 }}
              >
                {editMode ? "Save changes" : "Finish"}
              </PrimaryButton>
            )}
          </View>

          {draft.step > 0 && draft.step < totalSteps - 1 && !editMode ? (
            <Pressable
              onPress={() => {
                void persistDraft(draft);
                router.replace("/(tabs)/budget");
              }}
              style={{
                alignSelf: "center",
                paddingVertical: 12,
                paddingHorizontal: 16,
                marginTop: 8,
              }}
            >
              <Text
                style={{
                  color: "#64748B",
                  fontFamily: "Figtree-Regular",
                  fontSize: 12,
                  textDecorationLine: "underline",
                }}
              >
                Save and continue later
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

