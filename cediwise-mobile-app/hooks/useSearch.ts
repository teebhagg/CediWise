/**
 * useSearch — cross-content search with Ghanaian synonym expansion
 *
 * FR-SRC-001: search across lesson titles, descriptions, and glossary terms
 * FR-SRC-002: results categorised by type (Lessons, Modules, Glossary)
 * FR-SRC-003: partial-word matching + synonym expansion
 */

import { GLOSSARY, type GlossaryTerm } from "@/constants/glossary";
import { MODULES } from "@/constants/literacy";
import type { Lesson } from "@/types/literacy";
import { useMemo } from "react";

// ─── Ghanaian financial synonym map ──────────────────────────────────────────
// Searching any key expands to include all values in results.

const SYNONYMS: Record<string, string[]> = {
  momo: ["mobile money", "mtn momo", "vodafone cash", "airteltigo"],
  "mobile money": ["momo", "mtn momo", "vodafone cash"],
  susu: ["rosca", "rotating savings", "savings group", "informal savings"],
  rosca: ["susu", "rotating savings"],
  bog: ["bank of ghana", "central bank"],
  "bank of ghana": ["bog", "central bank"],
  gra: ["ghana revenue authority", "tax authority", "paye"],
  "tax authority": ["gra", "ghana revenue authority"],
  pension: ["ssnit", "tier 1", "tier 2", "tier 3", "npra", "retirement"],
  ssnit: ["pension", "tier 1", "retirement", "social security"],
  tax: ["paye", "gra", "tin", "vat", "nhil"],
  paye: ["tax", "income tax", "gra"],
  savings: ["susu", "emergency fund", "fixed deposit", "save"],
  invest: ["t-bill", "mutual fund", "gse", "bond", "shares", "investment"],
  investment: ["t-bill", "mutual fund", "gse", "bond", "shares"],
  "t-bill": ["treasury bill", "tbill", "91 day", "182 day", "364 day"],
  tbill: ["t-bill", "treasury bill"],
  "treasury bill": ["t-bill", "tbill"],
  fraud: ["scam", "419", "advance fee", "phishing", "ponzi", "sim swap"],
  scam: ["fraud", "419", "phishing", "ponzi"],
  insurance: ["nhis", "nic", "premium"],
  nhis: ["insurance", "health insurance", "national health"],
  stock: ["gse", "shares", "equity", "dividend"],
  shares: ["gse", "equity", "stock", "dividend"],
  gse: ["ghana stock exchange", "shares", "stock", "equity"],
  budget: ["budgeting", "spending plan", "50/30/20"],
  "50/30/20": ["budget", "needs", "wants", "savings"],
  emergency: ["emergency fund", "safety net"],
  retirement: ["pension", "ssnit", "tier 1", "tier 2", "tier 3", "npra"],
  loan: ["credit", "borrow", "debt", "repay"],
  credit: ["loan", "debt", "borrow"],
  debt: ["loan", "credit", "liability"],
  remittance: ["diaspora", "transfer", "international"],
  "e-levy": ["electronic levy", "transfer tax", "momo tax"],
  "sim swap": ["fraud", "mobile money fraud", "security"],
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type SearchResultLesson = {
  type: "lesson";
  id: string;
  title: string;
  moduleId: string;
  moduleTitle: string;
  duration_minutes: number;
};

export type SearchResultModule = {
  type: "module";
  id: string;
  title: string;
  description: string;
};

export type SearchResultGlossary = {
  type: "glossary";
  term: GlossaryTerm;
};

export type SearchResults = {
  lessons: SearchResultLesson[];
  modules: SearchResultModule[];
  glossary: SearchResultGlossary[];
  total: number;
};

// ─── Core search logic ────────────────────────────────────────────────────────

function expandQuery(raw: string): string[] {
  const q = raw.toLowerCase().trim();
  const synonymExpansions = SYNONYMS[q] ?? [];
  return [q, ...synonymExpansions];
}

function matches(haystack: string, queries: string[]): boolean {
  const h = haystack.toLowerCase();
  return queries.some((q) => h.includes(q));
}

export function searchAll(query: string, lessons: Lesson[]): SearchResults {
  if (!query.trim()) {
    return { lessons: [], modules: [], glossary: [], total: 0 };
  }

  const queries = expandQuery(query);

  // ── Lessons
  const lessonResults: SearchResultLesson[] = lessons
    .filter((l) => {
      const searchable = `${l.title} ${l.module} ${l.tags?.join(" ")} ${
        l.difficulty
      }`;
      return matches(searchable, queries);
    })
    .slice(0, 6)
    .map((l) => {
      const mod = MODULES.find((m) => m.id === l.module);
      return {
        type: "lesson" as const,
        id: l.id,
        title: l.title,
        moduleId: l.module,
        moduleTitle: mod?.title ?? l.module,
        duration_minutes: l.duration_minutes,
      };
    });

  // ── Modules
  const moduleResults: SearchResultModule[] = MODULES.filter((m) => {
    const searchable = `${m.title} ${
      m.description
    } ${m.learning_objectives?.join(" ")}`;
    return matches(searchable, queries);
  })
    .slice(0, 4)
    .map((m) => ({
      type: "module" as const,
      id: m.id,
      title: m.title,
      description: m.description,
    }));

  // ── Glossary
  const glossaryResults: SearchResultGlossary[] = GLOSSARY.filter((t) => {
    const searchable = `${t.term} ${t.full_form ?? ""} ${
      t.definition
    } ${t.tags.join(" ")}`;
    return matches(searchable, queries);
  })
    .slice(0, 8)
    .map((t) => ({ type: "glossary" as const, term: t }));

  const total =
    lessonResults.length + moduleResults.length + glossaryResults.length;

  return {
    lessons: lessonResults,
    modules: moduleResults,
    glossary: glossaryResults,
    total,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSearch(query: string, lessons: Lesson[]): SearchResults {
  return useMemo(() => searchAll(query, lessons), [query, lessons]);
}
