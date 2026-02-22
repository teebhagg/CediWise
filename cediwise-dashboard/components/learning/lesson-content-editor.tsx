"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateLessonContent } from "@/lib/actions/lessons";
import type { LessonContentJson } from "@/lib/types/lessons";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const EMPTY_CONTENT: LessonContentJson = {
  schema_version: "1.0",
  sections: [
    { type: "text", content: "Add your lesson content here. Use the structured format with sections." },
    { type: "heading", level: 2, content: "Example Heading" },
    { type: "text", content: "You can add text, headings, tables, callouts, examples, and more." },
  ],
};

interface LessonContentEditorProps {
  lessonId: string;
  initialContent: LessonContentJson | null | undefined;
}

function parseContent(raw: string): { ok: true; data: LessonContentJson } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return { ok: false, error: "Content must be a JSON object" };
    }
    const obj = parsed as Record<string, unknown>;
    if (obj.schema_version !== "1.0") {
      return { ok: false, error: 'Missing or invalid schema_version (use "1.0")' };
    }
    if (!Array.isArray(obj.sections)) {
      return { ok: false, error: "Missing or invalid sections array" };
    }
    return { ok: true, data: parsed as LessonContentJson };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof SyntaxError ? `Invalid JSON: ${e.message}` : "Invalid JSON",
    };
  }
}

export function LessonContentEditor({ lessonId, initialContent }: LessonContentEditorProps) {
  const router = useRouter();
  const [json, setJson] = useState(() =>
    initialContent ? JSON.stringify(initialContent, null, 2) : ""
  );
  const [editMode, setEditMode] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const raw = (new FormData(form).get("content") as string) ?? "";
    const result = parseContent(raw);
    if (!result.ok) {
      setParseError(result.error);
      setSubmitError(null);
      return;
    }
    setParseError(null);
    setIsPending(true);
    setSubmitError(null);
    const { error } = await updateLessonContent(lessonId, result.data);
    setIsPending(false);
    if (error) {
      setSubmitError(error);
      return;
    }
    setEditMode(false);
    router.refresh();
  }

  function handleAddContent() {
    setJson(JSON.stringify(EMPTY_CONTENT, null, 2));
    setParseError(null);
    setEditMode(true);
  }

  async function handleRemoveContent() {
    if (!confirm("Remove all lesson content? The mobile app will fall back to bundled content.")) {
      return;
    }
    setIsPending(true);
    const { error } = await updateLessonContent(lessonId, null);
    setIsPending(false);
    if (!error) {
      setJson("");
      setEditMode(false);
      router.refresh();
    } else {
      setSubmitError(error);
    }
  }


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Label>Lesson content (JSON)</Label>
        <div className="flex gap-2">
          {!editMode && initialContent && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setJson(JSON.stringify(initialContent, null, 2));
                  setEditMode(true);
                }}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddContent}
              >
                Replace with template
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemoveContent}
              >
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-4" />
                Remove content
              </Button>
            </>
          )}
          {!editMode && !initialContent && (
            <Button type="button" size="sm" onClick={handleAddContent}>
              Add content
            </Button>
          )}
        </div>
      </div>

      {editMode ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            name="content"
            value={json}
            onChange={(e) => {
              setJson(e.target.value);
              setParseError(null);
            }}
            placeholder='{"schema_version":"1.0","sections":[...]}'
            className="min-h-[280px] font-mono text-sm"
          />
          {(parseError || submitError) && (
            <p className="text-destructive text-sm">{parseError ?? submitError}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save content"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditMode(false);
                setJson(initialContent ? JSON.stringify(initialContent, null, 2) : "");
                setParseError(null);
                setSubmitError(null);
              }}
            >
              Cancel
            </Button>
            {initialContent && json && (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10"
                onClick={handleRemoveContent}
                disabled={isPending}
              >
                Remove content
              </Button>
            )}
          </div>
        </form>
      ) : initialContent ? (
        <p className="text-muted-foreground text-sm">
          Content is stored in the database. Use Edit to modify.
        </p>
      ) : (
        <p className="text-muted-foreground text-sm">
          No content yet. Click Add content to create it.
        </p>
      )}
    </div>
  );
}
