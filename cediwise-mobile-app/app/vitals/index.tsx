import { BackButton } from "@/components/BackButton";
import { BUDGET_TEMPLATES } from "@/components/features/vitals/budgetTemplates";
import {
  StepIncome,
  StepPreview,
  StepStyle,
} from "@/components/features/vitals/Steps";
import type { BudgetPreview, Draft, StepErrors } from "@/components/features/vitals/types";
import {
  computeIntelligentStrategy,
  getNetPreview,
  recurringStoreToWizardLines,
  toMoney,
  toMonthlySalary,
  vitalsToInitialDraft,
} from "@/components/features/vitals/utils";
import { KeyboardAwareScrollView } from "@/components/KeyboardAwareScrollView";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { useAuth } from "@/hooks/useAuth";
import { useBudget } from "@/hooks/useBudget";
import { usePersonalizationStore } from "@/stores/personalizationStore";
import { useProfileVitalsStore } from "@/stores/profileVitalsStore";
import { useRecurringExpensesStore } from "@/stores/recurringExpensesStore";
import { analytics } from "@/utils/analytics";
import { enqueueMutation } from "@/utils/budgetStorage";
import { trySyncProfileWithRetries } from "@/utils/budgetSync";
import { isOnline } from "@/utils/connectivity";
import { log } from "@/utils/logger";
import {
  writePersonalizationStatusCache,
  writeProfileVitalsCache,
} from "@/utils/profileVitals";
import { readTourSeen } from "@/utils/tourStorage";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Separator } from "heroui-native";
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

const AnimatedView = Animated.createAnimatedComponent(View);
const SETUP_LOGO = require("../../assets/images/logo/cediwise-transparent-emerald-logo.png");

/** Default budget preview used when income is not yet entered. */
const DEFAULT_PREVIEW: BudgetPreview = {
  needsPct: 0.5,
  wantsPct: 0.3,
  savingsPct: 0.2,
  netIncome: 0,
  strategy: "balanced",
};

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
    selectedTemplate: "smart",
    recurringExpenses: [],
    goalType: null,
    goalAmount: "",
    goalTimeline: "",
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
  const vitals = useProfileVitalsStore((s) => s.vitals);

  const [draft, setDraft] = useState<Draft>(() => {
    if (editMode) {
      const storedVitals = useProfileVitalsStore.getState().vitals;
      if (storedVitals) {
        // Recurring lines hydrate after loadRecurringExpenses finishes (see effects below).
        return vitalsToInitialDraft(storedVitals);
      }
    }
    return makeDefaultDraft();
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transition = useSharedValue(1);
  const direction = useSharedValue<1 | -1>(1);
  const containerHeight = useSharedValue(360);
  const backBtnVisible = useSharedValue(editMode ? 1 : 0);
  const outgoingStepRef = useRef<number | null>(null);
  const editRecurringHydratedRef = useRef(false);
  const scrollViewRef = useRef<any>(null);
  const [showValidationHint, setShowValidationHint] = useState(false);
  const insets = useSafeAreaInsets();

  // Skip link is now in the top nav bar, so the bottom bar only holds the button row.
  const bottomBarHeight = 16 + 52 + Math.max(16, insets.bottom);

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

  const recurringLoading = useRecurringExpensesStore((s) => s.isLoading);

  useEffect(() => {
    editRecurringHydratedRef.current = false;
  }, [user?.id]);

  useEffect(() => {
    if (!editMode || !user?.id) return;
    void useRecurringExpensesStore.getState().loadRecurringExpenses();
  }, [editMode, user?.id]);

  // Cold-start fallback: hydrate draft when vitals / recurring load (salary still empty).
  useEffect(() => {
    if (!editMode || !vitals || recurringLoading) return;
    if (toMoney(draft.stableSalary) > 0) return;
    setDraft(
      vitalsToInitialDraft(vitals, {
        recurringFromStore: useRecurringExpensesStore.getState().recurringExpenses,
      }),
    );
    editRecurringHydratedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, vitals, recurringLoading]);

  // After recurring store finishes loading, merge wizard recurring lines (edit mode only).
  useEffect(() => {
    if (!editMode || !vitals || recurringLoading) return;
    if (editRecurringHydratedRef.current) return;
    const lines = recurringStoreToWizardLines(
      useRecurringExpensesStore.getState().recurringExpenses,
    );
    setDraft((prev) => ({ ...prev, recurringExpenses: lines }));
    editRecurringHydratedRef.current = true;
  }, [editMode, vitals, recurringLoading]);

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
        return "Your Money";
      case 1:
        return "Your Style";
      case 2:
        return "Your Budget";
      default:
        return editMode ? "Update your profile" : "Vitals";
    }
  }, [draft.step, editMode]);

  // Per-step errors: only Screen 0 has required fields
  const stepErrors: StepErrors = useMemo(() => {
    const e: Record<string, string> = {};
    if (draft.step === 0) {
      if (toMoney(draft.stableSalary) <= 0) {
        e.stableSalary = "Enter your salary";
      }
      if (!Number.isFinite(draft.paydayDay) || draft.paydayDay < 1 || draft.paydayDay > 31) {
        e.paydayDay = "Select a payday between 1 and 31";
      }
    }
    return e;
  }, [draft]);

  // Global finish errors (income + payday always required)
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

  const netPreview = useMemo(
    () => getNetPreview(draft.stableSalary, draft.incomeFrequency),
    [draft.stableSalary, draft.incomeFrequency],
  );

  /** Computed budget preview — recomputes live as inputs or template selection change. */
  const budgetPreview = useMemo((): BudgetPreview => {
    const rawSalary = toMoney(draft.stableSalary);
    if (rawSalary <= 0) return DEFAULT_PREVIEW;
    const stableSalary = toMonthlySalary(rawSalary, draft.incomeFrequency);
    // Only "needs"-bucket expenses count as fixed costs in the strategy engine
    const needsTotal = draft.recurringExpenses
      .filter((e) => e.bucket === "needs")
      .reduce((sum, e) => sum + toMoney(e.amount), 0);
    const result = computeIntelligentStrategy({
      stableSalary,
      autoTax: draft.autoTax,
      sideIncome: 0,
      rent: 0,
      titheRemittance: 0,
      debtObligations: 0,
      utilitiesTotal: needsTotal,
      lifeStage: draft.lifeStage,
      dependentsCount: 0,
      incomeFrequency: draft.incomeFrequency,
      spendingStyle: draft.spendingStyle,
      financialPriority: draft.financialPriority,
    });

    // If the user picked a named template, override the computed percentages
    // but keep the real net income so GHS amounts remain accurate.
    const tmpl = BUDGET_TEMPLATES[draft.selectedTemplate];
    if (tmpl.needsPct !== null) {
      return {
        needsPct: tmpl.needsPct,
        wantsPct: tmpl.wantsPct!,
        savingsPct: tmpl.savingsPct!,
        netIncome: result.netIncome,
        strategy: tmpl.strategyKey,
      };
    }

    return {
      needsPct: result.needsPct,
      wantsPct: result.wantsPct,
      savingsPct: result.savingsPct,
      netIncome: result.netIncome,
      strategy: result.strategy,
    };
  }, [
    draft.stableSalary,
    draft.incomeFrequency,
    draft.autoTax,
    draft.lifeStage,
    draft.spendingStyle,
    draft.financialPriority,
    draft.recurringExpenses,
    draft.selectedTemplate,
  ]);

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

  useEffect(() => {
    const showBack = editMode || draft.step > 0;
    backBtnVisible.value = withTiming(showBack ? 1 : 0, {
      duration: 250,
      easing: Easing.out(Easing.cubic),
    });
  }, [draft.step, editMode, backBtnVisible]);

  const backBtnStyle = useAnimatedStyle(() => ({
    opacity: backBtnVisible.value,
    transform: [
      { translateX: interpolate(backBtnVisible.value, [0, 1], [-8, 0]) },
    ],
  }));

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

  const exitWizard = useCallback(async () => {
    setDraft(makeDefaultDraft());
    if (user?.id) {
      await writePersonalizationStatusCache(user.id, false, { skippedVitals: true });
    }
    router.replace("/(tabs)");
  }, [user?.id]);

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
      if (editMode) {
        router.back();
      } else {
        exitWizard();
      }
      return;
    }
    const nextStep = Math.max(0, draft.step - 1);
    updateDraft({ step: nextStep });
    animateStepChange(nextStep, "back");
  }, [animateStepChange, draft.step, editMode, exitWizard, updateDraft]);

  const doFinish = useCallback(
    async () => {
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

        // "needs" bucket → fixed costs that influence the strategy engine (match budgetPreview)
        const rent = 0;
        const utilitiesTotal = draft.recurringExpenses
          .filter((e) => e.bucket === "needs")
          .reduce((sum, e) => sum + toMoney(e.amount), 0);
        const primaryGoal = draft.goalType ?? null;

        const computed = computeIntelligentStrategy({
          stableSalary,
          autoTax: draft.autoTax,
          sideIncome: 0,
          rent,
          titheRemittance: 0,
          debtObligations: 0,
          utilitiesTotal,
          lifeStage: draft.lifeStage,
          dependentsCount: 0,
          incomeFrequency: draft.incomeFrequency,
          spendingStyle: draft.spendingStyle,
          financialPriority: draft.financialPriority,
        });

        // Resolve final percentages — named template overrides the engine output
        const tmpl = BUDGET_TEMPLATES[draft.selectedTemplate];
        const finalNeedsPct = tmpl.needsPct ?? computed.needsPct;
        const finalWantsPct = tmpl.wantsPct ?? computed.wantsPct;
        const finalSavingsPct = tmpl.savingsPct ?? computed.savingsPct;
        const finalStrategy = tmpl.strategyForDb ?? computed.strategy;

        const createdAt = new Date().toISOString();

        const payload = {
          id: user.id,
          setup_completed: true,
          payday_day: draft.paydayDay,
          interests: draft.interests,
          stable_salary: stableSalary,
          auto_tax: draft.autoTax,
          side_income: 0,
          rent,
          tithe_remittance: 0,
          debt_obligations: 0,
          utilities_mode: "general",
          utilities_total: utilitiesTotal,
          utilities_ecg: 0,
          utilities_water: 0,
          primary_goal: primaryGoal,
          strategy: finalStrategy,
          needs_pct: finalNeedsPct,
          wants_pct: finalWantsPct,
          savings_pct: finalSavingsPct,
          life_stage: draft.lifeStage ?? null,
          dependents_count: 0,
          income_frequency: draft.incomeFrequency,
          spending_style: draft.spendingStyle ?? null,
          financial_priority: draft.financialPriority ?? null,
          profile_version: 1,
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
          rent,
          tithe_remittance: 0,
          debt_obligations: 0,
          utilities_mode: "general",
          utilities_total: utilitiesTotal,
          utilities_ecg: 0,
          utilities_water: 0,
          primary_goal: primaryGoal,
          strategy: finalStrategy,
          needs_pct: finalNeedsPct,
          wants_pct: finalWantsPct,
          savings_pct: finalSavingsPct,
          life_stage: draft.lifeStage ?? null,
          spending_style: draft.spendingStyle ?? null,
          financial_priority: draft.financialPriority ?? null,
          income_frequency: draft.incomeFrequency,
          dependents_count: 0,
          profile_version: 1,
        });

        void usePersonalizationStore.getState().refresh();
        void useProfileVitalsStore.getState().refresh();

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

        await budget.setupBudget({
          paydayDay: draft.paydayDay,
          needsPct: finalNeedsPct,
          wantsPct: finalWantsPct,
          savingsPct: finalSavingsPct,
          interests: draft.interests,
          seedCategories: false,
          lifeStage: draft.lifeStage ?? null,
        });

        if (draft.recurringExpenses.length > 0) {
          const snap = useRecurringExpensesStore.getState().recurringExpenses;
          const seen = new Set(
            snap.map(
              (e) =>
                `${e.name.trim().toLowerCase()}:${e.bucket}:${e.frequency}:${e.amount}`,
            ),
          );
          for (const line of draft.recurringExpenses) {
            const amt = toMoney(line.amount);
            if (amt <= 0 || !line.name.trim()) continue;
            const bucket = line.bucket === "needs" ? "needs" : "wants";
            const key = `${line.name.trim().toLowerCase()}:${bucket}:monthly:${amt}`;
            if (seen.has(key)) continue;
            seen.add(key);
            await useRecurringExpensesStore.getState().addRecurringExpense({
              name: line.name.trim(),
              amount: amt,
              frequency: "monthly",
              bucket,
              autoAllocate: true,
            });
          }
        }
        await budget.recalculateBudget();

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
        if (editMode) {
          router.back();
        } else {
          router.replace("/(tabs)/budget");
        }
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
    },
    [allStepsErrors, budget, completeSetupProgress, draft, user?.id, editMode],
  );

  const handleFinish = useCallback(() => doFinish(), [doFinish]);

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
        <StepStyle
          draft={draft}
          toggleInterest={toggleInterest}
          updateDraft={updateDraft}
        />
      );
    }
    return (
      <StepPreview
        draft={draft}
        updateDraft={updateDraft}
        preview={budgetPreview}
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
        <StepStyle
          draft={draft}
          toggleInterest={toggleInterest}
          updateDraft={updateDraft}
        />
      );
    }
    return (
      <StepPreview
        draft={draft}
        updateDraft={updateDraft}
        preview={budgetPreview}
      />
    );
  };

  // ─── Skip link text / action per step ──────────────────────────────────────
  const skipLabel = useMemo(() => {
    if (draft.step === 0) return "I'll set this up later";
    if (draft.step === 1) return "Skip for now";
    return "Skip for now";
  }, [draft.step]);

  const handleSkip = useCallback(() => {
    if (draft.step === 0) {
      exitWizard();
    } else if (draft.step === 1) {
      // Advance to preview screen without personalization
      goNext();
    } else {
      // Preview: leave without persisting (same as step-0 exit; no saving overlay)
      if (editMode) {
        router.back();
      } else {
        void exitWizard();
      }
    }
  }, [draft.step, editMode, exitWizard, goNext]);

  // ─── No user ────────────────────────────────────────────────────────────────
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

  // ─── Loading overlay ────────────────────────────────────────────────────────
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

  // ─── Main wizard ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: "#000000" }}>
      <View
        style={{
          height: 44,
          paddingHorizontal: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
        <View style={{ width: 64 }}>
          {editMode && <BackButton onPress={goBack} />}
        </View>

        <Pressable
          onPress={handleSkip}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Text
            style={{
              color: "#64748B",
              fontFamily: "Figtree-Regular",
              fontSize: 13,
              textDecorationLine: "underline",
            }}>
            {skipLabel}
          </Text>
        </Pressable>
      </View>

      {/* Progress bar */}
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
        {/* Step header */}
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
        </View>

        <Separator className="mt-4 mx-4" />

        {/* Scrollable step content */}
        <KeyboardAwareScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: bottomBarHeight }}
          className="px-5 py-4">
          {showValidationHint && !canContinue ? (
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

        {/* Bottom action bar */}
        <View
          style={{
            flexShrink: 0,
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: Math.max(16, insets.bottom),
            backgroundColor: "#000000",
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.06)",
          }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <AnimatedView style={[{ flex: 1 }, backBtnStyle]}>
              <SecondaryButton onPress={goBack}>
                Back
              </SecondaryButton>
            </AnimatedView>

            {draft.step < totalSteps - 1 ? (
              <PrimaryButton
                onPress={goNext}
                disabled={!canContinue}
                style={{
                  flex: 1,
                  opacity: canContinue ? 1 : 0.5,
                }}>
                Continue
              </PrimaryButton>
            ) : (
              <PrimaryButton
                onPress={handleFinish}
                loading={loading}
                disabled={loading}
                style={{ flex: 1 }}>
                {loading ? "Saving…" : editMode ? "Save changes" : "Complete"}
              </PrimaryButton>
            )}
          </View>

        </View>
      </View>
    </SafeAreaView>
  );
}
