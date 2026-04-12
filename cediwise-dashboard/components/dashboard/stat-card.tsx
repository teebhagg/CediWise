import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";

export type StatCardTrend = {
  change: number;
  periodLabel: string;
  polarity: "higher_is_better" | "lower_is_better";
};

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  href?: string;
  /** Larger variant for primary KPIs */
  variant?: "default" | "primary";
  /** Week-over-week or similar delta; respects prefers-reduced-motion via color only */
  trend?: StatCardTrend | null;
}

function TrendHint({ trend }: { trend: StatCardTrend }) {
  const { change, periodLabel, polarity } = trend;
  if (change === 0) {
    return (
      <p className="text-muted-foreground mt-1 text-xs tabular-nums">
        Same {periodLabel}
      </p>
    );
  }
  const good =
    polarity === "higher_is_better" ? change > 0 : change < 0;
  const prefix = change > 0 ? "+" : "";
  return (
    <p
      className={cn(
        "mt-1 text-xs font-medium tabular-nums",
        good ? "text-emerald-600 dark:text-emerald-500" : "text-amber-700 dark:text-amber-500"
      )}
    >
      {prefix}
      {change} {periodLabel}
    </p>
  );
}

export function StatCard({
  title,
  value,
  description,
  href,
  variant = "default",
  trend,
}: StatCardProps) {
  const content = (
    <Card
      className={cn(
        "transition-[box-shadow,border-color] duration-200",
        href && "cursor-pointer hover:border-primary/30 hover:shadow-md",
        variant === "primary" && "border-primary/20 bg-primary/5"
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
      </CardHeader>
      <CardContent>
        <p
          className={cn(
            "font-bold tabular-nums tracking-tight",
            variant === "primary" ? "text-3xl" : "text-2xl"
          )}
        >
          {value}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">{description}</p>
        {trend ? <TrendHint trend={trend} /> : null}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block transition-opacity hover:opacity-95">
        {content}
      </Link>
    );
  }
  return content;
}
