"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import {
  isWebsiteReportStatus,
  type WebsiteReportCategory,
  type WebsiteReportEmailStatus,
  type WebsiteReportStatus,
} from "@/lib/reports/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type WebsiteReportRecord = {
  id: string;
  category: WebsiteReportCategory;
  reporter_name: string | null;
  reporter_email: string;
  message: string;
  page: string | null;
  source: string;
  status: WebsiteReportStatus;
  email_status: WebsiteReportEmailStatus;
  email_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WebsiteReportFilters = {
  status?: WebsiteReportStatus;
  category?: WebsiteReportCategory;
  emailStatus?: WebsiteReportEmailStatus;
  search?: string;
};

export type ListWebsiteReportsResult = { data: WebsiteReportRecord[]; total: number };

async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const admin = await isAdmin(user.id, user.email ?? undefined);
  if (!admin) {
    throw new Error("Unauthorized");
  }

  return user;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Strip characters that would break the PostgREST `or` filter syntax. */
function sanitizeSearch(value: string) {
  return value.replace(/[,()*%]/g, " ").replace(/\s+/g, " ").trim();
}

export async function listWebsiteReports(
  filters: WebsiteReportFilters,
  page = 1,
  perPage = 20,
): Promise<ListWebsiteReportsResult> {
  await requireAdminUser();
  const admin = createAdminClient();

  let query = admin.from("website_reports").select("*", { count: "exact" });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.emailStatus) query = query.eq("email_status", filters.emailStatus);

  const search = filters.search ? sanitizeSearch(filters.search) : "";
  if (search) {
    query = query.or(`reporter_email.ilike.%${search}%,message.ilike.%${search}%`);
  }

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  return {
    data: (data ?? []) as WebsiteReportRecord[],
    total: count ?? 0,
  };
}

export async function updateWebsiteReportStatus(
  reportId: string,
  status: string,
): Promise<{ success: true }> {
  await requireAdminUser();

  if (!isWebsiteReportStatus(status)) {
    throw new Error("Unknown report status.");
  }

  if (!UUID_PATTERN.test(reportId)) {
    throw new Error("Unknown report.");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("website_reports")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", reportId);

  if (error) throw new Error(error.message);

  revalidatePath("/reports");
  return { success: true };
}
