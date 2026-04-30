"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type FeedbackCategory = "bug_report" | "feature_request" | "general_comment";

export type FeedbackRecord = {
  id: string;
  category: FeedbackCategory;
  rating: number;
  feedback_text: string;
  email: string;
  is_beta: boolean;
  version: string;
  source: string;
  created_at: string;
};

export type FeedbackListFilters = {
  category?: FeedbackCategory;
  rating?: number;
  isBeta?: boolean;
  fromDate?: string;
  toDate?: string;
  search?: string;
  /** e.g. `mobile_app` for in-app submissions */
  source?: string;
};

export type ListFeedbackResult = { data: FeedbackRecord[]; total: number };

export async function listFeedback(
  filters: FeedbackListFilters,
  page = 1,
  perPage = 20
): Promise<ListFeedbackResult> {
  const admin = createAdminClient();

  let query = admin.from("feedback").select("*", { count: "exact" });

  if (filters.category) query = query.eq("category", filters.category);
  if (filters.rating) query = query.eq("rating", filters.rating);
  if (typeof filters.isBeta === "boolean") query = query.eq("is_beta", filters.isBeta);
  if (filters.source) query = query.eq("source", filters.source);
  if (filters.fromDate) query = query.gte("created_at", `${filters.fromDate}T00:00:00.000Z`);
  if (filters.toDate) query = query.lte("created_at", `${filters.toDate}T23:59:59.999Z`);
  if (filters.search) {
    const q = filters.search.trim();
    if (q) {
      query = query.or(`email.ilike.%${q}%,feedback_text.ilike.%${q}%`);
    }
  }

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  return {
    data: (data ?? []) as FeedbackRecord[],
    total: count ?? 0,
  };
}
