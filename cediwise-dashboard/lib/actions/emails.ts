"use server";

import { isAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { htmlToText } from "html-to-text";
import { revalidatePath } from "next/cache";
import sanitizeHtml from "sanitize-html";

export type EmailTemplateKey =
  | "general_update"
  | "support_response"
  | "feedback_followup"
  | "join_beta";
export type EmailAudienceType = "single" | "selected_users" | "feedback_reply";
export type EmailSource = "users_tab" | "user_profile" | "app_feedback" | "emails_section";

export type EmailRecipientInput = {
  userId?: string;
  email: string;
  name?: string;
};

export type QueueEmailCampaignInput = {
  templateKey: EmailTemplateKey;
  subject: string;
  messageBodyHtml: string;
  messageBodyText?: string;
  messageBody?: string;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  audienceType: EmailAudienceType;
  recipients: Array<EmailRecipientInput>;
  source: EmailSource;
  sourceFeedbackId?: string | null;
};

export type EmailCampaignRow = {
  id: string;
  template_key: EmailTemplateKey;
  subject: string;
  message_body: string;
  message_body_html: string;
  message_body_text: string;
  cta_label: string | null;
  cta_url: string | null;
  audience_type: EmailAudienceType;
  recipient_count: number;
  success_count: number;
  failure_count: number;
  status: "queued" | "sending" | "sent" | "failed" | "partial_failed";
  source: EmailSource;
  source_feedback_id: string | null;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
};

export type EmailRecipientRow = {
  id: string;
  campaign_id: string;
  user_id: string | null;
  email: string;
  recipient_name: string | null;
  delivery_status: "queued" | "sent" | "failed" | "bounced" | "complained";
  provider_message_id: string | null;
  error_code: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SANITIZE_CONFIG: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "em", "u", "h2", "h3", "ul", "ol", "li", "blockquote", "a"],
  allowedAttributes: {
    a: ["href"],
  },
  allowedSchemes: ["https"],
  allowProtocolRelative: false,
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return EMAIL_REGEX.test(value);
}

function sanitizeText(value: string) {
  return value.replace(/\u0000/g, "").trim();
}

function sanitizeBodyHtml(rawHtml: string) {
  const sanitized = sanitizeHtml(rawHtml, SANITIZE_CONFIG).trim();
  const plain = htmlToText(sanitized, {
    wordwrap: false,
    selectors: [{ selector: "a", options: { hideLinkHrefIfSameAsText: true } }],
  }).trim();

  if (!plain) {
    throw new Error("Message body is required");
  }

  return { sanitizedHtml: sanitized, plainText: plain };
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

async function enforceRateLimit(adminUserId: string) {
  const admin = createAdminClient();
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count, error } = await admin
    .from("email_campaigns")
    .select("id", { count: "exact", head: true })
    .eq("created_by", adminUserId)
    .gte("created_at", since);

  if (error) throw new Error(error.message);
  if ((count ?? 0) >= 10) {
    throw new Error("Too many email sends in a short period. Please wait a minute and try again.");
  }
}

function validateInput(input: QueueEmailCampaignInput) {
  const subject = sanitizeText(input.subject);
  if (!subject) throw new Error("Subject is required");
  if (subject.length > 160) throw new Error("Subject is too long");

  const fallbackBody = sanitizeText(input.messageBody ?? "");
  const htmlInput = input.messageBodyHtml?.trim() || (fallbackBody ? `<p>${fallbackBody}</p>` : "");
  const { sanitizedHtml, plainText } = sanitizeBodyHtml(htmlInput);

  if (plainText.length > 5000) throw new Error("Message body is too long");

  const ctaLabel = sanitizeText(input.ctaLabel ?? "");
  const ctaUrl = sanitizeText(input.ctaUrl ?? "");
  if (ctaUrl && !ctaUrl.startsWith("https://")) {
    throw new Error("CTA URL must start with https://");
  }

  const deduped = new Map<string, EmailRecipientInput>();
  for (const recipient of input.recipients) {
    const email = normalizeEmail(recipient.email);
    if (!email || !isValidEmail(email)) continue;
    if (!deduped.has(email)) {
      deduped.set(email, {
        userId: recipient.userId,
        email,
        name: recipient.name?.trim() || undefined,
      });
    }
  }

  if (deduped.size === 0) {
    throw new Error("At least one valid recipient email is required");
  }

  return {
    subject,
    messageBody: plainText,
    messageBodyHtml: sanitizedHtml,
    messageBodyText: plainText,
    ctaLabel: ctaLabel || null,
    ctaUrl: ctaUrl || null,
    recipients: Array.from(deduped.values()),
  };
}

export async function buildRecipientsFromUserIds(userIds: Array<string>) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0)
    return { recipients: [], skipped: [] as Array<{ userId: string; reason: string }> };

  const admin = createAdminClient();
  const { data: authData, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(error.message);

  const byId = new Map(authData.users.map((u) => [u.id, u]));
  const recipients: Array<EmailRecipientInput> = [];
  const skipped: Array<{ userId: string; reason: string }> = [];

  for (const userId of ids) {
    const user = byId.get(userId);
    if (!user) {
      skipped.push({ userId, reason: "User not found" });
      continue;
    }

    const email = normalizeEmail(user.email ?? "");
    if (!email || !isValidEmail(email)) {
      skipped.push({ userId, reason: "No valid email" });
      continue;
    }

    const meta = (user as { user_metadata?: Record<string, unknown> }).user_metadata;
    const name = (meta?.full_name as string) ?? (meta?.name as string) ?? undefined;

    recipients.push({ userId, email, name });
  }

  return { recipients, skipped };
}

export async function buildRecipientFromFeedback(feedbackId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("feedback")
    .select("id,email")
    .eq("id", feedbackId)
    .maybeSingle<{ id: string; email: string }>();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Feedback not found");

  const email = normalizeEmail(data.email);
  if (!isValidEmail(email)) throw new Error("Feedback email is invalid");

  return { userId: undefined, email, name: undefined } as EmailRecipientInput;
}

export async function queueEmailCampaign(input: QueueEmailCampaignInput) {
  const user = await requireAdminUser();
  await enforceRateLimit(user.id);

  const validated = validateInput(input);
  const admin = createAdminClient();

  const { data: campaign, error: campaignError } = await admin
    .from("email_campaigns")
    .insert({
      template_key: input.templateKey,
      subject: validated.subject,
      message_body: validated.messageBody,
      message_body_html: validated.messageBodyHtml,
      message_body_text: validated.messageBodyText,
      cta_label: validated.ctaLabel,
      cta_url: validated.ctaUrl,
      audience_type: input.audienceType,
      recipient_count: validated.recipients.length,
      success_count: 0,
      failure_count: 0,
      status: "queued",
      created_by: user.id,
      source: input.source,
      source_feedback_id: input.sourceFeedbackId ?? null,
    })
    .select("id")
    .single<{ id: string }>();

  if (campaignError || !campaign) {
    throw new Error(campaignError?.message ?? "Failed to create email campaign");
  }

  const recipientRows = validated.recipients.map((recipient) => ({
    campaign_id: campaign.id,
    user_id: recipient.userId ?? null,
    email: recipient.email,
    recipient_name: recipient.name ?? null,
    delivery_status: "queued",
  }));

  const { error: recipientsError } = await admin.from("email_recipients").insert(recipientRows);
  if (recipientsError) {
    throw new Error(recipientsError.message);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase service credentials");
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/send-email-campaign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
    body: JSON.stringify({ campaign_id: campaign.id }),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    await admin
      .from("email_campaigns")
      .update({ status: "failed", error_message: message.slice(0, 300) })
      .eq("id", campaign.id);
    throw new Error("Email campaign queued but sending failed to start.");
  }

  revalidatePath("/emails");
  revalidatePath("/users");
  revalidatePath("/feedback");

  return {
    campaignId: campaign.id,
    queued: validated.recipients.length,
  };
}

export async function listEmailCampaigns(page = 1, perPage = 20) {
  await requireAdminUser();
  const admin = createAdminClient();

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, error, count } = await admin
    .from("email_campaigns")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  return {
    data: (data ?? []) as Array<EmailCampaignRow>,
    total: count ?? 0,
  };
}

export async function listEmailRecipients(campaignId: string, page = 1, perPage = 20) {
  await requireAdminUser();
  const admin = createAdminClient();

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, error, count } = await admin
    .from("email_recipients")
    .select("*", { count: "exact" })
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  return {
    data: (data ?? []) as Array<EmailRecipientRow>,
    total: count ?? 0,
  };
}
