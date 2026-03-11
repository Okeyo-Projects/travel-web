"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";
import { NotificationBell } from "@/components/site/NotificationBell";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { localizeHref } from "@/lib/routing/locale-path";
import { useViewMode } from "@/providers/view-mode-provider";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { user } = useAuth();
  const { mode } = useViewMode();
  const pathname = usePathname();
  const isHostMode = Boolean(user && mode === "host");
  const [isOpen, setIsOpen] = useState(false);

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

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-4">
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

        {/* Mobile Nav */}
        <div className="flex md:hidden items-center gap-2">
          {user ? <NotificationBell variant="light" /> : null}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle className="text-left font-bold text-2xl">Menu</SheetTitle>
                <SheetDescription className="sr-only">Menu de navigation web</SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-4 mt-8">
                {isHostMode ? (
                  <>
                    <Link href={localizeHref("/host", pathname)} onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start text-lg h-12">
                        Dashboard
                      </Button>
                    </Link>
                    <Link href={localizeHref("/host/experiences", pathname)} onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start text-lg h-12">
                        Experiences
                      </Button>
                    </Link>
                    <Link href={localizeHref("/host/availability", pathname)} onClick={() => setIsOpen(false)}>
                      <Button
                        className={cn(
                          "w-full justify-start text-lg h-12 rounded-lg font-medium transition-colors",
                          "bg-black text-white hover:bg-black/80 border-0",
                        )}
                      >
                        Availability
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href={localizeHref("/collections", pathname)} onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start text-lg h-12">
                        Nos collections
                      </Button>
                    </Link>
                    <Link href={localizeHref("/chat", pathname)} onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start text-lg h-12">
                        Assistant IA
                      </Button>
                    </Link>
                    <Link href={localizeHref("/explore", pathname)} onClick={() => setIsOpen(false)}>
                      <Button
                        className={cn(
                          "w-full justify-start text-lg h-12 rounded-lg font-medium transition-colors",
                          "bg-black text-white hover:bg-black/80 border-0",
                        )}
                      >
                        Explorer nos trésors
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
