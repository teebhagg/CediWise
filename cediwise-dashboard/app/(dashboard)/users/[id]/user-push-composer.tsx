"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { sendAnnouncementToUser } from "@/lib/actions/announcements";
import { useRouter } from "next/navigation";
import { useState } from "react";

type UserPushComposerProps = {
  userId: string;
  hasActiveDevice: boolean;
};

export function UserPushComposer({ userId, hasActiveDevice }: UserPushComposerProps) {
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

    const result = await sendAnnouncementToUser({
      targetUserId: userId,
      title,
      body,
      deepLink: deepLink || null,
    });

    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccess(`Push sent. Attempted ${result.queued} device(s).`);
    setTitle("");
    setBody("");
    setDeepLink("");
    router.refresh();
  }

  if (!hasActiveDevice) {
    return (
      <p className="text-sm text-muted-foreground">
        This user has no active push devices registered. They need to open the app and allow
        notifications.
      </p>
    );
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
          <FieldLabel htmlFor="push-title">Title</FieldLabel>
          <Input
            id="push-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Heads up"
            required
            maxLength={120}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="push-body">Body</FieldLabel>
          <textarea
            id="push-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            maxLength={500}
            className="min-h-20 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="push-deeplink">Deep link (optional)</FieldLabel>
          <Input
            id="push-deeplink"
            value={deepLink}
            onChange={(e) => setDeepLink(e.target.value)}
            placeholder="/expenses"
          />
        </Field>
      </FieldGroup>
      <Button type="submit" disabled={loading}>
        {loading ? "Sending…" : "Send push"}
      </Button>
    </form>
  );
}
