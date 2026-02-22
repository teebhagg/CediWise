import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listLessons } from "@/lib/actions/lessons";
import { LESSON_DIFFICULTIES, LESSON_MODULES } from "@/lib/constants/lessons";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { Suspense } from "react";
import { LessonsTable } from "./lessons-table";

const PER_PAGE = 20;

export default async function LessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ module?: string; difficulty?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lessons</h1>
          <p className="text-muted-foreground">
            Manage the financial literacy lesson catalog.
          </p>
        </div>
        <Link href="/learning-data/lessons/new">
          <Button>
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-4" />
            Add Lesson
          </Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lesson Catalog</CardTitle>
          <CardDescription>
            Filter by module or difficulty. Click a lesson to edit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-muted/50" />}>
            <LessonsTableWrapper
              module={params.module}
              difficulty={params.difficulty}
              page={page}
              perPage={PER_PAGE}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

async function LessonsTableWrapper({
  module,
  difficulty,
  page,
  perPage,
}: {
  module?: string;
  difficulty?: string;
  page: number;
  perPage: number;
}) {
  const { data: lessons, total } = await listLessons(module, difficulty, page, perPage);
  return (
    <LessonsTable
      lessons={lessons}
      total={total}
      page={page}
      perPage={perPage}
      modules={LESSON_MODULES}
      difficulties={LESSON_DIFFICULTIES}
      currentModule={module}
      currentDifficulty={difficulty}
    />
  );
}
