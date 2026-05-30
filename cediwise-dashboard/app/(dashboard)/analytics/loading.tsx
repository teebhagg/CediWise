import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-8">
      <header>
        <div className="h-9 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
      </header>

      <section>
        <div className="mb-4 h-5 w-20 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-9 w-16 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-3 w-32 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-5 w-32 animate-pulse rounded bg-muted" />
                <div className="mt-1 h-3 w-48 animate-pulse rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-[260px] w-full animate-pulse rounded-lg bg-muted/50" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
