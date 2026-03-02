"use server";

import { isAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type AnnouncementCampaignRow = {
  id: string;
  title: string;
  body: string;
  deep_link: string | null;
  status: "draft" | "queued" | "sending" | "sent" | "failed";
  sent_at: string | null;
  attempted_count: number;
  success_count: number;
  failure_count: number;
  error_message: string | null;
  created_at: string;
};

export async function listAnnouncementCampaigns(
  page = 1,
  perPage = 20
): Promise<{ data: AnnouncementCampaignRow[]; total: number }> {
  const admin = createAdminClient();
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, error, count } = await admin
    .from("announcement_campaigns")
    .select(
      "id, title, body, deep_link, status, sent_at, attempted_count, success_count, failure_count, error_message, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  return {
    data: (data ?? []) as AnnouncementCampaignRow[],
    total: count ?? (data ?? []).length,
  };
}

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

export async function sendAnnouncementNow(input: {
  title: string;
  body: string;
  deepLink?: string | null;
}): Promise<{ campaignId: string; queued: number; status: string; error?: string }> {
  try {
    if (process.env.ENABLE_ADMIN_ANNOUNCEMENTS === "false") {
      return {
        campaignId: "",
        queued: 0,
        status: "failed",
        error: "Announcements are disabled by configuration",
      };
    }

    const user = await requireAdminUser();

    const title = input.title.trim();
    const body = input.body.trim();
    const deepLink = (input.deepLink ?? "").trim();

    if (!title || !body) {
      return {
        campaignId: "",
        queued: 0,
        status: "failed",
        error: "Title and body are required",
      };
    }

    if (deepLink && !deepLink.startsWith("/")) {
      return {
        campaignId: "",
        queued: 0,
        status: "failed",
        error: "Deep link must start with '/'",
      };
    }

    const adminClient = createAdminClient();

    const { data: campaign, error: campaignError } = await adminClient
      .from("announcement_campaigns")
      .insert({
        title,
        body,
        deep_link: deepLink || null,
        audience_type: "all",
        status: "queued",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (campaignError || !campaign) {
      return {
        campaignId: "",
        queued: 0,
        status: "failed",
        error: campaignError?.message ?? "Failed to create campaign",
      };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return {
        campaignId: campaign.id,
        queued: 0,
        status: "failed",
        error: "Missing Supabase service credentials",
      };
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/send-announcement`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
      body: JSON.stringify({ campaign_id: campaign.id }),
      cache: "no-store",
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      await adminClient
        .from("announcement_campaigns")
        .update({
          status: "failed",
          error_message: typeof result?.error === "string" ? result.error : "Send function failed",
        })
        .eq("id", campaign.id);

      revalidatePath("/announcements");

      return {
        campaignId: campaign.id,
        queued: 0,
        status: "failed",
        error: typeof result?.error === "string" ? result.error : "Announcement send failed",
      };
    }

    revalidatePath("/announcements");

    return {
      campaignId: campaign.id,
      queued: Number(result?.attempted ?? 0),
      status: String(result?.status ?? "sent"),
    };
  } catch (error) {
    return {
      campaignId: "",
      queued: 0,
      status: "failed",
      error: error instanceof Error ? error.message : "Announcement send failed",
    };
  }
}
