"use server";

import { isAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { SmsTemplateKey } from "@/components/sms/sms-template-data";
import { personalizeMessage } from "@/components/sms/sms-template-data";

export type SmsAudienceType = "single" | "selected_users";
export type SmsSource = "users_tab" | "user_profile" | "sms_section";

export type SmsRecipientInput = {
  userId?: string;
  phone: string;
  name?: string;
};

export type QueueSmsCampaignInput = {
  templateKey: SmsTemplateKey;
  message: string;
  audienceType: SmsAudienceType;
  recipients: Array<SmsRecipientInput>;
  source: SmsSource;
};

export type SmsCampaignRow = {
  id: string;
  template_key: SmsTemplateKey;
  message: string;
  recipient_count: number;
  success_count: number;
  failure_count: number;
  status: "queued" | "sending" | "sent" | "failed" | "partial_failed";
  source: SmsSource;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
};

const PHONE_REGEX = /^\+?[0-9]{9,15}$/;
const SEND_DELAY_MS = 1200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePhone(value: string): string {
  return value.replace(/[\s\-()]/g, "").trim();
}

function formatPhoneForApi(phone: string): string {
  const normalized = normalizePhone(phone);
  if (normalized.startsWith("0")) {
    return "+233" + normalized.slice(1);
  }
  if (normalized.startsWith("233")) {
    return "+" + normalized;
  }
  if (!normalized.startsWith("+")) {
    return "+" + normalized;
  }
  return normalized;
}

function isValidPhone(value: string): boolean {
  const normalized = normalizePhone(value);
  return PHONE_REGEX.test(normalized);
}

function sanitizeText(value: string) {
  return value.replace(/\u0000/g, "").trim();
}

async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const adminAllowed = await isAdmin(user.id, user.email ?? undefined);
  if (!adminAllowed) throw new Error("Unauthorized");

  return user;
}

function validateInput(input: QueueSmsCampaignInput) {
  const message = sanitizeText(input.message);
  if (!message) throw new Error("Message is required");
  if (message.length > 459) {
    throw new Error("Message is too long (max 459 characters for 3-segment SMS)");
  }

  const deduped = new Map<string, SmsRecipientInput>();
  for (const recipient of input.recipients) {
    const phone = formatPhoneForApi(recipient.phone);
    if (!phone || !isValidPhone(phone)) continue;
    if (!deduped.has(phone)) {
      deduped.set(phone, {
        userId: recipient.userId,
        phone,
        name: recipient.name?.trim() || undefined,
      });
    }
  }

  if (deduped.size === 0) {
    throw new Error("At least one valid recipient phone is required");
  }

  return {
    message,
    recipients: Array.from(deduped.values()),
  };
}

export async function buildRecipientsFromUserIds(userIds: Array<string>) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0) {
    return {
      recipients: [],
      skipped: [] as Array<{ userId: string; reason: string }>,
    };
  }

  const admin = createAdminClient();
  const { data: authData, error } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });
  if (error) throw new Error(error.message);

  const byId = new Map(authData.users.map((u) => [u.id, u]));
  const recipients: Array<SmsRecipientInput> = [];
  const skipped: Array<{ userId: string; reason: string }> = [];

  for (const userId of ids) {
    const user = byId.get(userId);
    if (!user) {
      skipped.push({ userId, reason: "User not found" });
      continue;
    }

    const phone = (user as { phone?: string }).phone;
    if (!phone || !isValidPhone(phone)) {
      skipped.push({ userId, reason: "No valid phone number" });
      continue;
    }

    const meta = (user as { user_metadata?: Record<string, unknown> })
      .user_metadata;
    const name =
      (meta?.full_name as string) ?? (meta?.name as string) ?? undefined;

    recipients.push({ userId, phone: formatPhoneForApi(phone), name });
  }

  return { recipients, skipped };
}

async function sendSmsViaAgoo(
  phone: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.AGOO_SMS_API_KEY;
  if (!apiKey) {
    throw new Error("SMS service not configured (AGOO_SMS_API_KEY missing)");
  }

  const response = await fetch("https://api.agoosms.com/v1/sms/send", {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: phone,
      message,
      // senderId: "CEDIWISE",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { success: false, error: errorText };
  }

  const data = (await response.json()) as {
    success: boolean;
    data?: { messageId: string };
  };

  if (!data.success) {
    return { success: false, error: "AgooSMS returned failure" };
  }

  return { success: true, messageId: data.data?.messageId };
}

export async function queueSmsCampaign(input: QueueSmsCampaignInput) {
  const user = await requireAdminUser();
  const validated = validateInput(input);
  const admin = createAdminClient();

  const { data: campaign, error: campaignError } = await admin
    .from("sms_campaigns")
    .insert({
      template_key: input.templateKey,
      message: validated.message,
      audience_type: input.audienceType,
      recipient_count: validated.recipients.length,
      success_count: 0,
      failure_count: 0,
      status: "queued",
      created_by: user.id,
      source: input.source,
    })
    .select("id")
    .single<{ id: string }>();

  if (campaignError || !campaign) {
    throw new Error(campaignError?.message ?? "Failed to create SMS campaign");
  }

  let successCount = 0;
  let failureCount = 0;

  for (const [index, recipient] of validated.recipients.entries()) {
    const personalizedText = personalizeMessage(validated.message, recipient.name);
    const result = await sendSmsViaAgoo(recipient.phone, personalizedText);

    if (result.success) {
      successCount++;
    } else {
      failureCount++;
    }

    await admin.from("sms_recipients").insert({
      campaign_id: campaign.id,
      user_id: recipient.userId ?? null,
      phone: recipient.phone,
      recipient_name: recipient.name ?? null,
      delivery_status: result.success ? "sent" : "failed",
      provider_message_id: result.messageId ?? null,
      error_message: result.error ?? null,
    });

    if (index < validated.recipients.length - 1) {
      await sleep(SEND_DELAY_MS);
    }
  }

  const finalStatus =
    failureCount === 0
      ? "sent"
      : successCount === 0
        ? "failed"
        : "partial_failed";

  await admin
    .from("sms_campaigns")
    .update({
      success_count: successCount,
      failure_count: failureCount,
      status: finalStatus,
      sent_at: new Date().toISOString(),
    })
    .eq("id", campaign.id);

  revalidatePath("/sms");
  revalidatePath("/users");

  return {
    campaignId: campaign.id,
    queued: validated.recipients.length,
    successCount,
    failureCount,
  };
}

export async function listSmsCampaigns(page = 1, perPage = 20) {
  await requireAdminUser();
  const admin = createAdminClient();

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, error, count } = await admin
    .from("sms_campaigns")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  return {
    data: (data ?? []) as Array<SmsCampaignRow>,
    total: count ?? 0,
  };
}
