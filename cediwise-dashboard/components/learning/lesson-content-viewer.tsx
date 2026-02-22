"use client";

import type { LessonContentJson } from "@/lib/types/lessons";
import { cn } from "@/lib/utils";

interface LessonContentViewerProps {
  content: LessonContentJson | null | undefined;
  className?: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function renderSection(section: unknown, i: number): React.ReactNode {
  if (!isRecord(section) || typeof section.type !== "string") return null;

  switch (section.type) {
    case "text":
      return (
        <p key={i} className="text-foreground mb-3 leading-relaxed">
          {String(section.content ?? "")}
        </p>
      );
    case "heading": {
      const level = Number(section.level) || 2;
      const Tag = (`h${Math.min(3, Math.max(1, level))}`) as "h1" | "h2" | "h3";
      const sizes = { h1: "text-xl mt-6", h2: "text-lg mt-5", h3: "text-base mt-4" };
      return (
        <Tag
          key={i}
          className={cn("font-semibold text-foreground mb-2", sizes[Tag])}
        >
          {String(section.content ?? "")}
        </Tag>
      );
    }
    case "divider":
      return <hr key={i} className="my-4 border-border" />;
    case "callout_stat":
    case "callout_tip":
    case "callout_warning":
    case "callout_law": {
      const styles: Record<string, string> = {
        callout_stat: "border-l-primary bg-primary/5",
        callout_tip: "border-l-emerald-500 bg-emerald-500/5",
        callout_warning: "border-l-amber-500 bg-amber-500/5",
        callout_law: "border-l-violet-500 bg-violet-500/5",
      };
      const src = isRecord(section.source) ? section.source : undefined;
      return (
        <div
          key={i}
          className={cn(
            "border-l-4 pl-4 py-2 my-3 rounded-r text-sm",
            styles[section.type] ?? "border-l-muted bg-muted/30"
          )}
        >
          <p className="text-foreground">{String(section.content ?? "")}</p>
          {src && typeof src.label === "string" && (
            <p className="text-muted-foreground mt-1 text-xs">
              — {src.label}
              {typeof src.url === "string" && (
                <a href={src.url} className="ml-1 underline hover:text-foreground">
                  source
                </a>
              )}
            </p>
          )}
        </div>
      );
    }
    case "table":
      if (!isStringArray(section.headers)) return null;
      const rows = Array.isArray(section.rows) ? section.rows : [];
      return (
        <div key={i} className="my-4 overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            {section.caption && (
              <caption className="text-muted-foreground px-2 py-1 text-left text-xs">
                {String(section.caption)}
              </caption>
            )}
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {section.headers.map((h, j) => (
                  <th key={j} className="px-3 py-2 text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, j) => (
                <tr key={j} className="border-b border-border last:border-0">
                  {(isStringArray(row) ? row : []).map((cell, k) => (
                    <td key={k} className="px-3 py-2">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "example":
      return (
        <div key={i} className="my-3 rounded-md border border-border bg-muted/20 p-3">
          {section.title && (
            <p className="text-foreground mb-1 font-medium text-sm">
              {String(section.title)}
            </p>
          )}
          <p className="text-muted-foreground text-sm leading-relaxed">
            {String(section.content ?? "")}
          </p>
        </div>
      );
    case "comparison": {
      const left = isRecord(section.left) ? section.left : { label: "", points: [] };
      const right = isRecord(section.right) ? section.right : { label: "", points: [] };
      const lPoints = Array.isArray(left.points) ? left.points : [];
      const rPoints = Array.isArray(right.points) ? right.points : [];
      return (
        <div key={i} className="my-4 grid grid-cols-2 gap-4">
          <div className="rounded-md border border-border p-3">
            <p className="mb-2 font-medium text-foreground text-sm">
              {String(left.label ?? "Left")}
            </p>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground text-sm">
              {lPoints.map((p: unknown, j: number) => (
                <li key={j}>{String(p)}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="mb-2 font-medium text-foreground text-sm">
              {String(right.label ?? "Right")}
            </p>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground text-sm">
              {rPoints.map((p: unknown, j: number) => (
                <li key={j}>{String(p)}</li>
              ))}
            </ul>
          </div>
        </div>
      );
    }
    case "cta_link":
      return (
        <div key={i} className="my-3 rounded-md border border-primary/30 bg-primary/5 p-3">
          <p className="font-medium text-foreground">{String(section.label ?? "")}</p>
          {section.description && (
            <p className="text-muted-foreground mt-1 text-sm">
              {String(section.description)}
            </p>
          )}
          <code className="text-muted-foreground mt-1 block text-xs">
            {String(section.destination ?? "")}
          </code>
        </div>
      );
    case "glossary_term":
      return (
        <div key={i} className="my-2">
          <span className="font-medium text-foreground">
            {String(section.term ?? "")}
          </span>
          <span className="text-muted-foreground"> — {String(section.definition ?? "")}</span>
        </div>
      );
    default:
      return (
        <div key={i} className="text-muted-foreground rounded border border-dashed p-2 text-sm">
          Unsupported block: {String(section.type)}
        </div>
      );
  }
}

export function LessonContentViewer({ content, className }: LessonContentViewerProps) {
  if (!content || typeof content !== "object") {
    return (
      <p className={cn("text-muted-foreground text-sm", className)}>
        No content. Add content below.
      </p>
    );
  }

  const sections = Array.isArray(content.sections) ? content.sections : [];
  if (sections.length === 0) {
    return (
      <p className={cn("text-muted-foreground text-sm", className)}>
        Empty content. Add sections below.
      </p>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      {sections.map((s, i) => renderSection(s, i))}
    </div>
  );
}
