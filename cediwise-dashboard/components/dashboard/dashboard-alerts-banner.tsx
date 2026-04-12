import { fetchDashboardAlerts } from "@/lib/actions/dashboard-alerts";
import { cn } from "@/lib/utils";
import Link from "next/link";

export async function DashboardAlertsBanner() {
  const alerts = await fetchDashboardAlerts();
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2" role="region" aria-label="Dashboard alerts">
      {alerts.map((a, i) => (
        <div
          key={`${a.message}-${i}`}
          className={cn(
            "rounded-lg border px-3 py-2.5 text-sm",
            a.level === "warning"
              ? "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100"
              : "border-border bg-muted/50 text-foreground"
          )}
        >
          {a.href ? (
            <Link href={a.href} className="font-medium underline-offset-4 hover:underline">
              {a.message}
            </Link>
          ) : (
            <span className="font-medium">{a.message}</span>
          )}
        </div>
      ))}
    </div>
  );
}
