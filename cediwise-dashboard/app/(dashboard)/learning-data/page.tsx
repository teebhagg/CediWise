import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

export default async function LearningDataPage() {
  const admin = createAdminClient();
  let lessonsCount = 0,
    progressCount = 0,
    feedbackCount = 0,
    tbillCount = 0;
  try {
    const [l, p, f, t] = await Promise.all([
      admin.from("lessons").select("*", { count: "exact", head: true }),
      admin.from("user_lesson_progress").select("*", { count: "exact", head: true }),
      admin.from("lesson_feedback").select("*", { count: "exact", head: true }),
      admin.from("live_tbill_rates").select("*", { count: "exact", head: true }),
    ]);
    lessonsCount = l.count ?? 0;
    progressCount = p.count ?? 0;
    feedbackCount = f.count ?? 0;
    tbillCount = t.count ?? 0;
  } catch {
    // Tables may not exist yet
  }

  const cards = [
    { href: "/learning-data/lessons", label: "Lessons", count: lessonsCount ?? 0, description: "Manage lesson catalog" },
    { href: "/learning-data/progress", label: "Progress", count: progressCount ?? 0, description: "User lesson completion" },
    { href: "/learning-data/feedback", label: "Feedback", count: feedbackCount ?? 0, description: "User lesson feedback" },
    { href: "/learning-data/tbill-rates", label: "T-Bill Rates", count: tbillCount ?? 0, description: "Live T-Bill rates" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Learning Data</h1>
        <p className="text-muted-foreground">
          Manage lessons, progress, feedback, and T-bill rates.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ href, label, count, description }) => (
          <Link key={href} href={href}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
