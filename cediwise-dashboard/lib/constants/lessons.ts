export const LESSON_MODULES = [
  "MOD-01",
  "MOD-02",
  "MOD-03",
  "MOD-04",
  "MOD-05",
  "MOD-06",
  "MOD-07",
  "MOD-08",
  "MOD-09",
] as const;

export const LESSON_DIFFICULTIES = [
  "beginner",
  "intermediate",
  "advanced",
] as const;

export type LessonModule = (typeof LESSON_MODULES)[number];
export type LessonDifficulty = (typeof LESSON_DIFFICULTIES)[number];
