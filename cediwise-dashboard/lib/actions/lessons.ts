"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  LessonContentJson,
  LessonInsert,
  LessonRow,
} from "@/lib/types/lessons";
import { revalidatePath } from "next/cache";

export type ListLessonsResult = { data: LessonRow[]; total: number };

export async function listLessons(
  module?: string,
  difficulty?: string,
  page = 1,
  perPage = 20
): Promise<ListLessonsResult> {
  const admin = createAdminClient();
  let baseQuery = admin
    .from("lessons")
    .select(
      "id, title, module, difficulty, duration_minutes, languages, tags, content_url, calculator_id, version, last_updated",
      { count: "exact" }
    );
  if (module) baseQuery = baseQuery.eq("module", module);
  if (difficulty) baseQuery = baseQuery.eq("difficulty", difficulty);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const { data, error, count } = await baseQuery
    .order("module")
    .order("id")
    .range(from, to);
  if (error) throw new Error(error.message);
  const total = count ?? (data ?? []).length;
  return { data: (data ?? []) as LessonRow[], total };
}

export async function getLesson(id: string): Promise<LessonRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("lessons")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as LessonRow | null;
}

export async function createLesson(
  row: LessonInsert
): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const payload = {
    id: row.id,
    title: row.title,
    module: row.module,
    difficulty: row.difficulty,
    duration_minutes: row.duration_minutes,
    languages: row.languages ?? ["en"],
    tags: row.tags ?? [],
    content_url: row.content_url ?? null,
    calculator_id: row.calculator_id ?? null,
    sources: row.sources ?? [],
    verified_by: row.verified_by ?? null,
    version: row.version,
    last_updated: row.last_updated,
  };
  const { error } = await admin.from("lessons").insert(payload);
  if (error) return { error: error.message };
  revalidatePath("/learning-data");
  revalidatePath("/learning-data/lessons");
  return {};
}

export async function updateLesson(
  id: string,
  updates: Partial<LessonInsert>
): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const row: Record<string, unknown> = {};
  if (updates.title !== undefined) row.title = updates.title;
  if (updates.module !== undefined) row.module = updates.module;
  if (updates.difficulty !== undefined) row.difficulty = updates.difficulty;
  if (updates.duration_minutes !== undefined)
    row.duration_minutes = updates.duration_minutes;
  if (updates.languages !== undefined) row.languages = updates.languages;
  if (updates.tags !== undefined) row.tags = updates.tags;
  if (updates.content_url !== undefined) row.content_url = updates.content_url;
  if (updates.calculator_id !== undefined)
    row.calculator_id = updates.calculator_id;
  if (updates.version !== undefined) row.version = updates.version;
  row.last_updated = new Date().toISOString();
  const { error } = await admin.from("lessons").update(row).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/learning-data");
  revalidatePath("/learning-data/lessons");
  revalidatePath(`/learning-data/lessons/${id}`);
  return {};
}

export async function updateLessonContent(
  id: string,
  content: LessonContentJson | null
): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("lessons")
    .update({
      content,
      last_updated: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/learning-data");
  revalidatePath("/learning-data/lessons");
  revalidatePath(`/learning-data/lessons/${id}`);
  return {};
}

export async function deleteLesson(id: string): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin.from("lessons").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/learning-data");
  revalidatePath("/learning-data/lessons");
  return {};
}
