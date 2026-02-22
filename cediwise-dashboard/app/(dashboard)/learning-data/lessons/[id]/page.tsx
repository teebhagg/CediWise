import { LessonContentEditor } from "@/components/learning/lesson-content-editor";
import { LessonContentViewer } from "@/components/learning/lesson-content-viewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLesson, updateLesson } from "@/lib/actions/lessons";
import { LESSON_DIFFICULTIES, LESSON_MODULES } from "@/lib/constants/lessons";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonForm } from "../lesson-form";

export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lesson = await getLesson(id);
  if (!lesson) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/learning-data/lessons">
          <Button variant="ghost" size="icon">
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{lesson.title}</h1>
          <p className="text-muted-foreground text-sm font-mono">{id}</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Edit lesson</CardTitle>
          <CardDescription>Update lesson metadata. ID cannot be changed.</CardDescription>
        </CardHeader>
        <CardContent>
          <LessonForm
            lessonId={id}
            action={updateLesson}
            modules={LESSON_MODULES}
            difficulties={LESSON_DIFFICULTIES}
            initialData={{
              id: lesson.id,
              title: lesson.title,
              module: lesson.module,
              difficulty: lesson.difficulty,
              duration_minutes: lesson.duration_minutes,
              content_url: lesson.content_url ?? undefined,
              calculator_id: lesson.calculator_id ?? undefined,
              version: lesson.version,
            }}
            isEdit
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Lesson content</CardTitle>
          <CardDescription>
            Structured content shown in the mobile app. Add, edit, or remove content.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <LessonContentViewer content={lesson.content} />
          <LessonContentEditor lessonId={id} initialContent={lesson.content} />
        </CardContent>
      </Card>
    </div>
  );
}
