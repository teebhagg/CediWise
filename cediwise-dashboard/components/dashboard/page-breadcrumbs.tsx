"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SEGMENT_LABELS: Record<string, string> = {
  users: "Users",
  "learning-data": "Learning Data",
  lessons: "Lessons",
  new: "New",
  feedback: "Feedback",
  progress: "Progress",
  "tbill-rates": "T-Bill Rates",
  notifications: "Notifications",
  announcements: "Announcements",
  settings: "Settings",
};

function getSegmentLabel(segment: string, _fullPath: string, index: number): string {
  const segments = _fullPath.split("/").filter(Boolean);
  const prevSegment = segments[index - 1];

  if (segment === "" || segment === "dashboard") return "Dashboard";
  if (prevSegment === "lessons" && segment === "new") return "New Lesson";
  if (prevSegment === "lessons" && /^[a-f0-9-]{36}$/i.test(segment)) return "Edit Lesson";
  if (prevSegment === "users") return "User Details";
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  return segment;
}

export function PageBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return (
      <nav
        aria-label="Breadcrumb"
        className="text-muted-foreground mb-4 flex items-center gap-1.5 text-sm"
      >
        <span className="font-medium text-foreground">Dashboard</span>
      </nav>
    );
  }

  const crumbs = segments.map((segment, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const label = getSegmentLabel(segment, pathname, i);
    const isLast = i === segments.length - 1;
    return { href, label, isLast };
  });

  return (
    <nav
      aria-label="Breadcrumb"
      className="text-muted-foreground mb-4 flex items-center gap-1.5 text-sm"
    >
      <Link
        href="/"
        className="transition-colors hover:text-foreground"
      >
        Dashboard
      </Link>
      {crumbs.map(({ href, label, isLast }) => (
        <span key={href} className="flex items-center gap-1.5">
          <span aria-hidden>/</span>
          {isLast ? (
            <span className="font-medium text-foreground">{label}</span>
          ) : (
            <Link href={href} className="transition-colors hover:text-foreground">
              {label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
