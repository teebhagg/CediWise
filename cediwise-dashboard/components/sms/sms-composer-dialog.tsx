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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  SmsAudienceType,
  SmsRecipientInput,
  SmsSource,
} from "@/lib/actions/sms";
import { queueSmsCampaign } from "@/lib/actions/sms";
import {
  getRemainingChars,
  getSegmentCount,
  SINGLE_SMS_LIMIT,
  SMS_TEMPLATES,
  templateOptions,
  type SmsTemplateKey,
} from "@/components/sms/sms-template-data";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface SmsComposerDialogProps {
  triggerLabel: string;
  recipients?: Array<SmsRecipientInput>;
  audienceType: SmsAudienceType;
  source: SmsSource;
  title?: string;
  description?: string;
  triggerVariant?: "default" | "outline" | "ghost";
  triggerSize?: "sm" | "default";
  onSent?: () => void;
}

export function SmsComposerDialog({
  triggerLabel,
  recipients = [],
  audienceType,
  source,
  title = "Send SMS",
  description = "Send an SMS message to phone-auth users.",
  triggerVariant = "outline",
  triggerSize = "sm",
  onSent,
}: SmsComposerDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [templateKey, setTemplateKey] = useState<SmsTemplateKey>("general_update");
  const [message, setMessage] = useState(SMS_TEMPLATES.general_update.message);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function applyTemplate(key: SmsTemplateKey) {
    setTemplateKey(key);
    setMessage(SMS_TEMPLATES[key].message);
  }

  const segmentCount = getSegmentCount(message);
  const remainingChars = getRemainingChars(message);
  const isOverLimit = message.length > SINGLE_SMS_LIMIT * 3;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!message.trim()) {
      setError("Message is required.");
      return;
    }

    if (message.length > 459) {
      setError("Message is too long (max 459 characters for 3-segment SMS).");
      return;
    }

    setLoading(true);
    try {
      const result = await queueSmsCampaign({
        templateKey,
        message: message.trim(),
        audienceType,
        recipients: recipients.filter((r) => r.phone),
        source,
      });

      const failedPart =
        result.failureCount > 0
          ? ` (${result.failureCount} failed)`
          : "";
      setSuccess(
        `Queued ${result.queued} SMS. ${result.successCount} sent${failedPart}.`
      );
      router.refresh();
      onSent?.();
      setTimeout(() => setOpen(false), 1500);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Failed to queue SMS campaign."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={triggerVariant} size={triggerSize} />}>
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {error ? <FieldError>{error}</FieldError> : null}
          {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="sms-template">Template</FieldLabel>
              <Select
                items={templateOptions}
                value={templateKey}
                onValueChange={(value) => {
                  if (!value) return;
                  applyTemplate(value as SmsTemplateKey);
                }}
              >
                <SelectTrigger id="sms-template">
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
              <FieldLabel htmlFor="sms-message">
                Message
                <span className="ml-2 text-xs text-muted-foreground">
                  {segmentCount} segment{segmentCount !== 1 ? "s" : ""}
                </span>
              </FieldLabel>
              <textarea
                id="sms-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                maxLength={459}
                rows={4}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                placeholder="Type your message here..."
              />
              <div className="mt-1 flex items-center justify-between text-xs">
                <span
                  className={
                    remainingChars < 0
                      ? "text-destructive"
                      : remainingChars < 30
                        ? "text-yellow-600"
                        : "text-muted-foreground"
                  }
                >
                  {remainingChars < 0
                    ? `${Math.abs(remainingChars)} over limit`
                    : `${remainingChars} characters remaining`}
                </span>
                <span className="text-muted-foreground">
                  {message.length}/459
                </span>
              </div>
            </Field>

            {recipients.length > 0 ? (
              <Field>
                <FieldLabel>Recipients ({recipients.length})</FieldLabel>
                <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/20 p-2">
                  {recipients.slice(0, 5).map((recipient, i) => (
                    <Badge key={i} variant="secondary">
                      {recipient.phone}
                    </Badge>
                  ))}
                  {recipients.length > 5 && (
                    <Badge variant="outline">
                      +{recipients.length - 5} more
                    </Badge>
                  )}
                </div>
              </Field>
            ) : null}
          </FieldGroup>

          <DialogFooter>
            <Button type="submit" disabled={loading || isOverLimit}>
              {loading ? "Sending..." : "Send SMS"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
