"use client";

import { LogOut, Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface MarketingHeaderProps {
  className?: string;
}

export function MarketingHeader({ className }: MarketingHeaderProps) {
  const { user, loading, openAuthModal, signOut } = useAuth();

  return (
    <header
      className={cn("flex items-center justify-between gap-6", className)}
    >
      <Link href="/" aria-label="Okeyo Travel home" className="shrink-0">
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
        <Link href="/" className="transition-colors hover:text-white">
          Home
        </Link>
        <Link href="/explore" className="transition-colors hover:text-white">
          Explore
        </Link>
        <Link
          href="/collections"
          className="transition-colors hover:text-white"
        >
          Collections
        </Link>
        <Link href="/chat" className="transition-colors hover:text-white">
          Assistant IA
        </Link>
      </nav>

      <div className="hidden items-center gap-2 md:flex">
        {user ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => signOut()}
            className="rounded-full border-white/60 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
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
