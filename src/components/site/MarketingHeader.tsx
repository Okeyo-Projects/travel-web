"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { localizeHref } from "@/lib/routing/locale-path";
import { cn } from "@/lib/utils";
import { useViewMode } from "@/providers/view-mode-provider";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NotificationBell } from "./NotificationBell";
import { useSiteI18n } from "./site-i18n";
import { UserMenu } from "./UserMenu";

interface MarketingHeaderProps {
  className?: string;
}

export function MarketingHeader({ className }: MarketingHeaderProps) {
  const { user, loading, openAuthModal, signOut } = useAuth();
  const { mode } = useViewMode();
  const pathname = usePathname();
  const { t } = useSiteI18n();
  const isHostMode = Boolean(user && mode === "host");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on navigation
  useEffect(() => {
    if (pathname) {
      setMobileMenuOpen(false);
    }
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
          aria-label={t("header.homeAria")}
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
                {t("header.dashboard")}
              </Link>
              <Link
                href={localizeHref("/host/experiences", pathname)}
                className="transition-colors hover:text-white"
              >
                {t("header.experiences")}
              </Link>
              <Link
                href={localizeHref("/host/availability", pathname)}
                className="transition-colors hover:text-white"
              >
                {t("header.availability")}
              </Link>
            </>
          ) : (
            <>
              <Link
                href={localizeHref("/", pathname)}
                className="transition-colors hover:text-white"
              >
                {t("header.home")}
              </Link>
              <Link
                href={localizeHref("/explore", pathname)}
                className="transition-colors hover:text-white"
              >
                {t("header.explore")}
              </Link>
              <Link
                href={localizeHref("/chat", pathname)}
                className="transition-colors hover:text-white"
              >
                {t("header.assistant")}
              </Link>
            </>
          )}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitcher variant="dark" />
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
              {t("header.login")}
            </Button>
          )}
        </div>

        {/* Mobile hamburger toggle */}
        <Button
          type="button"
          variant="ghost"
          aria-label={
            mobileMenuOpen ? t("header.closeMenu") : t("header.openMenu")
          }
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
            <button
              type="button"
              aria-label={t("header.closeMenu")}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Menu panel */}
            <nav className="absolute right-0 top-0 flex h-full w-[300px] flex-col overflow-y-auto bg-gradient-to-b from-gray-900 to-black px-6 pt-24 sm:w-[360px]">
              <div className="flex flex-col gap-2">
                {isHostMode ? (
                  <>
                    <Link
                      href={localizeHref("/host", pathname)}
                      className="text-white/90 text-lg py-3 px-4 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      {t("header.dashboard")}
                    </Link>
                    <Link
                      href={localizeHref("/host/experiences", pathname)}
                      className="text-white/90 text-lg py-3 px-4 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      {t("header.experiences")}
                    </Link>
                    <Link
                      href={localizeHref("/host/availability", pathname)}
                      className="text-white/90 text-lg py-3 px-4 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      {t("header.availability")}
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href={localizeHref("/", pathname)}
                      className="text-white/90 text-lg py-3 px-4 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      {t("header.home")}
                    </Link>
                    <Link
                      href={localizeHref("/explore", pathname)}
                      className="text-white/90 text-lg py-3 px-4 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      {t("header.explore")}
                    </Link>
                    <Link
                      href={localizeHref("/chat", pathname)}
                      className="text-white/90 text-lg py-3 px-4 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      {t("header.assistant")}
                    </Link>
                  </>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-white/55">
                    {t("language.label")}
                  </p>
                </div>
                <LanguageSwitcher variant="dark" className="shrink-0" />
              </div>

              {/* Auth section */}
              <div className="mt-8 border-t border-white/20 pt-6">
                {user ? (
                  <div className="flex flex-col gap-2">
                    <Link
                      href={localizeHref("/profile", pathname)}
                      className="text-white/90 text-lg py-3 px-4 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      {t("header.profile")}
                    </Link>
                    <Link
                      href={localizeHref("/bookings", pathname)}
                      className="text-white/90 text-lg py-3 px-4 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      {t("header.bookings")}
                    </Link>
                    <Link
                      href={localizeHref("/settings", pathname)}
                      className="text-white/90 text-lg py-3 px-4 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      {t("header.settings")}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        signOut();
                        setMobileMenuOpen(false);
                      }}
                      className="text-red-400 text-lg py-3 px-4 rounded-lg hover:bg-white/10 transition-colors text-left"
                    >
                      {t("header.logout")}
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
                    {t("header.login")}
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
