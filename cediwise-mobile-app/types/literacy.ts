export type LessonDifficulty = "beginner" | "intermediate" | "advanced";

export type LessonModule =
  | "MOD-01"
  | "MOD-02"
  | "MOD-03"
  | "MOD-04"
  | "MOD-05"
  | "MOD-06"
  | "MOD-07"
  | "MOD-08"
  | "MOD-09";

export type LessonSource = {
  organization: string;
  snapshot_id?: string;
  url?: string;
};

export type LessonVerifiedBy = {
  name: string;
  credential: string;
};

export type Lesson = {
  id: string;
  title: string;
  module: LessonModule;
  difficulty: LessonDifficulty;
  duration_minutes: number;
  languages: string[];
  tags: string[];
  content_url?: string | null;
  calculator_id?: string | null;
  sources: LessonSource[];
  verified_by?: LessonVerifiedBy | null;
  version: string;
  last_updated: string;
  /** Structured content from DB; falls back to bundled if null */
  content?: LessonContent | null;
};

export type UserLessonProgress = {
  id: string;
  userId: string;
  lessonId: string;
  completedAt?: string | null;
  quizScore?: number | null;
  quizAttemptedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ModuleDifficulty = "foundational" | "intermediate" | "advanced";

export type ModuleInfo = {
  id: LessonModule;
  title: string;
  description: string;
  icon: string;
  lessonIds: string[];
  /** Difficulty level — drives the badge colour */
  level: ModuleDifficulty;
  /** Approximate total minutes for all lessons */
  estimated_minutes: number;
  /** Hex accent colour for this module's header */
  color: string;
  /** 3–5 bullet learning objectives shown on the overview screen */
  learning_objectives: string[];
  /** Next recommended module ID after completing this one */
  next_module_id?: LessonModule;
};

export type QuizQuestion = {
  /** Stable unique ID for analytics tracking (FR-QZ-012) */
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  /** Shown after the user answers — correct or wrong (FR-QZ-002) */
  explanation: string;
  /** Shown only after a correct FIRST-attempt answer (FR-QZ-013) */
  did_you_know?: string;
  /** Optional citation for the correct answer (FR-QZ-002) */
  source?: { label: string; url?: string };
};

/** Score-tier labels and messages per FR-QZ-021 */
export type QuizScoreTier = "excellent" | "good" | "review";

export type QuizResult = {
  score: number; // 0–1 fraction
  tier: QuizScoreTier;
  correctCount: number;
  totalCount: number;
};

// ─── Structured Lesson Content ───────────────────────────────────────────────

export type ContentSource = {
  label: string;
  url?: string;
};

export type LessonSection =
  | { type: "text"; content: string }
  | { type: "heading"; level: 1 | 2 | 3; content: string }
  | { type: "divider" }
  | {
      type: "callout_stat" | "callout_tip" | "callout_warning" | "callout_law";
      content: string;
      source?: ContentSource;
    }
  | {
      type: "table";
      caption?: string;
      headers: string[];
      rows: string[][];
    }
  | {
      type: "example";
      title: string;
      content: string;
    }
  | {
      type: "comparison";
      left: { label: string; points: string[] };
      right: { label: string; points: string[] };
    }
  | {
      type: "cta_link";
      label: string;
      destination: string;
      description?: string;
    }
  | {
      type: "glossary_term";
      term: string;
      definition: string;
      source?: ContentSource;
    };

export type StructuredLesson = {
  schema_version: "1.0";
  sections: LessonSection[];
};

/** A lesson's content is either legacy Markdown (string) or structured JSON */
export type LessonContent = string | StructuredLesson;
