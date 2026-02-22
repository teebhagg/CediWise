"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type ProgressRow = {
  id: string;
  user_id: string;
  lesson_id: string;
  completed_at: string | null;
  quiz_score: number | null;
  quiz_attempted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ListProgressResult = { data: ProgressRow[]; total: number };

export async function listProgress(
  userId?: string,
  lessonId?: string,
  page = 1,
  perPage = 20
): Promise<ListProgressResult> {
  const admin = createAdminClient();
  let baseQuery = admin
    .from("user_lesson_progress")
    .select("*", { count: "exact" });
  if (userId) baseQuery = baseQuery.eq("user_id", userId);
  if (lessonId) baseQuery = baseQuery.eq("lesson_id", lessonId);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const { data, error, count } = await baseQuery
    .order("updated_at", { ascending: false })
    .range(from, to);
  if (error) throw new Error(error.message);
  const total = count ?? (data ?? []).length;
  return { data: (data ?? []) as ProgressRow[], total };
}
