import { CediTourCard } from "@/components/tour/CediTourCard";
import {
  ONBOARDING_END_STEP_KEYS,
  ONBOARDING_STEP_GROUPS,
  STEPS_ORDER,
} from "@/constants/tourSteps";
import {
  TOUR_START_DELAY_MS,
  tourTokens,
} from "@/constants/tourTokens";
import {
  AccountOnboardingRecord,
  clearOnboardingLocalCache,
  getAccountOnboardingRecord,
  getOnboardingStatus,
  setOnboardingStatus,
  upsertAccountOnboardingRecord,
  type OnboardingStateKey,
  type OnboardingStatus,
} from "@/utils/onboardingState";
import { router } from "expo-router";
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  TourProvider as LumenTourProvider,
  useTour,
  type CardProps,
} from "react-native-lumen";

import { useAuth } from "../hooks/useAuth";
import { usePersonalizationStatus } from "../hooks/usePersonalizationStatus";
import { analytics } from "../utils/analytics";
import { clearTourSeen } from "../utils/tourStorage";

type TourEndReason = "completed" | "skipped";
type OnboardingSegment = "home" | "budget";
type State1BudgetStepKey =
  | "state1-budget-personalization"
  | "state1-budget-payday";

type ActiveRun = {
  state: OnboardingStateKey;
  segment: OnboardingSegment;
  firstStep: string;
  isReplay: boolean;
};

type TourContextType = {
  startHomeTour: () => void;
  startBudgetTour: (stepKey?: State1BudgetStepKey) => void;
  startActiveOnboardingIfEligible: (
    segment: OnboardingSegment,
    options?: { state1BudgetStepKey?: State1BudgetStepKey }
  ) => Promise<void>;
  activeOnboardingState: OnboardingStateKey | null;
  onboardingLoaded: boolean;
  state1Status: OnboardingStatus | null;
  state2Status: OnboardingStatus | null;
  currentReplayState: OnboardingStateKey | null;
  resetTourSeen: () => Promise<void>;
};

const TourContext = createContext<TourContextType | null>(null);

export const useTourContext = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTourContext must be used within TourProvider");
  }
  return context;
};

const NO_OP_TOUR_CONTEXT: TourContextType = {
  startHomeTour: () => { },
  startBudgetTour: () => { },
  startActiveOnboardingIfEligible: async () => { },
  activeOnboardingState: null,
  onboardingLoaded: false,
  state1Status: null,
  state2Status: null,
  currentReplayState: null,
  resetTourSeen: async () => { },
};

export function TourProviderFallback({ children }: { children: ReactNode }) {
  return (
    <TourContext.Provider value={NO_OP_TOUR_CONTEXT}>
      {children}
    </TourContext.Provider>
  );
}

export function TourProvider({ children }: { children: ReactNode }) {
  const activeRunRef = useRef<ActiveRun | null>(null);
  const onTourEndRef = useRef<(reason: TourEndReason) => void>(() => { });

  const renderCardWithHandler = useCallback((props: CardProps) => {
    const handleStop = () => {
      onTourEndRef.current("skipped");
      props.stop();
    };

    const handleNext = () => {
      const isLastStep = props.isLast || ONBOARDING_END_STEP_KEYS.has(props.step.key);
      if (isLastStep) {
        onTourEndRef.current("completed");
        if (props.step.key === "state1-home-budget-tab") {
          router.push("/(tabs)/budget");
          props.stop();
          return;
        }
      }
      props.next();
    };

    return (
      <CediTourCard
        {...props}
        isLast={props.isLast || ONBOARDING_END_STEP_KEYS.has(props.step.key)}
        nextLabel={props.step.key === "state1-home-budget-tab" ? "Go" : undefined}
        next={handleNext}
        prev={props.prev}
        stop={handleStop}
      />
    );
  }, []);

  return (
    <LumenTourProvider
      key="cediwise-tour"
      stepsOrder={[...STEPS_ORDER]}
      backdropOpacity={0.65}
      config={{
        springConfig: {
          damping: 120,
          mass: 1,
          stiffness: 900,
          overshootClamping: true,
        },
        renderCard: renderCardWithHandler,
        preventInteraction: true,
        tooltipStyles: {
          backgroundColor: "transparent",
        },
        zoneStyle: {
          borderWidth: tourTokens.zone.borderWidth,
          borderColor: tourTokens.zone.borderColor,
        },
      }}>
      <TourContextInner
        activeRunRef={activeRunRef}
        onTourEndRef={onTourEndRef}>
        {children}
      </TourContextInner>
    </LumenTourProvider>
  );
}

function TourContextInner({
  children,
  activeRunRef,
  onTourEndRef,
}: {
  children: ReactNode;
  activeRunRef: React.MutableRefObject<ActiveRun | null>;
  onTourEndRef: React.MutableRefObject<(reason: TourEndReason) => void>;
}) {
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const personalization = usePersonalizationStatus(userId);
  const { start } = useTour();

  const [record, setRecord] = useState<AccountOnboardingRecord | null>(null);
  const [onboardingLoaded, setOnboardingLoaded] = useState(false);
  const [activeOnboardingState, setActiveOnboardingState] =
    useState<OnboardingStateKey | null>(null);
  const [currentReplayState, setCurrentReplayState] =
    useState<OnboardingStateKey | null>(null);
  const [lastPersonalizationComplete, setLastPersonalizationComplete] =
    useState<boolean | null>(null);

  const state1Status = record?.state1Status ?? null;
  const state2Status = record?.state2Status ?? null;

  const loadRecord = useCallback(async () => {
    if (!userId) {
      setRecord(null);
      setOnboardingLoaded(true);
      return;
    }
    const nextRecord = await getAccountOnboardingRecord(userId);
    setRecord(nextRecord);
    setOnboardingLoaded(true);
  }, [userId]);

  useEffect(() => {
    if (authLoading) return;
    void loadRecord();
  }, [authLoading, loadRecord]);

  const persistRecord = useCallback(
    async (nextRecord: AccountOnboardingRecord) => {
      setRecord(nextRecord);
      if (!userId) return;
      await upsertAccountOnboardingRecord(nextRecord);
    },
    [userId]
  );

  const startRun = useCallback(
    async (run: ActiveRun) => {
      if (!userId || !record) return;

      activeRunRef.current = run;
      setActiveOnboardingState(run.state);
      if (run.isReplay) {
        setCurrentReplayState(run.state);
      }

      const currentStatus = getOnboardingStatus(record, run.state);
      const nextRecord =
        currentStatus === "never_seen"
          ? setOnboardingStatus(record, run.state, "in_progress")
          : record;

      if (nextRecord !== record) {
        await persistRecord(nextRecord);
      }

      setTimeout(() => start(run.firstStep), TOUR_START_DELAY_MS);
    },
    [activeRunRef, persistRecord, record, start, userId]
  );

  const getActiveState = useCallback(
    (setupCompleted: boolean): OnboardingStateKey =>
      setupCompleted ? "state_2_personalized" : "state_1_unpersonalized",
    []
  );

  const startHomeTour = useCallback(() => {
    if (!record) return;
    const replayState = personalization.setupCompleted
      ? "state_2_personalized"
      : "state_1_unpersonalized";
    const group =
      replayState === "state_2_personalized"
        ? ONBOARDING_STEP_GROUPS.state2Home
        : ONBOARDING_STEP_GROUPS.state1Home;
    void startRun({
      state: group.state,
      segment: group.segment,
      firstStep: group.firstStep,
      isReplay: true,
    });
  }, [personalization.setupCompleted, record, startRun]);

  const startBudgetTour = useCallback(
    (stepKey?: State1BudgetStepKey) => {
      if (!record) return;
      const replayState = personalization.setupCompleted
        ? "state_2_personalized"
        : "state_1_unpersonalized";

      if (replayState === "state_2_personalized") {
        const group = ONBOARDING_STEP_GROUPS.state2Budget;
        void startRun({
          state: group.state,
          segment: group.segment,
          firstStep: group.firstStep,
          isReplay: true,
        });
        return;
      }

      const group =
        stepKey === "state1-budget-payday"
          ? ONBOARDING_STEP_GROUPS.state1BudgetPayday
          : personalization.hasProfile
            ? ONBOARDING_STEP_GROUPS.state1BudgetPayday
            : ONBOARDING_STEP_GROUPS.state1BudgetPersonalization;
      void startRun({
        state: group.state,
        segment: group.segment,
        firstStep: group.firstStep,
        isReplay: true,
      });
    },
    [personalization.hasProfile, personalization.setupCompleted, record, startRun]
  );

  const startActiveOnboardingIfEligible = useCallback(
    async (
      segment: OnboardingSegment,
      options?: { state1BudgetStepKey?: State1BudgetStepKey }
    ) => {
      if (!record || !userId) return;

      const activeState = personalization.setupCompleted
        ? "state_2_personalized"
        : "state_1_unpersonalized";

      const status = getOnboardingStatus(record, activeState);
      if (status === "dismissed" || status === "completed" || status === "invalidated") {
        return;
      }
      if (activeRunRef.current?.state === activeState) {
        return;
      }

      const group =
        activeState === "state_2_personalized"
          ? segment === "home"
            ? ONBOARDING_STEP_GROUPS.state2Home
            : ONBOARDING_STEP_GROUPS.state2Budget
          : segment === "home"
            ? ONBOARDING_STEP_GROUPS.state1Home
            : options?.state1BudgetStepKey === "state1-budget-payday"
              ? ONBOARDING_STEP_GROUPS.state1BudgetPayday
              : ONBOARDING_STEP_GROUPS.state1BudgetPersonalization;

      await startRun({
        state: group.state,
        segment: group.segment,
        firstStep: group.firstStep,
        isReplay: false,
      });
    },
    [activeRunRef, personalization.setupCompleted, record, startRun, userId]
  );

  const invalidateState1AndPromoteToState2 = useCallback(async () => {
    if (!record || !userId) return;

    const now = new Date().toISOString();
    let nextRecord = setOnboardingStatus(record, "state_1_unpersonalized", "invalidated", now);
    nextRecord = {
      ...nextRecord,
      state1CompletedAt: null,
      state1DismissedAt: null,
    };
    setActiveOnboardingState("state_2_personalized");
    activeRunRef.current = null;
    await persistRecord(nextRecord);
    router.replace("/(tabs)");
    const group = ONBOARDING_STEP_GROUPS.state2Home;
    await startRun({
      state: group.state,
      segment: group.segment,
      firstStep: group.firstStep,
      isReplay: false,
    });
  }, [activeRunRef, persistRecord, record, startRun, userId]);

  useEffect(() => {
    if (!userId || !onboardingLoaded || personalization.isLoading) return;
    const setupCompleted = personalization.setupCompleted;
    const resolvedState = getActiveState(setupCompleted);
    setActiveOnboardingState((current) =>
      current === resolvedState ? current : resolvedState
    );

    if (lastPersonalizationComplete === null) {
      setLastPersonalizationComplete(setupCompleted);
      return;
    }

    if (!lastPersonalizationComplete && setupCompleted) {
      setLastPersonalizationComplete(true);
      void invalidateState1AndPromoteToState2();
      return;
    }

    if (lastPersonalizationComplete !== setupCompleted) {
      setLastPersonalizationComplete(setupCompleted);
    }
  }, [
    getActiveState,
    invalidateState1AndPromoteToState2,
    lastPersonalizationComplete,
    onboardingLoaded,
    personalization.isLoading,
    personalization.setupCompleted,
    userId,
  ]);

  const handleTourEnd = useCallback(
    async (reason: TourEndReason) => {
      const run = activeRunRef.current;
      if (!run || !record || !userId) return;

      activeRunRef.current = null;
      setCurrentReplayState(null);

      if (reason === "skipped") {
        const dismissedRecord = setOnboardingStatus(record, run.state, "dismissed");
        setActiveOnboardingState(run.state);
        await persistRecord(dismissedRecord);
        if (run.state === "state_2_personalized") {
          analytics.tourSkippedCoreBudget({ userId });
        }
        return;
      }

      if (run.segment === "home") {
        setActiveOnboardingState(run.state);
        router.push("/(tabs)/budget");
        return;
      }

      const completedRecord = setOnboardingStatus(record, run.state, "completed");
      setActiveOnboardingState(run.state);
      await persistRecord(completedRecord);
      if (run.state === "state_2_personalized") {
        analytics.tourCompletedCoreBudget({ userId });
      }
    },
    [activeRunRef, persistRecord, record, userId]
  );

  useEffect(() => {
    onTourEndRef.current = (reason: TourEndReason) => {
      void handleTourEnd(reason);
    };
  }, [handleTourEnd, onTourEndRef]);

  const resetTourSeen = useCallback(async () => {
    if (!userId) return;
    await clearTourSeen(userId);
    await clearOnboardingLocalCache(userId);
    const baseRecord = record ?? (await getAccountOnboardingRecord(userId));
    const nextRecord: AccountOnboardingRecord = {
      ...baseRecord,
      state1Status: "never_seen" as OnboardingStatus,
      state1SeenAt: null,
      state1CompletedAt: null,
      state1DismissedAt: null,
      state1InvalidatedAt: null,
      state2Status: "never_seen" as OnboardingStatus,
      state2SeenAt: null,
      state2CompletedAt: null,
      state2DismissedAt: null,
    };
    await persistRecord(nextRecord);
    setActiveOnboardingState(null);
    setCurrentReplayState(null);
  }, [persistRecord, record, userId]);

  const value = useMemo<TourContextType>(
    () => ({
      startHomeTour,
      startBudgetTour,
      startActiveOnboardingIfEligible,
      activeOnboardingState,
      onboardingLoaded,
      state1Status,
      state2Status,
      currentReplayState,
      resetTourSeen,
    }),
    [
      activeOnboardingState,
      currentReplayState,
      onboardingLoaded,
      resetTourSeen,
      startActiveOnboardingIfEligible,
      startBudgetTour,
      startHomeTour,
      state1Status,
      state2Status,
    ]
  );

  return (
    <TourContext.Provider value={value}>
      {children}
    </TourContext.Provider>
  );
}
