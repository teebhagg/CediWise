"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { LessonDifficulty, LessonInsert, LessonModule } from "@/lib/types/lessons";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface LessonFormProps {
  lessonId?: string;
  createAction?: (row: LessonInsert) => Promise<{ error?: string }>;
  action?: (id: string, updates: Partial<LessonInsert>) => Promise<{ error?: string }>;
  modules: readonly LessonModule[];
  difficulties: readonly LessonDifficulty[];
  initialData?: Partial<{
    id: string;
    title: string;
    module: string;
    difficulty: string;
    duration_minutes: number;
    content_url: string;
    calculator_id: string;
    version: string;
  }>;
  isEdit?: boolean;
}

export function LessonForm({
  lessonId,
  createAction,
  action: updateAction,
  modules,
  difficulties,
  initialData,
  isEdit,
}: LessonFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [id, setId] = useState(initialData?.id ?? "");
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [module, setModule] = useState(initialData?.module ?? "MOD-01");
  const [difficulty, setDifficulty] = useState(initialData?.difficulty ?? "beginner");
  const [durationMinutes, setDurationMinutes] = useState(
    String(initialData?.duration_minutes ?? 5)
  );
  const [contentUrl, setContentUrl] = useState(initialData?.content_url ?? "");
  const [calculatorId, setCalculatorId] = useState(initialData?.calculator_id ?? "");
  const [version, setVersion] = useState(initialData?.version ?? "1.0.0");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const duration = parseInt(durationMinutes, 10);
    if (isNaN(duration) || duration < 1 || duration > 120) {
      setError("Duration must be 1–120 minutes");
      setLoading(false);
      return;
    }
    if (!id.trim()) {
      setError("ID is required");
      setLoading(false);
      return;
    }
    if (!title.trim()) {
      setError("Title is required");
      setLoading(false);
      return;
    }

    const now = new Date().toISOString();
    if (isEdit && lessonId && updateAction) {
      const result = await updateAction(lessonId, {
        title: title.trim(),
        module: module as LessonModule,
        difficulty: difficulty as LessonDifficulty,
        duration_minutes: duration,
        content_url: contentUrl.trim() || null,
        calculator_id: calculatorId.trim() || null,
        version: version.trim(),
        last_updated: now,
      });
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
    } else if (createAction) {
      const result = await createAction({
        id: id.trim(),
        title: title.trim(),
        module: module as LessonModule,
        difficulty: difficulty as LessonDifficulty,
        duration_minutes: duration,
        languages: ["en"],
        tags: [],
        content_url: contentUrl.trim() || null,
        calculator_id: calculatorId.trim() || null,
        version: version.trim(),
        last_updated: now,
      });
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
    }
    router.refresh();
    router.push("/learning-data/lessons");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="id">Lesson ID</FieldLabel>
          <Input
            id="id"
            placeholder="mod01-budgeting-01"
            value={id}
            onChange={(e) => setId(e.target.value)}
            disabled={!!isEdit}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="title">Title</FieldLabel>
          <Input
            id="title"
            placeholder="Understanding Budgets"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="module">Module</FieldLabel>
            <select
              id="module"
              value={module}
              onChange={(e) => setModule(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
            >
              {modules.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="difficulty">Difficulty</FieldLabel>
            <select
              id="difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
            >
              {difficulties.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="duration">Duration (minutes)</FieldLabel>
          <Input
            id="duration"
            type="number"
            min={1}
            max={120}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="content_url">Content URL</FieldLabel>
          <Input
            id="content_url"
            type="url"
            placeholder="https://..."
            value={contentUrl}
            onChange={(e) => setContentUrl(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="calculator_id">Calculator ID</FieldLabel>
          <Input
            id="calculator_id"
            placeholder="Optional"
            value={calculatorId}
            onChange={(e) => setCalculatorId(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="version">Version</FieldLabel>
          <Input
            id="version"
            placeholder="1.0.0"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
          />
        </Field>
      </FieldGroup>
      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : isEdit ? "Save changes" : "Create lesson"}
      </Button>
    </form>
  );
}
