"use client";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Add01Icon,
  BookOpen01Icon,
  DashboardSquare01Icon,
  Notification01Icon,
  Settings01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const ROUTES = [
  { href: "/", label: "Dashboard", icon: DashboardSquare01Icon, keywords: ["home"] },
  { href: "/users", label: "Users", icon: UserGroupIcon, keywords: ["people"] },
  { href: "/learning-data", label: "Learning Data", icon: BookOpen01Icon, keywords: ["lessons", "content"] },
  { href: "/learning-data/lessons", label: "Lessons", icon: BookOpen01Icon, keywords: ["learning", "content"] },
  { href: "/learning-data/lessons/new", label: "New Lesson", icon: Add01Icon, keywords: ["create", "add"] },
  { href: "/learning-data/feedback", label: "Feedback", icon: Notification01Icon, keywords: ["comments", "reviews"] },
  { href: "/learning-data/progress", label: "Progress", icon: BookOpen01Icon, keywords: ["stats", "tracking"] },
  { href: "/learning-data/tbill-rates", label: "T-Bill Rates", icon: BookOpen01Icon, keywords: ["treasury", "rates"] },
  { href: "/notifications", label: "Notifications", icon: Notification01Icon, keywords: ["alerts"] },
  { href: "/announcements", label: "Announcements", icon: Notification01Icon, keywords: ["push", "broadcast"] },
  { href: "/settings", label: "Settings", icon: Settings01Icon, keywords: ["preferences"] },
] as const;

interface SearchCommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchCommand({ open, onOpenChange }: SearchCommandProps) {
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Search for a page to navigate to"
      showCloseButton={false}
      className="sm:max-w-xl"
    >
      <Command shouldFilter={true} className="rounded-lg border-0 shadow-none">
        <CommandInput placeholder="Search pages..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Pages">
            {ROUTES.map(({ href, label, icon: Icon, keywords }) => (
              <CommandItem
                key={href}
                value={`${label} ${keywords.join(" ")}`}
                onSelect={() => {
                  router.push(href);
                  onOpenChange(false);
                }}
              >
                <HugeiconsIcon icon={Icon} strokeWidth={2} className="size-4" />
                {label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
