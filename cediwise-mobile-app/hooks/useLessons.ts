import { LESSON_MAP } from "@/constants/lessons";
import { MODULES } from "@/constants/literacy";
import type { Lesson } from "@/types/literacy";
import { supabase } from "@/utils/supabase";
import { useCallback, useEffect, useState } from "react";

import bundledContent from "@/content/bundledLessons.json";

type BundledContentMap = Record<string, unknown>;

const MODULE_IDS = MODULES.map((m) => m.id);

export function useLessons() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLessons = useCallback(async () => {
    setLoading(true);
    setError(null);
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
        const mapped: Lesson[] = rows.map((row) => ({
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
          setLessons(getBundledFallbackLessons());
        } else {
          setLessons(mapped);
        }
      } else {
        setLessons(getBundledFallbackLessons());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load lessons");
      setLessons(getBundledFallbackLessons());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLessons();
  }, [loadLessons]);

  return { lessons, loading, error, refetch: loadLessons };
}

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

export function getBundledContent(lessonId: string): unknown | null {
  const content = bundledContent as BundledContentMap;
  return content[lessonId] ?? null;
}
