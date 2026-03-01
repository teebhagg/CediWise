import { CediTourCard } from "@/components/tour/CediTourCard";
import {
  BUDGET_TOUR,
  HOME_TOUR,
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
import { View } from "react-native";
import {
  TourProvider as LumenTourProvider,
  useTour,
  type CardProps,
} from "react-native-lumen";
import { useAuth } from "../hooks/useAuth";
import {
  clearTourSeen,
  readTourSeen,
  writeTourSeen,
} from "../utils/tourStorage";

type TourContextType = {
  startHomeTour: () => void;
  startBudgetTour: () => void;
  /** Mark budget tour as seen without starting. Use when zones are not ready after timeout. */
  skipBudgetTour: () => Promise<void>;
  /** null = not yet loaded from storage; false = never seen; true = has seen */
  hasSeenHomeTour: boolean | null;
  hasSeenBudgetTour: boolean | null;
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
  skipBudgetTour: async () => { },
  hasSeenHomeTour: null,
  hasSeenBudgetTour: null,
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
  const activeTourRef = useRef<"home" | "budget">("home");

  // Ref for tour end handler - set by TourContextInnerWithRef when it mounts
  // Use a ref so the renderCard can call the latest handler.
  const onTourEndRef = useRef<(tour: "home" | "budget") => void>(() => { });

  const renderCardWithHandler = useCallback(
    (props: CardProps) => {
      const wrappedNext = () => {
        if (props.step.key === "home-learn-tab") {
          router.replace("/(tabs)/literacy");
        }
        props.next();
      };

      const wrappedStop = () => {
        onTourEndRef.current(activeTourRef.current);
        props.stop();
      };

      const wrappedNextForLast = () => {
        if (props.isLast) {
          onTourEndRef.current(activeTourRef.current);
        }
        props.next();
      };

      const endsTour =
        HOME_TOUR.endsAt.includes(props.step.key) ||
        BUDGET_TOUR.endsAt.includes(props.step.key);
      const isLastForCurrentTour = props.isLast || endsTour;

      const handleNext =
        props.step.key === "home-nav"
          ? () => {
            onTourEndRef.current("home");
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
  onTourEndRef: React.MutableRefObject<(tour: "home" | "budget") => void>;
  activeTourRef: React.MutableRefObject<"home" | "budget">;
}) {
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id;
  const { start } = useTour();

  const [hasSeenHomeTour, setHasSeenHomeTour] = useState<boolean | null>(null);
  const [hasSeenBudgetTour, setHasSeenBudgetTour] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    if (authLoading) return;
    if (userId) {
      readTourSeen(userId, "home").then(setHasSeenHomeTour);
      readTourSeen(userId, "budget").then(setHasSeenBudgetTour);
    }
  }, [userId, authLoading]);

  const handleTourEnd = useCallback(
    (tour: "home" | "budget") => {
      if (userId) {
        writeTourSeen(userId, tour);
        if (tour === "home") setHasSeenHomeTour(true);
        else setHasSeenBudgetTour(true);
      }
    },
    [userId],
  );

  useEffect(() => {
    onTourEndRef.current = handleTourEnd;
  }, [handleTourEnd, onTourEndRef]);

  const startHomeTour = useCallback(() => {
    activeTourRef.current = "home";
    setTimeout(() => start(HOME_TOUR.firstStep), TOUR_START_DELAY_MS);
  }, [start, activeTourRef]);

  const startBudgetTour = useCallback(() => {
    activeTourRef.current = "budget";
    setTimeout(() => start(BUDGET_TOUR.firstStep), TOUR_START_DELAY_MS);
  }, [start, activeTourRef]);

  const resetTourSeen = useCallback(async () => {
    if (!userId) return;
    await clearTourSeen(userId);
    setHasSeenHomeTour(false);
    setHasSeenBudgetTour(false);
  }, [userId]);

  const skipBudgetTour = useCallback(async () => {
    if (!userId) return;
    await writeTourSeen(userId, "budget");
    setHasSeenBudgetTour(true);
  }, [userId]);

  return (
    <TourContext.Provider
      value={{
        startHomeTour,
        startBudgetTour,
        skipBudgetTour,
        hasSeenHomeTour,
        hasSeenBudgetTour,
        resetTourSeen,
      }}>
      {children}
    </TourContext.Provider>
  );
}
