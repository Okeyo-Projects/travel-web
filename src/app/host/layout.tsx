"use client";

import { BarChart3, CalendarRange, Compass, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { UserMenu } from "@/components/site/UserMenu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { localizeHref } from "@/lib/routing/locale-path";
import { useViewMode } from "@/providers/view-mode-provider";
import { cn } from "@/lib/utils";

const HOST_NAV_ITEMS = [
  {
    href: "/host",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/host/experiences",
    label: "Experiences",
    icon: Compass,
  },
  {
    href: "/host/availability",
    label: "Availability",
    icon: CalendarRange,
  },
];

export default function HostLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { mode, canHost, loading: viewModeLoading, setMode } = useViewMode();

  useEffect(() => {
    if (!viewModeLoading && canHost && mode !== "host") {
      setMode("host");
    }
  }, [canHost, mode, setMode, viewModeLoading]);

  useEffect(() => {
    if (!authLoading && !viewModeLoading && (!user || !canHost)) {
      router.replace(localizeHref("/", pathname));
    }
  }, [authLoading, canHost, pathname, router, user, viewModeLoading]);

  if (authLoading || viewModeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading host workspace...</p>
      </div>
    );
  }

  if (!user || !canHost) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <header className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-slate-900">Host Workspace</h1>
                <Badge variant="secondary" className="gap-1">
                  <BarChart3 className="size-3.5" />
                  Host mode
                </Badge>
              </div>
              <p className="text-sm text-slate-600">
                Manage your host activity from web. Switch back anytime.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setMode("traveler");
                  router.push(localizeHref("/explore", pathname));
                }}
              >
                Switch to Traveler
              </Button>
              <UserMenu variant="light" />
            </div>
          </div>
          <nav className="mt-4 flex flex-wrap gap-2">
            {HOST_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link key={item.href} href={localizeHref(item.href, pathname)}>
                  <Button
                    variant={active ? "default" : "outline"}
                    className={cn("gap-2", active ? "bg-slate-900 text-white hover:bg-slate-800" : "")}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </header>

        <main>{children}</main>
      </div>
    </div>
  );
}
