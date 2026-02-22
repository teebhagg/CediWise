"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type FeedbackRow = {
  id: string;
  user_id: string;
  lesson_id: string;
  rating: number | null;
  feedback_type: string | null;
  comment: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
};

export type ListFeedbackResult = { data: FeedbackRow[]; total: number };

export async function listFeedback(
  lessonId?: string,
  resolved?: boolean,
  page = 1,
  perPage = 20
): Promise<ListFeedbackResult> {
  const admin = createAdminClient();
  let baseQuery = admin.from("lesson_feedback").select("*", { count: "exact" });
  if (lessonId) baseQuery = baseQuery.eq("lesson_id", lessonId);
  if (resolved !== undefined) baseQuery = baseQuery.eq("is_resolved", resolved);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const { data, error, count } = await baseQuery
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw new Error(error.message);
  const total = count ?? (data ?? []).length;
  return { data: (data ?? []) as FeedbackRow[], total };
}

export async function resolveFeedback(id: string): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("lesson_feedback")
    .update({ is_resolved: true, resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/learning-data");
  revalidatePath("/learning-data/feedback");
  revalidatePath("/notifications");
  return {};
}
