import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Campaign = {
  id: string;
  template_key: "general_update" | "support_response" | "feedback_followup" | "join_beta";
  subject: string;
  message_body: string;
  message_body_html: string | null;
  message_body_text: string | null;
  cta_label: string | null;
  cta_url: string | null;
  status: "queued" | "sending" | "sent" | "failed" | "partial_failed";
};

type Recipient = {
  id: string;
  user_id: string | null;
  email: string;
  recipient_name: string | null;
};

type SenderConfig = {
  senderName: string;
  senderEmail: string;
  logoUrl: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function paragraphize(value: string) {
  return value
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map(
      (chunk) =>
        `<p style=\"margin:0 0 14px;color:#E4E4E7;line-height:1.72;font-size:15px;\">${escapeHtml(chunk).replaceAll("\n", "<br />")}</p>`,
    )
    .join("\n");
}

function getSenderConfig(): SenderConfig {
  const senderName = Deno.env.get("EMAIL_SENDER_NAME") || "Joshua Ansah";
  const senderEmail = Deno.env.get("EMAIL_SENDER_EMAIL") || "joshua.ansah@cediwise.app";
  const logoUrl =
    Deno.env.get("EMAIL_LOGO_URL") ||
    "https://cediwise.app/cediwise-smooth-light-logo.png";

  return {
    senderName,
    senderEmail,
    logoUrl,
  };
}

function renderEmailTemplate(
  campaign: Campaign,
  recipient: Recipient,
  sender: SenderConfig,
) {
  const name = recipient.recipient_name?.trim() || "there";
  const preheader =
    campaign.template_key === "feedback_followup"
      ? "Thanks for helping improve CediWise"
      : campaign.template_key === "support_response"
        ? "A quick update from CediWise support"
        : campaign.template_key === "join_beta"
          ? "Join the CediWise beta in 2 minutes"
          : "An update from CediWise";

  const ctaBlock = campaign.cta_url
    ? `<a href=\"${escapeHtml(campaign.cta_url)}\" style=\"display:inline-block;padding:12px 20px;border-radius:999px;background:#34D399;color:#052E22;text-decoration:none;font-weight:700;font-size:14px;\">${escapeHtml(campaign.cta_label || "Open CediWise")}</a>`
    : "";

  const bodyHtml = campaign.message_body_html?.trim() || paragraphize(campaign.message_body || "");
  const bodyText = campaign.message_body_text?.trim() || campaign.message_body || "";

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#070A09;font-family:Inter,Segoe UI,Arial,sans-serif;">
    <span style="display:none;opacity:0;visibility:hidden;height:0;width:0;overflow:hidden;">${escapeHtml(preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 14px;background:#070A09;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;border:1px solid #1F2937;border-radius:22px;overflow:hidden;background:#0E1210;box-shadow:0 24px 60px rgba(0,0,0,0.35);">
            <tr>
              <td style="padding:22px 24px;background:linear-gradient(180deg, rgba(16,185,129,0.20), rgba(16,185,129,0.04));border-bottom:1px solid #1F2937;">
                <div style="text-align:center;">
                  <img src="${escapeHtml(sender.logoUrl)}" alt="CediWise" width="40" height="40" style="display:block;border-radius:10px;margin:0 auto 10px;" />
                  <div style="font-size:20px;font-weight:800;color:#ECFEF6;letter-spacing:-0.2px;">CediWise</div>
                  <div style="font-size:11px;color:#9CA3AF;margin-top:4px;">Smart money decisions for Ghana</div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 24px 10px;">
                <h1 style="margin:0 0 12px;color:#F4F4F5;font-size:24px;line-height:1.3;letter-spacing:-0.25px;">${escapeHtml(campaign.subject)}</h1>
                <p style="margin:0 0 14px;color:#D4D4D8;font-size:15px;line-height:1.7;">Hi ${escapeHtml(name)},</p>
                ${bodyHtml}
                ${ctaBlock ? `<div style=\"margin-top:18px;\">${ctaBlock}</div>` : ""}
                <p style="margin:18px 0 0;color:#D4D4D8;font-size:15px;line-height:1.7;">
                  Best regards,<br />
                  ${escapeHtml(sender.senderName)}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 24px 24px;border-top:1px solid #1F2937;">
                <p style="margin:0;color:#A1A1AA;font-size:12px;line-height:1.7;">
                  You are receiving this email because you interacted with CediWise.
                </p>
                <p style="margin:10px 0 0;color:#71717A;font-size:11px;line-height:1.7;">
                  Disclaimer: If this message is not intended for you, please ignore this email.
                </p>
                <p style="margin:10px 0 0;color:#71717A;font-size:11px;line-height:1.7;">
                  CediWise • cediwise.app
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `CediWise`,
    "",
    `Hi ${name},`,
    "",
    bodyText,
    campaign.cta_url
      ? `${campaign.cta_label || "Open CediWise"}: ${campaign.cta_url}`
      : "",
    "",
    `Best regards,`,
    sender.senderName,
    "",
    "You are receiving this email because you interacted with CediWise.",
    "Disclaimer: If this message is not intended for you, please ignore this email.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: campaign.subject,
    html,
    text,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const campaignId = body?.campaign_id;

    if (!campaignId || typeof campaignId !== "string") {
      return jsonResponse({ error: "campaign_id is required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const emailFromAddress = Deno.env.get("EMAIL_FROM_ADDRESS");
    const emailReplyTo = Deno.env.get("EMAIL_REPLY_TO") || "joshua.ansah@cediwise.app";

    if (!supabaseUrl || !serviceRoleKey || !resendApiKey || !emailFromAddress) {
      return jsonResponse({ error: "Server misconfigured" }, 503);
    }

    const sender = getSenderConfig();
    const fromAddress = `${sender.senderName} <${emailFromAddress}>`;

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: campaign, error: campaignError } = await admin
      .from("email_campaigns")
      .select("id,template_key,subject,message_body,message_body_html,message_body_text,cta_label,cta_url,status")
      .eq("id", campaignId)
      .maybeSingle<Campaign>();

    if (campaignError || !campaign) {
      return jsonResponse({ error: campaignError?.message ?? "Campaign not found" }, 404);
    }

    if (campaign.status === "sent") {
      return jsonResponse({ campaign_id: campaignId, attempted: 0, success: 0, failed: 0, status: "sent" });
    }

    if (campaign.status !== "queued" && campaign.status !== "sending") {
      return jsonResponse({ error: `Campaign status '${campaign.status}' is not sendable` }, 409);
    }

    await admin
      .from("email_campaigns")
      .update({ status: "sending", error_message: null })
      .eq("id", campaignId);

    const { data: recipients, error: recipientsError } = await admin
      .from("email_recipients")
      .select("id,user_id,email,recipient_name")
      .eq("campaign_id", campaignId)
      .eq("delivery_status", "queued");

    if (recipientsError) {
      await admin
        .from("email_campaigns")
        .update({ status: "failed", error_message: recipientsError.message })
        .eq("id", campaignId);
      return jsonResponse({ error: recipientsError.message }, 500);
    }

    const rows = (recipients ?? []) as Array<Recipient>;

    let attempted = 0;
    let success = 0;
    let failed = 0;

    for (const recipient of rows) {
      attempted += 1;
      const rendered = renderEmailTemplate(campaign, recipient, sender);

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [recipient.email],
          reply_to: emailReplyTo,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
        }),
      });

      if (!resendRes.ok) {
        const text = await resendRes.text();
        failed += 1;
        await admin
          .from("email_recipients")
          .update({
            delivery_status: "failed",
            error_code: `http_${resendRes.status}`,
            error_message: text.slice(0, 300),
          })
          .eq("id", recipient.id);
        continue;
      }

      const payload = await resendRes.json();
      success += 1;
      await admin
        .from("email_recipients")
        .update({
          delivery_status: "sent",
          provider_message_id: typeof payload?.id === "string" ? payload.id : null,
          sent_at: new Date().toISOString(),
        })
        .eq("id", recipient.id);
    }

    const status = failed === 0 ? "sent" : success > 0 ? "partial_failed" : "failed";

    await admin
      .from("email_campaigns")
      .update({
        status,
        success_count: success,
        failure_count: failed,
        sent_at: new Date().toISOString(),
        error_message: failed > 0 ? "One or more emails failed" : null,
      })
      .eq("id", campaignId);

    return jsonResponse({
      campaign_id: campaignId,
      attempted,
      success,
      failed,
      status,
    });
  } catch (error) {
    console.error("send-email-campaign failed", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
