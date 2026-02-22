"use client";

import { PageBreadcrumbs } from "@/components/dashboard/page-breadcrumbs";
import { SearchCommand } from "@/components/dashboard/search-command";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  BookOpen01Icon,
  DashboardSquare01Icon,
  Logout01Icon,
  Notification01Icon,
  SearchIcon,
  Settings01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: DashboardSquare01Icon },
  { href: "/users", label: "Users", icon: UserGroupIcon },
  { href: "/learning-data", label: "Learning Data", icon: BookOpen01Icon },
  { href: "/notifications", label: "Notifications", icon: Notification01Icon },
  { href: "/settings", label: "Settings", icon: Settings01Icon },
] as const;

interface AppShellProps {
  userEmail: string | undefined;
  displayName?: string | null;
  children: React.ReactNode;
}

export function AppShell({ userEmail, displayName, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  }

  return (
    <SidebarProvider>
      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader className="border-b border-sidebar-border">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md p-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            title="CediWise Admin"
          >
            <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-semibold">
              C
            </div>
            <span className="truncate font-semibold group-data-[collapsible=icon]:hidden">CediWise Admin</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="gap-2 p-3">
            <SidebarGroupContent>
              <SidebarMenu className="gap-2">
                {navItems.map(({ href, label, icon: Icon }) => {
                  const isActive =
                    href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(href);
                  return (
                    <SidebarMenuItem key={href}>
                      <Link
                        href={href}
                        title={label}
                        className={cn(
                          "ring-sidebar-ring flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm outline-hidden transition-colors focus-visible:ring-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 [&>svg]:size-4 [&>svg]:shrink-0",
                          isActive
                            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <HugeiconsIcon icon={Icon} strokeWidth={2} />
                        <span className="truncate group-data-[collapsible=icon]:hidden">{label}</span>
                      </Link>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b rounded-t-2xl bg-background px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <span className="font-semibold">CediWise Admin</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
              className="shrink-0"
              aria-label="Search pages (⌘K)"
              title="Search pages (⌘K)"
            >
              <HugeiconsIcon icon={SearchIcon} strokeWidth={2} className="size-4" />
            </Button>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="sm" className="gap-2">
                    <span className="hidden max-w-32 truncate text-sm sm:inline">
                      {displayName || userEmail || "Account"}
                    </span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      Admin
                    </span>
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
                  <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
          <PageBreadcrumbs />
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
