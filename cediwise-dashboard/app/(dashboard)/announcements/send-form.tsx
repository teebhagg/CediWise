"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { sendAnnouncementNow } from "@/lib/actions/announcements";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AnnouncementComposer() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [deepLink, setDeepLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const result = await sendAnnouncementNow({
      title,
      body,
      deepLink: deepLink || null,
    });

    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccess(`Announcement sent. Attempted ${result.queued} devices.`);
    setTitle("");
    setBody("");
    setDeepLink("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {success && <p className="text-sm text-emerald-600">{success}</p>}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="announcement-title">Title</FieldLabel>
          <Input
            id="announcement-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Budget reminder"
            required
            maxLength={120}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="announcement-body">Body</FieldLabel>
          <textarea
            id="announcement-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Remember to track your expenses today."
            required
            maxLength={500}
            className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="announcement-deeplink">Deep link (optional)</FieldLabel>
          <Input
            id="announcement-deeplink"
            value={deepLink}
            onChange={(e) => setDeepLink(e.target.value)}
            placeholder="/expenses"
          />
        </Field>
      </FieldGroup>

      <Button type="submit" disabled={loading}>
        {loading ? "Sending…" : "Send now"}
      </Button>
    </form>
  );
}
