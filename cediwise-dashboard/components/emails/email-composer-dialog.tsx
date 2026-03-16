"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  EmailAudienceType,
  EmailRecipientInput,
  EmailSource,
  EmailTemplateKey,
} from "@/lib/actions/emails";
import { queueEmailCampaign } from "@/lib/actions/emails";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { RichEmailEditor } from "./rich-email-editor";

interface EmailComposerDialogProps {
  triggerLabel: string;
  recipients?: Array<EmailRecipientInput>;
  lockedRecipients?: boolean;
  audienceType: EmailAudienceType;
  source: EmailSource;
  sourceFeedbackId?: string;
  title?: string;
  description?: string;
  triggerVariant?: "default" | "outline" | "ghost";
  triggerSize?: "sm" | "default";
  onSent?: () => void;
  contextChips?: Array<string>;
}

const templateOptions: Array<{ label: string; value: EmailTemplateKey }> = [
  { label: "General update", value: "general_update" },
  { label: "New update (App)", value: "app_update" },
  { label: "Checking in (Satisfaction)", value: "customer_checkin" },
  { label: "Support response", value: "support_response" },
  { label: "Feedback follow-up", value: "feedback_followup" },
  { label: "Educational Tip", value: "educational_tip" },
  { label: "Maintenance Notice", value: "maintenance_notice" },
  { label: "Join Beta", value: "join_beta" },
];

const templateDefaults: Record<EmailTemplateKey, { subject: string; html: string; ctaLabel?: string; ctaUrl?: string }> = {
  general_update: {
    subject: "A quick update from CediWise",
    html: "<p>Thanks for being part of CediWise. We wanted to share a quick update with you.</p>",
  },
  app_update: {
    subject: "New features are now available on CediWise!",
    html: "<p>We've just released a new update for CediWise with improved features to help you manage your money better. Update your app now to enjoy the latest improvements.</p><p>If you cannot access the Application, you probably haven't joined the beta test yet. Do so at <a href='https://cediwise.app'>CediWise Website</a>, instructions to join are in the \"Join Beta Test\" button.</p><p>Don't forget to leave feedback, it helps us improve the application for you. Leave your feedback at <a href='https://cediwise.app/feedback'>CediWise Feedback :)</a></p>",
    ctaLabel: "Update App Now",
    ctaUrl: "https://play.google.com/store/apps/details?id=com.cediwise.app",
  },
  customer_checkin: {
    subject: "How is your experience with CediWise so far?",
    html: "<p>We're checking in to see how your experience with CediWise has been. Your satisfaction is our priority, and we'd love to hear if there's anything we can do to help you reach your financial goals faster.</p>",
    ctaLabel: "Share Feedback",
    ctaUrl: "https://cediwise.app",
  },
  support_response: {
    subject: "CediWise support update",
    html: "<p>Thanks for reaching out. Here is an update from our support team.</p>",
  },
  feedback_followup: {
    subject: "Thanks for your feedback on CediWise",
    html: "<p>Thank you for sharing your feedback. Your input helps us improve CediWise.</p>",
  },
  educational_tip: {
    subject: "A quick tip for your financial growth",
    html: "<p>Did you know that small consistent habits lead to big financial shifts? Here's a quick tip from our team to help you stay on track this week.</p>",
    ctaLabel: "Read More Tips",
    ctaUrl: "https://cediwise.app/blog",
  },
  maintenance_notice: {
    subject: "Scheduled Maintenance: CediWise App",
    html: "<p>We'll be performing a quick system maintenance to keep things running smoothly. The app might be temporarily unavailable during this period. We apologize for any inconvenience.</p>",
  },
  join_beta: {
    subject: "Join the CediWise Beta in 2 minutes",
    html: "<p>Thanks for your interest in the CediWise project, the mobile app is now available for closed testing in the Play Store (Beta).</p><h2>How to join</h2><ol><li>Click Join beta in the CediWise Website.</li><li>Join the CediWise Test Group on Google Group.</li><li>After joining the Group Opt In for Closed testing to download the app.</li></ol><p>If access fails, reply to this email and we will help you quickly.</p>",
    ctaLabel: "Join CediWise Beta",
    ctaUrl: "https://cediwise.app",
  },
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function dedupeRecipients(input: Array<EmailRecipientInput>) {
  const map = new Map<string, EmailRecipientInput>();
  for (const recipient of input) {
    const email = normalizeEmail(recipient.email);
    if (!EMAIL_REGEX.test(email)) continue;
    if (!map.has(email)) {
      map.set(email, {
        userId: recipient.userId,
        email,
        name: recipient.name?.trim() || undefined,
      });
    }
  }
  return Array.from(map.values());
}

export function EmailComposerDialog({
  triggerLabel,
  recipients = [],
  lockedRecipients = false,
  audienceType,
  source,
  sourceFeedbackId,
  title = "Send email",
  description = "Compose a branded email using CediWise templates.",
  triggerVariant = "outline",
  triggerSize = "sm",
  onSent,
  contextChips = [],
}: EmailComposerDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [templateKey, setTemplateKey] = useState<EmailTemplateKey>("general_update");
  const [subject, setSubject] = useState(templateDefaults.general_update.subject);
  const [messageBodyHtml, setMessageBodyHtml] = useState(templateDefaults.general_update.html);
  const [messageBodyText, setMessageBodyText] = useState("Thanks for being part of CediWise. We wanted to share a quick update with you.");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [manualRecipients, setManualRecipients] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fixedRecipients = useMemo(() => dedupeRecipients(recipients), [recipients]);

  const combinedRecipients = useMemo(() => {
    if (lockedRecipients) return fixedRecipients;

    const manual = manualRecipients
      .split(/[\n,;]+/)
      .map((email) => normalizeEmail(email))
      .filter(Boolean)
      .map((email) => ({ email } as EmailRecipientInput));

    return dedupeRecipients([...fixedRecipients, ...manual]);
  }, [fixedRecipients, lockedRecipients, manualRecipients]);

  function applyTemplate(nextTemplate: EmailTemplateKey) {
    const next = templateDefaults[nextTemplate];
    setTemplateKey(nextTemplate);
    setSubject(next.subject);
    setMessageBodyHtml(next.html);
    setMessageBodyText(next.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    setCtaLabel(next.ctaLabel || "");
    setCtaUrl(next.ctaUrl || "");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (combinedRecipients.length === 0) {
      setError("Add at least one valid recipient email.");
      return;
    }

    if (!messageBodyText.trim()) {
      setError("Message body is required.");
      return;
    }

    setLoading(true);
    try {
      const result = await queueEmailCampaign({
        templateKey,
        subject,
        messageBodyHtml,
        messageBodyText,
        messageBody: messageBodyText,
        ctaLabel: ctaLabel || null,
        ctaUrl: ctaUrl || null,
        audienceType,
        recipients: combinedRecipients,
        source,
        sourceFeedbackId: sourceFeedbackId ?? null,
      });

      setSuccess(`Queued ${result.queued} email${result.queued === 1 ? "" : "s"}.`);
      router.refresh();
      onSent?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to queue email campaign.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={triggerVariant} size={triggerSize} />}>
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[66vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {contextChips.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {contextChips.map((chip) => (
                <Badge key={chip} variant="outline">
                  {chip}
                </Badge>
              ))}
            </div>
          ) : null}
          {error ? <FieldError>{error}</FieldError> : null}
          {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email-template">Template</FieldLabel>
              <Select
                items={templateOptions}
                value={templateKey}
                onValueChange={(value) => {
                  if (!value) return;
                  applyTemplate(value as EmailTemplateKey);
                }}
              >
                <SelectTrigger id="email-template">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {templateOptions.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="email-subject">Subject</FieldLabel>
              <Input
                id="email-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                maxLength={160}
                required
              />
            </Field>

            <div className="flex items-center gap-2">
              <Button type="button" variant={mode === "edit" ? "default" : "outline"} size="sm" onClick={() => setMode("edit")}>
                Edit
              </Button>
              <Button type="button" variant={mode === "preview" ? "default" : "outline"} size="sm" onClick={() => setMode("preview")}>
                Preview
              </Button>
            </div>

            {mode === "edit" ? (
              <Field>
                <FieldLabel>Email body</FieldLabel>
                <RichEmailEditor
                  value={messageBodyHtml}
                  onChange={(html, text) => {
                    setMessageBodyHtml(html);
                    setMessageBodyText(text);
                  }}
                />
              </Field>
            ) : (
              <Field>
                <FieldLabel>Email preview</FieldLabel>
                <div className="rounded-xl border border-input bg-[#070A09] p-4 text-[#D4D4D8] scheme-dark">
                  <div className="mb-4 rounded-lg border border-[#1F2937] bg-[#0E1210] p-3 text-center">
                    <Image
                      src="https://cediwise.app/cediwise-smooth-light-logo.png"
                      alt="CediWise"
                      width={40}
                      height={40}
                      className="mx-auto mb-2 rounded-md"
                    />
                    <p className="text-lg font-bold text-[#ECFEF6]">CediWise</p>
                    <p className="text-xs text-[#9CA3AF]">Smart money decisions for Ghana</p>
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-[#F4F4F5]">{subject}</h3>
                  <div
                    className="prose prose-sm max-w-none prose-invert [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_blockquote]:border-l [&_blockquote]:border-[#1F2937] [&_blockquote]:pl-3 [&_blockquote]:italic [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:text-[#F4F4F5] [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-[#F4F4F5] [&_p]:text-[#D4D4D8] [&_li]:text-[#D4D4D8] [&_strong]:text-[#F4F4F5]"
                    dangerouslySetInnerHTML={{ __html: messageBodyHtml }}
                  />
                  {ctaUrl ? (
                    <div className="mt-4">
                      <a href={ctaUrl} className="inline-flex rounded-full bg-[#34D399] px-4 py-2 text-sm font-bold text-[#052E22] no-underline">
                        {ctaLabel || "Open CediWise"}
                      </a>
                    </div>
                  ) : null}
                </div>
              </Field>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="email-cta-label">CTA label (optional)</FieldLabel>
                <Input
                  id="email-cta-label"
                  value={ctaLabel}
                  onChange={(event) => setCtaLabel(event.target.value)}
                  maxLength={40}
                  placeholder="Open CediWise"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="email-cta-url">CTA URL (optional)</FieldLabel>
                <Input
                  id="email-cta-url"
                  value={ctaUrl}
                  onChange={(event) => setCtaUrl(event.target.value)}
                  placeholder="https://cediwise.app"
                />
              </Field>
            </div>

            <Field>
              <FieldLabel>Recipients ({combinedRecipients.length})</FieldLabel>
              {fixedRecipients.length > 0 ? (
                <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/20 p-2">
                  {fixedRecipients.map((recipient) => (
                    <Badge key={recipient.email} variant="secondary">
                      {recipient.email}
                    </Badge>
                  ))}
                </div>
              ) : null}

              {!lockedRecipients ? (
                <textarea
                  value={manualRecipients}
                  onChange={(event) => setManualRecipients(event.target.value)}
                  rows={3}
                  placeholder="Enter one or more emails separated by commas or new lines"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              ) : null}
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Queuing..." : "Queue Emails"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
