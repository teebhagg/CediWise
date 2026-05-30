import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function MonitoringLoading() {
  return (
    <div className="space-y-8">
      <header>
        <div className="h-9 w-36 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-muted" />
      </header>

      <section>
        <div className="mb-4 h-5 w-20 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
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
        <Card>
          <CardHeader className="pb-2">
            <div className="h-5 w-36 animate-pulse rounded bg-muted" />
            <div className="mt-1 h-3 w-56 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full animate-pulse rounded-lg bg-muted/50" />
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-5 w-28 animate-pulse rounded bg-muted" />
                <div className="mt-1 h-3 w-40 animate-pulse rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-[260px] w-full animate-pulse rounded-lg bg-muted/50" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <Card>
          <CardHeader className="pb-2">
            <div className="h-5 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-1 h-3 w-48 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="overflow-hidden rounded-lg border">
                <div className="h-10 bg-muted/50" />
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="flex h-14 items-center gap-4 border-t px-4"
                  >
                    <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                    <div className="ml-auto h-4 w-10 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-10 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
