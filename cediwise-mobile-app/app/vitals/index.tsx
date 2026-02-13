import { StepFixedExpenses, StepGoal, StepIncome, StepInterests, StepLifeStage } from "@/components/features/vitals/Steps";
import type { Draft, StepErrors } from "@/components/features/vitals/types";
import { clampDay, computeStrategy, getNetPreview, strategyToPercents, toMoney } from "@/components/features/vitals/utils";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

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

  const totalSteps = 5;
  const [draft, setDraft] = useState<Draft>(makeDefaultDraft());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transition = useSharedValue(1);
  const direction = useSharedValue<1 | -1>(1);
  const outgoingStepRef = useRef<number | null>(null);

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
              ? Math.max(0, Math.min(totalSteps - 1, parsed.step))
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
    switch (draft.step) {
      case 0:
        return "Income & Jobs";
      case 1:
        return "Life Stage & Context";
      case 2:
        return "Fixed Expenses";
      case 3:
        return "Interests & Wants";
      case 4:
        return "Goal Setting";
      default:
        return "Vitals";
    }
  }, [draft.step]);

  const stepErrors: StepErrors = useMemo(() => {
    const e: Record<string, string> = {};
    if (draft.step === 0) {
      if (toMoney(draft.stableSalary) <= 0) e.stableSalary = "Required";
      if (clampDay(draft.paydayDay) === null) e.paydayDay = "Enter 1–31";
    }
    // Step 1 = Life Stage (no required fields)
    if (draft.step === 2) {
      // Rent is optional (not everyone rents)
      const total =
        draft.utilitiesMode === "precise"
          ? toMoney(draft.utilitiesECG) + toMoney(draft.utilitiesWater)
          : toMoney(draft.utilitiesTotal);
      if (total <= 0) e.utilities = "Required";
    }
    if (draft.step === 4) {
      if (!draft.primaryGoal) e.goal = "Pick a goal";
    }
    return e;
  }, [draft]);

  /** Full validation for all required steps (0, 2, 4). Used for Finish button and submit. */
  const allStepsErrors: StepErrors = useMemo(() => {
    const e: Record<string, string> = {};
    if (toMoney(draft.stableSalary) <= 0) e.stableSalary = "Required";
    if (clampDay(draft.paydayDay) === null) e.paydayDay = "Enter 1–31";
    const utilitiesTotal =
      draft.utilitiesMode === "precise"
        ? toMoney(draft.utilitiesECG) + toMoney(draft.utilitiesWater)
        : toMoney(draft.utilitiesTotal);
    if (utilitiesTotal <= 0) e.utilities = "Required";
    if (!draft.primaryGoal) e.goal = "Pick a goal";
    return e;
  }, [draft]);

  const canContinue = Object.keys(stepErrors).length === 0;
  const canFinish = draft.step === totalSteps - 1 && Object.keys(allStepsErrors).length === 0;

  const netPreview = useMemo(() => getNetPreview(draft.stableSalary), [draft.stableSalary]);

  const animateStepChange = useCallback(
    (nextStep: number, dir: "forward" | "back") => {
      outgoingStepRef.current = draft.step;
      // forward = +1 (enter from right), back = -1 (enter from left)
      direction.value = dir === "forward" ? 1 : -1;
      transition.value = 0;
      transition.value = withTiming(
        1,
        { duration: 260, easing: Easing.out(Easing.cubic) },
        () => {
          runOnJS(clearOutgoing)();
        }
      );
    },
    [clearOutgoing, direction, draft.step, transition]
  );

  const outgoingStyle = useAnimatedStyle(() => {
    const t = transition.value;
    const scale = interpolate(t, [0, 1], [1, 0.9], Extrapolate.CLAMP);
    const opacity = interpolate(t, [0, 1], [1, 0], Extrapolate.CLAMP);
    const translateX =
      direction.value === 1
        ? interpolate(
          t,
          [0, 1],
          [0, -Math.min(32, width * 0.08)],
          Extrapolate.CLAMP
        )
        : interpolate(
          t,
          [0, 1],
          [0, Math.min(32, width * 0.08)],
          Extrapolate.CLAMP
        );
    return { opacity, transform: [{ translateX }, { scale }] };
  }, [direction, transition, width]);

  const incomingStyle = useAnimatedStyle(() => {
    const t = transition.value;
    const startX = width * direction.value;
    const translateX = interpolate(t, [0, 1], [startX, 0], Extrapolate.CLAMP);
    const scale = interpolate(t, [0, 1], [1.1, 1.0], Extrapolate.CLAMP);
    const opacity = interpolate(t, [0, 1], [0, 1], Extrapolate.CLAMP);
    return { opacity, transform: [{ translateX }, { scale }] };
  }, [direction, transition, width]);

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

  const goNext = useCallback(async () => {
    Keyboard.dismiss();
    setError(null);
    if (!canContinue) {
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
  }, [animateStepChange, canContinue, draft.step, updateDraft]);

  const goBack = useCallback(() => {
    Keyboard.dismiss();
    setError(null);
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
    router.replace("/(tabs)");
  }, [user?.id]);

  const handleFinish = useCallback(async () => {
    Keyboard.dismiss();
    if (!user?.id) return;
    if (Object.keys(allStepsErrors).length > 0) return;
    setError(null);
    setLoading(true);

    try {
      const stableSalary = toMoney(draft.stableSalary);
      const sideIncome = toMoney(draft.sideIncome);
      const rent = toMoney(draft.rent);
      const titheRemittance = toMoney(draft.titheRemittance);
      const utilitiesTotal =
        draft.utilitiesMode === "precise"
          ? toMoney(draft.utilitiesECG) + toMoney(draft.utilitiesWater)
          : toMoney(draft.utilitiesTotal);
      const utilitiesECG = toMoney(draft.utilitiesECG);
      const utilitiesWater = toMoney(draft.utilitiesWater);
      const paydayDay = clampDay(draft.paydayDay) ?? 25;

      const computedAuto = computeStrategy({
        stableSalary,
        autoTax: draft.autoTax,
        sideIncome,
        rent,
        titheRemittance,
        utilitiesTotal,
      });
      const computed = {
        ...computedAuto,
        strategy: draft.strategyChoice,
        ...strategyToPercents(draft.strategyChoice),
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

      // 3) Apply strategy to budgeting (offline-first)
      await budget.setupBudget({
        paydayDay,
        needsPct: computed.needsPct,
        wantsPct: computed.wantsPct,
        savingsPct: computed.savingsPct,
        interests: draft.interests,
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

      router.replace("/(tabs)");
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
      return <StepLifeStage draft={draft} updateDraft={updateDraft} />;
    }
    if (draft.step === 2) {
      return (
        <StepFixedExpenses
          draft={draft}
          errors={stepErrors}
          keyboardAccessoryId={keyboardAccessoryId}
          updateDraft={updateDraft}
        />
      );
    }
    if (draft.step === 3) {
      return <StepInterests interests={draft.interests} onToggleInterest={toggleInterest} />;
    }
    return <StepGoal draft={draft} error={error} updateDraft={updateDraft} />;
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
      return <StepLifeStage draft={draft} updateDraft={updateDraft} />;
    }
    if (s === 2) {
      return (
        <StepFixedExpenses
          draft={draft}
          errors={stepErrors}
          keyboardAccessoryId={keyboardAccessoryId}
          updateDraft={updateDraft}
        />
      );
    }
    if (s === 3) {
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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 80}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 140 }}
          keyboardShouldPersistTaps="handled"
          className="px-5 py-4"
        >
          <View style={{ marginBottom: 14 }}>
            <Text style={{ color: "#9CA3AF", fontFamily: "Figtree-Medium", fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase" }}>
              Step {draft.step + 1} of {totalSteps}
            </Text>
            <Text style={{ color: "#FFFFFF", fontFamily: "Figtree-Bold", fontSize: 28, marginTop: 8, letterSpacing: -0.5 }}>
              {title}
            </Text>
          </View>

          {/* Slide/scale transition stack */}
          <View style={{ minHeight: 520 }}>
            {outgoingStepRef.current !== null ? (
              <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: 0 }, outgoingStyle]}>
                {outgoingNode()}
              </Animated.View>
            ) : null}

            <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: 0 }, incomingStyle]}>
              {currentStepNode()}
            </Animated.View>
          </View>
        </ScrollView>

        {/* Floating controls */}
        <View
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: 16,
            gap: 10,
          }}
        >
          {showSkip ? (
            <SecondaryButton onPress={handleSkip} style={{ minHeight: 44 }}>
              Skip (use general plan)
            </SecondaryButton>
          ) : null}

          <View style={{ flexDirection: "row", gap: 10 }}>
            <SecondaryButton
              onPress={draft.step === 0 ? () => router.replace("/(tabs)") : goBack}
              style={{ flex: 1 }}
            >
              {draft.step === 0 ? "Later" : "Back"}
            </SecondaryButton>

            {draft.step < totalSteps - 1 ? (
              <PrimaryButton
                onPress={goNext}
                disabled={!canContinue}
                style={{ flex: 1, opacity: canContinue ? 1 : 0.3 }}
              >
                Next
              </PrimaryButton>
            ) : (
              <PrimaryButton
                onPress={handleFinish}
                loading={loading}
                disabled={!canFinish || loading}
                style={{ flex: 1, opacity: canFinish ? 1 : 0.3 }}
              >
                Finish
              </PrimaryButton>
            )}
          </View>
        </View>

        {/* iOS: ensure every keyboard has a Done/Close control */}
        <KeyboardDoneAccessory accessoryId={keyboardAccessoryId} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

