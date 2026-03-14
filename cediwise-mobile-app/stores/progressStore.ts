import type { UserLessonProgress } from "@/types/literacy";
import { supabase } from "@/utils/supabase";
import { create } from "zustand";

export type ProgressStoreState = {
  userId: string | null;
  progress: Record<string, UserLessonProgress>;
  loading: boolean;
};

export type ProgressStoreActions = {
  initForUser: (userId: string | null) => Promise<void>;
  loadProgress: () => Promise<void>;
  saveProgress: (
    lessonId: string,
    completed: boolean,
    quizScore?: number
  ) => Promise<boolean>;
};

export type ProgressStore = ProgressStoreState & ProgressStoreActions;

export const useProgressStore = create<ProgressStore>((set, get) => ({
  userId: null,
  progress: {},
  loading: true,

  initForUser: async (userId: string | null) => {
    set({ userId, loading: true });
    if (!userId || !supabase) {
      set({ progress: {}, loading: false });
      return;
    }
    const startUserId = userId;
    try {
      const { data, error } = await supabase
        .from("user_lesson_progress")
        .select("*")
        .eq("user_id", startUserId);

      if (error) throw error;

      if (get().userId !== startUserId) return;

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
      set({ progress: byLesson });
    } catch {
      if (get().userId !== startUserId) return;
      set({ progress: {} });
    } finally {
      if (get().userId === startUserId) {
        set({ loading: false });
      }
    }
  },

  loadProgress: async () => {
    const { userId } = get();
    if (!userId || !supabase) {
      set({ progress: {}, loading: false });
      return;
    }
    const startUserId = userId;
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from("user_lesson_progress")
        .select("*")
        .eq("user_id", startUserId);

      if (error) throw error;

      if (get().userId !== startUserId) return;

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
      set({ progress: byLesson });
    } catch {
      if (get().userId !== startUserId) return;
      set({ progress: {} });
    } finally {
      if (get().userId === startUserId) {
        set({ loading: false });
      }
    }
  },

  saveProgress: async (
    lessonId: string,
    completed: boolean,
    quizScore?: number
  ): Promise<boolean> => {
    const { userId } = get();
    if (!userId || !supabase) return false;

    try {
      const payload = {
        user_id: userId,
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
      await get().loadProgress();
      return true;
    } catch {
      return false;
    }
  },
}));
