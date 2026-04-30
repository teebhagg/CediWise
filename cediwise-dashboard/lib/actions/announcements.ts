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
  audience_type: string;
  target_user_id: string | null;
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
      "id, title, body, deep_link, audience_type, target_user_id, status, sent_at, attempted_count, success_count, failure_count, error_message, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Partial<AnnouncementCampaignRow>[];
  return {
    data: rows.map((r) => ({
      ...r,
      audience_type: r.audience_type ?? "all",
      target_user_id: r.target_user_id ?? null,
    })) as AnnouncementCampaignRow[],
    total: count ?? rows.length,
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

type SendAnnouncementResult = {
  campaignId: string;
  queued: number;
  status: string;
  error?: string;
};

async function queueAnnouncementAndSend(options: {
  title: string;
  body: string;
  deepLink: string | null;
  audienceType: "all" | "single_user";
  targetUserId: string | null;
  revalidatePaths: string[];
}): Promise<SendAnnouncementResult> {
  if (process.env.ENABLE_ADMIN_ANNOUNCEMENTS === "false") {
    return {
      campaignId: "",
      queued: 0,
      status: "failed",
      error: "Announcements are disabled by configuration",
    };
  }

  const user = await requireAdminUser();

  const title = options.title.trim();
  const body = options.body.trim();
  const deepLink = options.deepLink?.trim() ?? "";

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

  if (options.audienceType === "single_user" && !options.targetUserId) {
    return {
      campaignId: "",
      queued: 0,
      status: "failed",
      error: "User is required for targeted push",
    };
  }

  const adminClient = createAdminClient();

  const { data: campaign, error: campaignError } = await adminClient
    .from("announcement_campaigns")
    .insert({
      title,
      body,
      deep_link: deepLink || null,
      audience_type: options.audienceType,
      target_user_id: options.targetUserId,
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

    for (const p of options.revalidatePaths) {
      revalidatePath(p);
    }

    return {
      campaignId: campaign.id,
      queued: 0,
      status: "failed",
      error: typeof result?.error === "string" ? result.error : "Announcement send failed",
    };
  }

  for (const p of options.revalidatePaths) {
    revalidatePath(p);
  }

  return {
    campaignId: campaign.id,
    queued: Number(result?.attempted ?? 0),
    status: String(result?.status ?? "sent"),
  };
}

export async function sendAnnouncementNow(input: {
  title: string;
  body: string;
  deepLink?: string | null;
}): Promise<SendAnnouncementResult> {
  try {
    return await queueAnnouncementAndSend({
      title: input.title,
      body: input.body,
      deepLink: input.deepLink ?? null,
      audienceType: "all",
      targetUserId: null,
      revalidatePaths: ["/announcements"],
    });
  } catch (error) {
    return {
      campaignId: "",
      queued: 0,
      status: "failed",
      error: error instanceof Error ? error.message : "Announcement send failed",
    };
  }
}

/** Push announcement to a single user’s registered devices only. */
/** Permanently remove a campaign, delivery rows (CASCADE), and mobile read receipts (CASCADE). */
export async function deleteAnnouncementCampaign(
  campaignId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdminUser();
    const id = campaignId.trim();
    if (!id) {
      return { ok: false, error: "Invalid campaign id" };
    }

    const admin = createAdminClient();
    const { error, count } = await admin
      .from("announcement_campaigns")
      .delete({ count: "exact" })
      .eq("id", id);

    if (error) {
      return { ok: false, error: error.message };
    }
    if (count === 0) {
      return { ok: false, error: "Campaign not found or already deleted" };
    }

    revalidatePath("/announcements");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Delete failed",
    };
  }
}

export async function sendAnnouncementToUser(input: {
  targetUserId: string;
  title: string;
  body: string;
  deepLink?: string | null;
}): Promise<SendAnnouncementResult> {
  try {
    const uid = input.targetUserId.trim();
    if (!uid) {
      return {
        campaignId: "",
        queued: 0,
        status: "failed",
        error: "User id is required",
      };
    }

    return await queueAnnouncementAndSend({
      title: input.title,
      body: input.body,
      deepLink: input.deepLink ?? null,
      audienceType: "single_user",
      targetUserId: uid,
      revalidatePaths: ["/announcements", `/users/${uid}`],
    });
  } catch (error) {
    return {
      campaignId: "",
      queued: 0,
      status: "failed",
      error: error instanceof Error ? error.message : "Announcement send failed",
    };
  }
}
