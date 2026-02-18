import { useAuth } from "@/hooks/useAuth";
import type { UserLessonProgress } from "@/types/literacy";
import { supabase } from "@/utils/supabase";
import { useCallback, useEffect, useState } from "react";

export function useProgress() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<Record<string, UserLessonProgress>>(
    {}
  );
  const [loading, setLoading] = useState(true);

  const loadProgress = useCallback(async () => {
    if (!user?.id || !supabase) {
      setProgress({});
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_lesson_progress")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;

      const byLesson: Record<string, UserLessonProgress> = {};
      for (const row of data ?? []) {
        byLesson[row.lesson_id] = {
          id: row.id,
          userId: row.user_id,
          lessonId: row.lesson_id,
          completedAt: row.completed_at,
          quizScore: row.quiz_score,
          quizAttemptedAt: row.quiz_attempted_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      }
      setProgress(byLesson);
    } catch {
      setProgress({});
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const saveProgress = useCallback(
    async (lessonId: string, completed: boolean, quizScore?: number) => {
      if (!user?.id || !supabase) return;

      try {
        const payload = {
          user_id: user.id,
          lesson_id: lessonId,
          completed_at: completed ? new Date().toISOString() : null,
          quiz_score: quizScore ?? null,
          quiz_attempted_at:
            quizScore != null ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from("user_lesson_progress")
          .upsert(payload, { onConflict: "user_id,lesson_id" });

        if (error) throw error;
        await loadProgress();
      } catch {
        // Silent fail for offline
      }
    },
    [user?.id, loadProgress]
  );

  const isCompleted = useCallback(
    (lessonId: string) => progress[lessonId]?.completedAt != null,
    [progress]
  );

  const getQuizScore = useCallback(
    (lessonId: string) => progress[lessonId]?.quizScore ?? null,
    [progress]
  );

  return {
    progress,
    loading,
    saveProgress,
    isCompleted,
    getQuizScore,
    refetch: loadProgress,
  };
}
