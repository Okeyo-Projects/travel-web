"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { localizeHref } from "@/lib/routing/locale-path";
import { cn } from "@/lib/utils";
import { useViewMode } from "@/providers/view-mode-provider";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";

interface MarketingHeaderProps {
  className?: string;
}

export function MarketingHeader({ className }: MarketingHeaderProps) {
  const { user, loading, openAuthModal, signOut } = useAuth();
  const { mode } = useViewMode();
  const pathname = usePathname();
  const isHostMode = Boolean(user && mode === "host");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <>
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

        {/* Mobile hamburger toggle */}
        <Button
          type="button"
          variant="ghost"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          className="rounded-full p-2 text-white hover:bg-white/10 md:hidden relative z-[101]"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
        >
          {mobileMenuOpen ? (
            <X className="h-7 w-7" />
          ) : (
            <Menu className="h-7 w-7" />
          )}
        </Button>
      </header>

      {/* Mobile menu overlay - portaled to body to escape stacking contexts */}
      {mobileMenuOpen &&
        createPortal(
        <div className="fixed inset-0 z-[100] md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Menu panel */}
          <nav className="absolute top-0 right-0 w-[300px] sm:w-[360px] h-full bg-gradient-to-b from-gray-900 to-black flex flex-col pt-24 px-6 overflow-y-auto">
            <div className="flex flex-col gap-2">
              {isHostMode ? (
                <>
                  <Link
                    href={localizeHref("/host", pathname)}
                    className="text-white/90 text-lg py-3 px-4 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href={localizeHref("/host/experiences", pathname)}
                    className="text-white/90 text-lg py-3 px-4 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    Experiences
                  </Link>
                  <Link
                    href={localizeHref("/host/availability", pathname)}
                    className="text-white/90 text-lg py-3 px-4 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    Availability
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href={localizeHref("/", pathname)}
                    className="text-white/90 text-lg py-3 px-4 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    Home
                  </Link>
                  <Link
                    href={localizeHref("/explore", pathname)}
                    className="text-white/90 text-lg py-3 px-4 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    Explore
                  </Link>
                  <Link
                    href={localizeHref("/chat", pathname)}
                    className="text-white/90 text-lg py-3 px-4 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    Assistant IA
                  </Link>
                </>
              )}
            </div>

            {/* Auth section */}
            <div className="mt-8 pt-6 border-t border-white/20">
              {user ? (
                <div className="flex flex-col gap-2">
                  <Link
                    href={localizeHref("/profile", pathname)}
                    className="text-white/90 text-lg py-3 px-4 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    Profile
                  </Link>
                  <Link
                    href={localizeHref("/bookings", pathname)}
                    className="text-white/90 text-lg py-3 px-4 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    My Bookings
                  </Link>
                  <Link
                    href={localizeHref("/settings", pathname)}
                    className="text-white/90 text-lg py-3 px-4 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      signOut();
                      setMobileMenuOpen(false);
                    }}
                    className="text-red-400 text-lg py-3 px-4 rounded-lg hover:bg-white/10 transition-colors text-left"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    openAuthModal({ mode: "login" });
                    setMobileMenuOpen(false);
                  }}
                  className="w-full rounded-full border border-white/60 bg-transparent text-white hover:bg-white/10"
                >
                  Login
                </Button>
              )}
            </div>
          </nav>
        </div>,
        document.body,
      )}
    </>
  );
}

