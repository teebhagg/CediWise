import type { LessonDifficulty, LessonModule } from "@/lib/constants/lessons";

export type { LessonDifficulty, LessonModule };

/** Structured lesson content (same format as bundledLessons.json) */
export type LessonContentJson = {
  schema_version: string;
  sections: unknown[];
};

export type LessonRow = {
  id: string;
  title: string;
  module: string;
  difficulty: string;
  duration_minutes: number;
  languages: string[];
  tags: string[];
  content_url: string | null;
  calculator_id: string | null;
  version: string;
  last_updated: string;
  content?: LessonContentJson | null;
};

export type LessonInsert = {
  id: string;
  title: string;
  module: LessonModule;
  difficulty: LessonDifficulty;
  duration_minutes: number;
  languages?: string[];
  tags?: string[];
  content_url?: string | null;
  calculator_id?: string | null;
  sources?: unknown[];
  verified_by?: unknown;
  version: string;
  last_updated: string;
};
