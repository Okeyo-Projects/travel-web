"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BriefcaseBusiness,
  CalendarDays,
  Compass,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { localizeHref } from "@/lib/routing/locale-path";
import { createClient } from "@/lib/supabase/client";
import { useViewMode } from "@/providers/view-mode-provider";
import { getImageUrl } from "@/utils/functions";
import { useSiteI18n } from "./site-i18n";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface UserMenuProps {
  /** "dark" for headers with dark/gradient backgrounds, "light" for white headers */
  variant?: "dark" | "light";
}

export function UserMenu({ variant = "dark" }: UserMenuProps) {
  const { user, signOut } = useAuth();
  const { mode, canHost, setMode } = useViewMode();
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useSiteI18n();
  const userId = user?.id;

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    enabled: !!user,
    queryFn: async () => {
      if (!userId) {
        return null;
      }

      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, is_host")
        .eq("id", userId)
        .single();
      return data as {
        display_name: string;
        avatar_url: string | null;
        is_host: boolean | null;
      } | null;
    },
  });

  const displayName =
    profile?.display_name ?? user?.email?.split("@")[0] ?? "U";
  const avatarUrl =
    getImageUrl(profile?.avatar_url ?? undefined, "profiles") ?? undefined;

  const isDark = variant === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`rounded-full ring-2 transition-all focus:outline-none ${
            isDark
              ? "ring-white/30 hover:ring-white/60"
              : "ring-border hover:ring-foreground/30"
          }`}
          aria-label={t("header.userMenu")}
        >
          <Avatar className="size-9">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback
              className={`text-sm font-semibold ${
                isDark ? "bg-white/20 text-white" : "bg-muted text-foreground"
              }`}
            >
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <div className="px-3 py-2">
          <p className="text-sm font-semibold truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground truncate">
            {user?.email}
          </p>
          <div className="mt-1">
            <Badge
              variant="outline"
              className="text-[10px] uppercase tracking-wide"
            >
              {mode === "host"
                ? t("header.hostMode")
                : t("header.travelerMode")}
            </Badge>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={localizeHref("/profile", pathname)}>
            <User className="mr-2 h-4 w-4" />
            {t("header.profile")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={localizeHref("/bookings", pathname)}>
            <CalendarDays className="mr-2 h-4 w-4" />
            {t("header.bookings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={localizeHref("/settings", pathname)}>
            <Settings className="mr-2 h-4 w-4" />
            {t("header.settings")}
          </Link>
        </DropdownMenuItem>
        {mode === "host" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={localizeHref("/host", pathname)}>
                <Compass className="mr-2 h-4 w-4" />
                {t("header.dashboard")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={localizeHref("/host/experiences", pathname)}>
                <BriefcaseBusiness className="mr-2 h-4 w-4" />
                {t("header.experiences")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={localizeHref("/host/availability", pathname)}>
                <CalendarDays className="mr-2 h-4 w-4" />
                {t("header.availability")}
              </Link>
            </DropdownMenuItem>
          </>
        )}
        {!canHost && (
          <DropdownMenuItem asChild>
            <Link href={localizeHref("/become-host", pathname)}>
              <BriefcaseBusiness className="mr-2 h-4 w-4" />
              {t("host.becomeHost.pageTitle")}
            </Link>
          </DropdownMenuItem>
        )}
        {canHost && (
          <DropdownMenuItem
            onSelect={() => {
              if (mode === "host") {
                setMode("traveler");
                if (pathname.startsWith("/host")) {
                  router.push(localizeHref("/explore", pathname));
                }
                return;
              }

              setMode("host");
              router.push(localizeHref("/host", pathname));
            }}
          >
            {mode === "host" ? (
              <Compass className="mr-2 h-4 w-4" />
            ) : (
              <BriefcaseBusiness className="mr-2 h-4 w-4" />
            )}
            {mode === "host"
              ? t("header.switchToTraveler")
              : t("header.switchToHost")}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut()}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t("header.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
