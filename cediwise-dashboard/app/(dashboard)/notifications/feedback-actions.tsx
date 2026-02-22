"use client";

import { Button } from "@/components/ui/button";
import { resolveFeedback } from "@/lib/actions/lesson-feedback";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface FeedbackActionsProps {
  feedbackId: string;
}

export function FeedbackActions({ feedbackId }: FeedbackActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleResolve() {
    setLoading(true);
    const { error } = await resolveFeedback(feedbackId);
    setLoading(false);
    if (error) alert(error);
    else router.refresh();
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={handleResolve}
    >
      {loading ? "…" : "Resolve"}
    </Button>
  );
}
