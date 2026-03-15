import { CediTourCard } from "@/components/tour/CediTourCard";
import {
  BUDGET_TOUR,
  HOME_TOUR,
  LEARN_TOUR,
  STEPS_ORDER,
} from "@/constants/tourSteps";
import {
  TOUR_CARD_OFFSET_X,
  TOUR_START_DELAY_MS,
  tourTokens,
} from "@/constants/tourTokens";
import { router } from "expo-router";
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert, View } from "react-native";
import {
  TourProvider as LumenTourProvider,
  useTour,
  type CardProps,
} from "react-native-lumen";
import { useAuth } from "../hooks/useAuth";
import { analytics } from "../utils/analytics";
import { isValueFirstOnboardingEnabled } from "../utils/featureFlags";
import {
  clearTourSeen,
  readTourSeen,
  writeTourSeen,
} from "../utils/tourStorage";

type TourId = "home" | "budget" | "learn";
type TourEndReason = "completed" | "skipped";

type TourContextType = {
  startHomeTour: () => void;
  startBudgetTour: () => void;
  startLearnTour: () => void;
  /** Mark budget tour as seen without starting. Use when zones are not ready after timeout. */
  skipBudgetTour: () => Promise<void>;
  /** Mark learn tour as seen without starting. Use when zones are not ready after timeout. */
  skipLearnTour: () => Promise<void>;
  /** null = not yet loaded from storage; false = never seen; true = has seen */
  hasSeenHomeTour: boolean | null;
  hasSeenBudgetTour: boolean | null;
  hasSeenLearnTour: boolean | null;
  valueFirstOnboardingEnabled: boolean;
  /** Clear tour seen flags. For __DEV__ testing only. */
  resetTourSeen: () => Promise<void>;
};

const TourContext = createContext<TourContextType | null>(null);

export const useTourContext = () => {
  const context = useContext(TourContext);
  if (!context)
    throw new Error("useTourContext must be used within TourProvider");
  return context;
};

const NO_OP_TOUR_CONTEXT: TourContextType = {
  startHomeTour: () => { },
  startBudgetTour: () => { },
  startLearnTour: () => { },
  skipBudgetTour: async () => { },
  skipLearnTour: async () => { },
  hasSeenHomeTour: null,
  hasSeenBudgetTour: null,
  hasSeenLearnTour: null,
  valueFirstOnboardingEnabled: false,
  resetTourSeen: async () => { },
};

/** Fallback when TourProvider throws. Provides no-op tour context so app continues. */
export function TourProviderFallback({ children }: { children: ReactNode }) {
  return (
    <TourContext.Provider value={NO_OP_TOUR_CONTEXT}>
      {children}
    </TourContext.Provider>
  );
}

export function TourProvider({ children }: { children: ReactNode }) {
  const activeTourRef = useRef<TourId>("home");

  // Ref for tour end handler - set by TourContextInnerWithRef when it mounts
  // Use a ref so the renderCard can call the latest handler.
  const onTourEndRef = useRef<(tour: TourId, reason: TourEndReason) => void>(
    () => { },
  );

  const renderCardWithHandler = useCallback(
    (props: CardProps) => {
      const wrappedNext = () => {
        if (props.step.key === "home-learn-tab") {
          router.replace("/(tabs)/literacy");
        }
        props.next();
      };

      const wrappedStop = () => {
        onTourEndRef.current(activeTourRef.current, "skipped");
        props.stop();
      };

      const wrappedNextForLast = () => {
        onTourEndRef.current(activeTourRef.current, "completed");
        props.next();
      };

      const endsTour =
        HOME_TOUR.endsAt.includes(props.step.key) ||
        BUDGET_TOUR.endsAt.includes(props.step.key) ||
        LEARN_TOUR.endsAt.includes(props.step.key);
      const isLastForCurrentTour = props.isLast || endsTour;

      const handleNext =
        props.step.key === "home-nav"
          ? () => {
            onTourEndRef.current("home", "completed");
            props.stop();
          }
          : isLastForCurrentTour
            ? wrappedNextForLast
            : wrappedNext;

      const card = (
        <CediTourCard
          {...props}
          isLast={isLastForCurrentTour}
          next={handleNext}
          prev={props.prev}
          stop={wrappedStop}
        />
      );

      if (props.step.key === "home-profile" || props.step.key === "home-learn-tab") {
        return (
          <View style={{ transform: [{ translateX: TOUR_CARD_OFFSET_X }] }}>
            {card}
          </View>
        );
      }

      return card;
    },
    [],
  );

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
        preventInteraction: false,
        tooltipStyles: {
          backgroundColor: "transparent",
        },
        zoneStyle: {
          borderWidth: tourTokens.zone.borderWidth,
          borderColor: tourTokens.zone.borderColor,
        },
      }}>
      <TourContextInnerWithRef onTourEndRef={onTourEndRef} activeTourRef={activeTourRef}>
        {children}
      </TourContextInnerWithRef>
    </LumenTourProvider>
  );
}

function TourContextInnerWithRef({
  children,
  onTourEndRef,
  activeTourRef,
}: {
  children: ReactNode;
  onTourEndRef: React.MutableRefObject<(tour: TourId, reason: TourEndReason) => void>;
  activeTourRef: React.MutableRefObject<TourId>;
}) {
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id;
  const { start } = useTour();

  const [hasSeenHomeTour, setHasSeenHomeTour] = useState<boolean | null>(null);
  const [hasSeenBudgetTour, setHasSeenBudgetTour] = useState<boolean | null>(
    null,
  );
  const [hasSeenLearnTour, setHasSeenLearnTour] = useState<boolean | null>(null);
  const [valueFirstOnboardingEnabled, setValueFirstOnboardingEnabled] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadState() {
      if (authLoading) return;
      if (!userId) {
        if (!mounted) return;
        setHasSeenHomeTour(null);
        setHasSeenBudgetTour(null);
        setHasSeenLearnTour(null);
        setValueFirstOnboardingEnabled(false);
        return;
      }

      const [homeSeen, budgetSeen, learnSeen, valueFirstEnabled] = await Promise.all([
        readTourSeen(userId, "home"),
        readTourSeen(userId, "budget"),
        readTourSeen(userId, "learn"),
        isValueFirstOnboardingEnabled(userId),
      ]);

      if (!mounted) return;
      setHasSeenHomeTour(homeSeen);
      setHasSeenBudgetTour(budgetSeen);
      setHasSeenLearnTour(learnSeen);
      setValueFirstOnboardingEnabled(valueFirstEnabled);
    }

    void loadState();
    return () => {
      mounted = false;
    };
  }, [authLoading, userId]);

  const promptBudgetHandoff = useCallback(() => {
    if (!userId) return;
    analytics.tourHandoffHomeToBudget({ userId });
    Alert.alert(
      "Continue onboarding?",
      "Next up: a quick Budget tour. You can skip anytime.",
      [
        {
          text: "Skip",
          style: "cancel",
          onPress: () => {
            analytics.tourHandoffSkip({ userId, from: "home", to: "budget" });
          },
        },
        {
          text: "Continue",
          onPress: () => {
            analytics.tourHandoffAccept({ userId, from: "home", to: "budget" });
            router.replace("/(tabs)/budget?tour=budget");
          },
        },
      ],
      { cancelable: true },
    );
  }, [userId]);

  const promptLearnHandoff = useCallback(() => {
    if (!userId) return;
    analytics.tourHandoffBudgetToLearn({ userId });
    Alert.alert(
      "One last quick tour",
      "Want a short Learn tour to see lessons and glossary?",
      [
        {
          text: "Skip",
          style: "cancel",
          onPress: () => {
            analytics.tourHandoffSkip({ userId, from: "budget", to: "learn" });
          },
        },
        {
          text: "Continue",
          onPress: () => {
            analytics.tourHandoffAccept({ userId, from: "budget", to: "learn" });
            router.replace("/(tabs)/literacy?tour=learn");
          },
        },
      ],
      { cancelable: true },
    );
  }, [userId]);

  const handleTourEnd = useCallback(
    (tour: TourId, reason: TourEndReason) => {
      if (!userId) return;

      void writeTourSeen(userId, tour);

      if (tour === "home") setHasSeenHomeTour(true);
      if (tour === "budget") {
        setHasSeenBudgetTour(true);
        if (reason === "completed") analytics.tourCompletedCoreBudget({ userId });
        if (reason === "skipped") analytics.tourSkippedCoreBudget({ userId });
      }
      if (tour === "learn") setHasSeenLearnTour(true);

      if (!valueFirstOnboardingEnabled || reason !== "completed") return;

      if (tour === "home" && hasSeenBudgetTour === false) {
        promptBudgetHandoff();
      }

      if (tour === "budget" && hasSeenLearnTour === false) {
        promptLearnHandoff();
      }
    },
    [
      hasSeenBudgetTour,
      hasSeenLearnTour,
      promptBudgetHandoff,
      promptLearnHandoff,
      userId,
      valueFirstOnboardingEnabled,
    ],
  );

  useEffect(() => {
    onTourEndRef.current = handleTourEnd;
  }, [handleTourEnd, onTourEndRef]);

  const startHomeTour = useCallback(() => {
    if (valueFirstOnboardingEnabled && userId) {
      analytics.onboardingValueFirstStart({ userId });
    }
    activeTourRef.current = "home";
    setTimeout(() => start(HOME_TOUR.firstStep), TOUR_START_DELAY_MS);
  }, [activeTourRef, start, userId, valueFirstOnboardingEnabled]);

  const startBudgetTour = useCallback(() => {
    activeTourRef.current = "budget";
    analytics.tourStartedCoreBudget({ userId });
    setTimeout(() => start(BUDGET_TOUR.firstStep), TOUR_START_DELAY_MS);
  }, [activeTourRef, start, userId]);

  const startLearnTour = useCallback(() => {
    activeTourRef.current = "learn";
    setTimeout(() => start(LEARN_TOUR.firstStep), TOUR_START_DELAY_MS);
  }, [activeTourRef, start]);

  const resetTourSeen = useCallback(async () => {
    if (!userId) return;
    await clearTourSeen(userId);
    setHasSeenHomeTour(false);
    setHasSeenBudgetTour(false);
    setHasSeenLearnTour(false);
  }, [userId]);

  const skipBudgetTour = useCallback(async () => {
    if (!userId) return;
    analytics.tourSkippedCoreBudget({ userId });
    await writeTourSeen(userId, "budget");
    setHasSeenBudgetTour(true);
  }, [userId]);

  const skipLearnTour = useCallback(async () => {
    if (!userId) return;
    await writeTourSeen(userId, "learn");
    setHasSeenLearnTour(true);
  }, [userId]);

  return (
    <TourContext.Provider
      value={{
        startHomeTour,
        startBudgetTour,
        startLearnTour,
        skipBudgetTour,
        skipLearnTour,
        hasSeenHomeTour,
        hasSeenBudgetTour,
        hasSeenLearnTour,
        valueFirstOnboardingEnabled,
        resetTourSeen,
      }}>
      {children}
    </TourContext.Provider>
  );
}
