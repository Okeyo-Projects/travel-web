"use client";

import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { localizeHref } from "@/lib/routing/locale-path";
import { useViewMode } from "@/providers/view-mode-provider";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";

interface MarketingHeaderProps {
  className?: string;
}

export function MarketingHeader({ className }: MarketingHeaderProps) {
  const { user, loading, openAuthModal } = useAuth();
  const { mode } = useViewMode();
  const pathname = usePathname();
  const isHostMode = Boolean(user && mode === "host");

  return (
    <header
      className={cn("flex items-center justify-between gap-6", className)}
    >
      <Link
        href={localizeHref("/", pathname)}
        aria-label="Okeyo Travel home"
        className="shrink-0"
      >
        <Image
          src="/logo_white.png"
          alt="Okeyo Travel"
          width={170}
          height={64}
          className="h-auto w-[92px] sm:w-[170px]"
          priority
        />
      </Link>

      <nav className="hidden items-center gap-10 text-base text-white/90 lg:flex">
        {isHostMode ? (
          <>
            <Link
              href={localizeHref("/host", pathname)}
              className="transition-colors hover:text-white"
            >
              Dashboard
            </Link>
            <Link
              href={localizeHref("/host/experiences", pathname)}
              className="transition-colors hover:text-white"
            >
              Experiences
            </Link>
            <Link
              href={localizeHref("/host/availability", pathname)}
              className="transition-colors hover:text-white"
            >
              Availability
            </Link>
          </>
        ) : (
          <>
            <Link
              href={localizeHref("/", pathname)}
              className="transition-colors hover:text-white"
            >
              Home
            </Link>
            <Link
              href={localizeHref("/explore", pathname)}
              className="transition-colors hover:text-white"
            >
              Explore
            </Link>
            <Link
              href={localizeHref("/collections", pathname)}
              className="transition-colors hover:text-white"
            >
              Collections
            </Link>
            <Link
              href={localizeHref("/chat", pathname)}
              className="transition-colors hover:text-white"
            >
              Assistant IA
            </Link>
          </>
        )}
      </nav>

      <div className="hidden items-center gap-2 md:flex">
        {user ? (
          <>
            <NotificationBell />
            <UserMenu />
          </>
        ) : (
          <Button
            type="button"
            disabled={loading}
            onClick={() => openAuthModal({ mode: "login" })}
            className="rounded-full border border-white/60 bg-transparent px-8 text-white hover:bg-white/10"
          >
            Login
          </Button>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        aria-label="Open menu"
        className="rounded-full p-2 text-white hover:bg-white/10 md:hidden"
      >
        <Menu className="h-7 w-7" />
      </Button>
    </header>
  );
}
