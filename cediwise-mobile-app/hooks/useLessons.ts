import bundledContent from "@/content/bundledLessons.json";
import { useLessonsStore } from "@/stores/lessonsStore";
import { useCallback, useEffect } from "react";

type BundledContentMap = Record<string, unknown>;

export function useLessons() {
  const { lessons, loading, error, loadLessons } = useLessonsStore();

  useEffect(() => {
    void loadLessons();
  }, [loadLessons]);

  const refetch = useCallback(() => {
    return useLessonsStore.getState().loadLessons();
  }, []);

  return { lessons, loading, error, refetch };
}

export function getBundledContent(lessonId: string): unknown | null {
  const content = bundledContent as BundledContentMap;
  return content[lessonId] ?? null;
}
