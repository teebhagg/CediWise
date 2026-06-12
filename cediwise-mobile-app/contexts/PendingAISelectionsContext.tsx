import type { AppliedAISelections } from "@/components/features/vitals/types";
import type { AIProfileSuggestions } from "@/types/ai";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type PendingAISelectionsState = {
  current: AppliedAISelections | null;
  rawSuggestions: AIProfileSuggestions | null;
  priorityExpenses: string[];
};

export type PendingAISelectionsContextValue = PendingAISelectionsState & {
  updateCurrent: (value: AppliedAISelections | null) => void;
  updateRawSuggestions: (value: AIProfileSuggestions | null) => void;
  updatePriorityExpenses: (value: string[]) => void;
  reset: () => void;
};

const PendingAISelectionsContext =
  createContext<PendingAISelectionsContextValue | null>(null);

export function PendingAISelectionsProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<AppliedAISelections | null>(null);
  const [rawSuggestions, setRawSuggestions] = useState<AIProfileSuggestions | null>(
    null,
  );
  const [priorityExpenses, setPriorityExpenses] = useState<string[]>([]);

  const updateCurrent = useCallback((value: AppliedAISelections | null) => {
    setCurrent(value);
  }, []);

  const updateRawSuggestions = useCallback((value: AIProfileSuggestions | null) => {
    setRawSuggestions(value);
  }, []);

  const updatePriorityExpenses = useCallback((value: string[]) => {
    setPriorityExpenses(value);
  }, []);

  const reset = useCallback(() => {
    setCurrent(null);
    setRawSuggestions(null);
    setPriorityExpenses([]);
  }, []);

  const value = useMemo<PendingAISelectionsContextValue>(
    () => ({
      current,
      rawSuggestions,
      priorityExpenses,
      updateCurrent,
      updateRawSuggestions,
      updatePriorityExpenses,
      reset,
    }),
    [
      current,
      rawSuggestions,
      priorityExpenses,
      updateCurrent,
      updateRawSuggestions,
      updatePriorityExpenses,
      reset,
    ],
  );

  return (
    <PendingAISelectionsContext.Provider value={value}>
      {children}
    </PendingAISelectionsContext.Provider>
  );
}

export function usePendingAISelections(): PendingAISelectionsContextValue {
  const ctx = useContext(PendingAISelectionsContext);
  if (ctx == null) {
    throw new Error(
      "usePendingAISelections must be used within a PendingAISelectionsProvider",
    );
  }
  return ctx;
}
