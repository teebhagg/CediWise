"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/learning-data", label: "Overview" },
  { href: "/learning-data/lessons", label: "Lessons" },
  { href: "/learning-data/progress", label: "Progress" },
  { href: "/learning-data/feedback", label: "Feedback" },
  { href: "/learning-data/tbill-rates", label: "T-Bill Rates" },
] as const;

export function LearningDataNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap items-center gap-2 border-b pb-4">
      {items.map(({ href, label }) => {
        const isActive =
          href === "/learning-data"
            ? pathname === href
            : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            data-active={isActive}
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[active=true]:bg-muted data-[active=true]:text-foreground"
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
