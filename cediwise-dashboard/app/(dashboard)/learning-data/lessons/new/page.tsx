import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createLesson } from "@/lib/actions/lessons";
import { LESSON_DIFFICULTIES, LESSON_MODULES } from "@/lib/constants/lessons";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { LessonForm } from "../lesson-form";

export default function NewLessonPage() {
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
          <h1 className="text-2xl font-semibold tracking-tight">New Lesson</h1>
          <p className="text-muted-foreground text-sm">Add a lesson to the catalog</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lesson details</CardTitle>
          <CardDescription>
            Lesson ID format: mod{'{'}NN{'}'}-topic-nn (e.g. mod01-budgeting-01)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LessonForm modules={LESSON_MODULES} difficulties={LESSON_DIFFICULTIES} createAction={createLesson} />
        </CardContent>
      </Card>
    </div>
  );
}
