"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { deleteLesson } from "@/lib/actions/lessons";
import type { LessonRow } from "@/lib/types/lessons";
import { Delete02Icon, Edit01Icon, UserSearch01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

interface LessonsTableProps {
  lessons: LessonRow[];
  total: number;
  page: number;
  perPage: number;
  modules: readonly string[];
  difficulties: readonly string[];
  currentModule?: string;
  currentDifficulty?: string;
}

export function LessonsTable({
  lessons,
  total,
  page,
  perPage,
  modules,
  difficulties,
  currentModule,
  currentDifficulty,
}: LessonsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onPageChange(newPage: number) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("page", String(newPage));
    router.push(`/learning-data/lessons?${p.toString()}`);
  }
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lessons;
    return lessons.filter(
      (l) =>
        l.id.toLowerCase().includes(q) ||
        l.title.toLowerCase().includes(q) ||
        l.module.toLowerCase().includes(q)
    );
  }, [lessons, search]);

  function buildHref(mod?: string, diff?: string, pg?: number) {
    const p = new URLSearchParams(searchParams.toString());
    if (mod) p.set("module", mod);
    else p.delete("module");
    if (diff) p.set("difficulty", diff);
    else p.delete("difficulty");
    if (pg != null && pg > 1) p.set("page", String(pg));
    else p.delete("page");
    return `/learning-data/lessons?${p.toString()}`;
  }

  async function handleDelete(id: string) {
    if (!confirm(`Delete lesson "${id}"?`)) return;
    const { error } = await deleteLesson(id);
    if (error) alert(error);
    else router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <HugeiconsIcon
            icon={UserSearch01Icon}
            strokeWidth={2}
            className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2"
          />
          <Input
            placeholder="Search lessons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          <Link href={buildHref(undefined, currentDifficulty, 1)}>
            <Button variant={!currentModule ? "secondary" : "outline"} size="sm">
              All modules
            </Button>
          </Link>
          {modules.map((m) => (
            <Link key={m} href={buildHref(m, currentDifficulty, 1)}>
              <Button variant={currentModule === m ? "secondary" : "outline"} size="sm">
                {m}
              </Button>
            </Link>
          ))}
        </div>
        <div className="flex gap-1">
          <Link href={buildHref(currentModule, undefined, 1)}>
            <Button variant={!currentDifficulty ? "secondary" : "outline"} size="sm">
              All
            </Button>
          </Link>
          {difficulties.map((d) => (
            <Link key={d} href={buildHref(currentModule, d, 1)}>
              <Button variant={currentDifficulty === d ? "secondary" : "outline"} size="sm">
                {d}
              </Button>
            </Link>
          ))}
        </div>
      </div>
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="h-10 px-4 text-left font-medium">ID</th>
                <th className="h-10 px-4 text-left font-medium">Title</th>
                <th className="h-10 px-4 text-left font-medium">Module</th>
                <th className="h-10 px-4 text-left font-medium">Difficulty</th>
                <th className="h-10 px-4 text-left font-medium">Duration</th>
                <th className="h-10 px-4 w-24" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="h-24 px-4 text-center text-muted-foreground">
                    No lessons found.
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{l.id}</td>
                    <td className="px-4 py-3">{l.title}</td>
                    <td className="px-4 py-3">{l.module}</td>
                    <td className="px-4 py-3 capitalize">{l.difficulty}</td>
                    <td className="px-4 py-3">{l.duration_minutes} min</td>
                    <td className="px-4 py-3 flex gap-1">
                      <Link href={`/learning-data/lessons/${l.id}`}>
                        <Button variant="ghost" size="sm">
                          <HugeiconsIcon icon={Edit01Icon} strokeWidth={2} className="size-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(l.id)}
                      >
                        <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          perPage={perPage}
          total={total}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}
