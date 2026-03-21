"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useUnreadNotificationCount } from "@/hooks/use-notifications";
import { localizeHref } from "@/lib/routing/locale-path";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  variant?: "dark" | "light";
}

export function NotificationBell({ variant = "dark" }: NotificationBellProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const { data: unreadCount = 0 } = useUnreadNotificationCount(user?.id);

  if (!user) {
    return null;
  }

  const isDark = variant === "dark";

  return (
    <Link
      href={localizeHref("/notifications", pathname)}
      aria-label={
        unreadCount > 0
          ? `${unreadCount} notifications non lues`
          : "Voir les notifications"
      }
      className={cn(
        "relative rounded-full p-2 transition-colors",
        isDark
          ? "text-white hover:bg-white/10"
          : "text-foreground hover:bg-muted",
      )}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
