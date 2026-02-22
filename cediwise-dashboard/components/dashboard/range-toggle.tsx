"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";

export type RangeValue = "week" | "month" | "year";

const RANGES: { value: RangeValue; label: string }[] = [
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
  { value: "year", label: "Annual" },
];

export function RangeToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = (searchParams.get("range") as RangeValue) || "month";

  function setRange(value: RangeValue) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", value);
    router.push(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5">
      {RANGES.map(({ value, label }) => (
        <Button
          key={value}
          variant="ghost"
          size="sm"
          onClick={() => setRange(value)}
          className={cn(
            "rounded-md text-xs font-medium transition-colors",
            current === value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
