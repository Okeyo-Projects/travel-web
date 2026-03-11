"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { localizeHref } from "@/lib/routing/locale-path";
import { useViewMode } from "@/providers/view-mode-provider";
import { MarketingHeader } from "@/components/site/MarketingHeader";

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
    <div className="flex min-h-[100dvh] flex-col bg-slate-50">
      <div className="bg-[#08090d] px-4 py-4 shadow-sm sm:px-8">
        <div className="mx-auto max-w-7xl">
          <MarketingHeader />
        </div>
      </div>

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
