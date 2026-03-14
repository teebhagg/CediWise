import { useAuth } from "@/hooks/useAuth";
import { useProgressStore } from "@/stores/progressStore";
import { useCallback, useEffect } from "react";

export function useProgress() {
  const { user } = useAuth();
  const { progress, loading, saveProgress, loadProgress } = useProgressStore();

  useEffect(() => {
    void useProgressStore.getState().initForUser(user?.id ?? null);
  }, [user?.id]);

  const isCompleted = useCallback(
    (lessonId: string) => progress[lessonId]?.completedAt != null,
    [progress]
  );

  const getQuizScore = useCallback(
    (lessonId: string) => progress[lessonId]?.quizScore ?? null,
    [progress]
  );

  const refetch = useCallback(() => {
    return useProgressStore.getState().loadProgress();
  }, []);

  return {
    progress,
    loading,
    saveProgress,
    isCompleted,
    getQuizScore,
    refetch,
  };
}
