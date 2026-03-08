"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, LogOut, Settings, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { getImageUrl } from "@/utils/functions";

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
  const pathname = usePathname();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user!.id)
        .single();
      return data as { display_name: string; avatar_url: string | null } | null;
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
          aria-label="User menu"
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
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={localizeHref("/profile", pathname)}>
            <User className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={localizeHref("/bookings", pathname)}>
            <CalendarDays className="mr-2 h-4 w-4" />
            My Bookings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={localizeHref("/settings", pathname)}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut()}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
