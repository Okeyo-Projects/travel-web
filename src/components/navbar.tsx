"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/site/NotificationBell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { localizeHref } from "@/lib/routing/locale-path";
import { useViewMode } from "@/providers/view-mode-provider";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { user } = useAuth();
  const { mode } = useViewMode();
  const pathname = usePathname();
  const isHostMode = Boolean(user && mode === "host");

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link
          href={localizeHref("/", pathname)}
          className="flex items-start gap-1"
        >
          <div className="flex flex-col items-center">
            <span className="font-bold text-3xl tracking-tight leading-none">
              okeyo
            </span>
            <span className="text-[0.6rem] font-bold tracking-[0.2em] text-primary uppercase leading-none self-end">
              TRAVEL
            </span>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-4 ml-0.5"></div>
        </Link>

        {/* Desktop Nav - Only the two requested buttons */}
        <nav className="flex items-center gap-4">
          {isHostMode ? (
            <>
              <Link href={localizeHref("/host", pathname)}>
                <Button variant="ghost" className="font-medium">
                  Dashboard
                </Button>
              </Link>
              <Link href={localizeHref("/host/experiences", pathname)}>
                <Button variant="ghost" className="font-medium">
                  Experiences
                </Button>
              </Link>
              <Link href={localizeHref("/host/availability", pathname)}>
                <Button
                  className={cn(
                    "rounded-lg px-6 font-medium transition-colors",
                    "bg-black text-white hover:bg-black/80 border-0",
                  )}
                >
                  Availability
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href={localizeHref("/collections", pathname)}>
                <Button variant="ghost" className="font-medium">
                  Nos collections
                </Button>
              </Link>
              <Link href={localizeHref("/chat", pathname)}>
                <Button variant="ghost" className="font-medium">
                  Assistant IA
                </Button>
              </Link>
              <Link href={localizeHref("/explore", pathname)}>
                <Button
                  className={cn(
                    "rounded-lg px-6 font-medium transition-colors",
                    "bg-black text-white hover:bg-black/80 border-0",
                  )}
                >
                  Explorer nos trésors
                </Button>
              </Link>
            </>
          )}
          {user ? <NotificationBell variant="light" /> : null}
        </nav>
      </div>
    </header>
  );
}
