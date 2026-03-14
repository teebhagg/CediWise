import { LESSON_MAP } from "@/constants/lessons";
import { MODULES } from "@/constants/literacy";
import type { Lesson } from "@/types/literacy";
import { supabase } from "@/utils/supabase";
import { create } from "zustand";

const MODULE_IDS = MODULES.map((m) => m.id);

function getBundledFallbackLessons(): Lesson[] {
  return MODULES.flatMap((mod) =>
    mod.lessonIds.map((id) => {
      const def = LESSON_MAP[id];
      if (def) return def;
      return {
        id,
        title: id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        module: mod.id,
        difficulty: "beginner" as const,
        duration_minutes: 10,
        languages: ["en"],
        tags: [],
        content_url: null,
        calculator_id: null,
        sources: [],
        verified_by: null,
        version: "1.0.0",
        last_updated: "2026-02-17",
      };
    })
  );
}

export type LessonsStoreState = {
  lessons: Lesson[];
  loading: boolean;
  error: string | null;
};

export type LessonsStoreActions = {
  loadLessons: () => Promise<void>;
};

export type LessonsStore = LessonsStoreState & LessonsStoreActions;

export const useLessonsStore = create<LessonsStore>((set) => ({
  lessons: [],
  loading: true,
  error: null,

  loadLessons: async () => {
    set({ loading: true, error: null });
    try {
      if (supabase) {
        const { data, error: sbError } = await supabase
          .from("lessons")
          .select("*")
          .in("module", MODULE_IDS)
          .order("module")
          .order("id");

        if (sbError) throw sbError;

        const rows = data ?? [];
        const mapped: Lesson[] = rows.map((row: any) => ({
          id: row.id,
          title: row.title,
          module: row.module,
          difficulty: row.difficulty,
          duration_minutes: row.duration_minutes,
          languages: row.languages ?? ["en"],
          tags: row.tags ?? [],
          content_url: row.content_url,
          calculator_id: row.calculator_id,
          sources: row.sources ?? [],
          verified_by: row.verified_by,
          version: row.version,
          last_updated: row.last_updated,
          content: row.content ?? null,
        }));

        if (mapped.length === 0) {
          set({ lessons: getBundledFallbackLessons() });
        } else {
          set({ lessons: mapped });
        }
      } else {
        set({ lessons: getBundledFallbackLessons() });
      }
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Failed to load lessons",
        lessons: getBundledFallbackLessons(),
      });
    } finally {
      set({ loading: false });
    }
  },
}));
