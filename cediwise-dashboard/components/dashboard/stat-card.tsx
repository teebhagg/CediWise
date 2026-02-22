import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  href?: string;
  /** Larger variant for primary KPIs */
  variant?: "default" | "primary";
}

export function StatCard({
  title,
  value,
  description,
  href,
  variant = "default",
}: StatCardProps) {
  const content = (
    <Card
      className={cn(
        "transition-all duration-200",
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
