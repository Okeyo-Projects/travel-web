"use client";

import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useCallback } from "react";
import { NotificationsList } from "@/components/notifications/notifications-list";
import { MarketingHeader } from "@/components/site/MarketingHeader";
import { useSiteI18n } from "@/components/site/site-i18n";
import { useAuth } from "@/hooks/use-auth";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/hooks/use-notifications";
import { getNotificationTargetHref } from "@/lib/notifications";
import { localizeHref } from "@/lib/routing/locale-path";
import type { NotificationRow } from "@/types/notification";

export default function NotificationsPage() {
  const { t } = useSiteI18n();
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const { data: notifications = [], isLoading } = useNotifications(user?.id);
  const markNotificationRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const handleNotificationClick = useCallback(
    async (notification: NotificationRow) => {
      if (!notification.read_at) {
        void markNotificationRead.mutateAsync(notification.id);
      }

      const destination = getNotificationTargetHref(notification);
      if (!destination) {
        return;
      }

      if (destination.startsWith("http://") || destination.startsWith("https://")) {
        window.location.href = destination;
        return;
      }

      router.push(localizeHref(destination, pathname));
    },
    [markNotificationRead, pathname, router],
  );

  const handleMarkAllAsRead = useCallback(() => {
    if (!user?.id) {
      return;
    }
    void markAllRead.mutateAsync(user.id);
  }, [markAllRead, user?.id]);

  if (!authLoading && !user) {
    router.replace(localizeHref("/", pathname));
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-[#08090d] to-[#1a1a2e] px-6 pb-10 pt-6">
        <MarketingHeader className="mx-auto max-w-5xl" />
      </div>

      <section className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            {t("notifications.page.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("notifications.page.description")}
          </p>
        </header>

        <NotificationsList
          notifications={notifications}
          isLoading={isLoading}
          isMarkingAll={markAllRead.isPending}
          onMarkAllAsRead={handleMarkAllAsRead}
          onNotificationClick={handleNotificationClick}
        />
      </section>
    </div>
  );
}
