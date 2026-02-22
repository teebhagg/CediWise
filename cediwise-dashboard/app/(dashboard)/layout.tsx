import { AppShell } from "@/components/dashboard/app-shell";
import { isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = await isAdmin(user.id, user.email ?? undefined);
  if (!admin) {
    redirect("/login?error=unauthorized");
  }

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const displayName =
    (meta?.full_name as string) ?? (meta?.name as string) ?? null;

  return (
    <AppShell
      userEmail={user.email ?? undefined}
      displayName={displayName}
    >
      {children}
    </AppShell>
  );
}
