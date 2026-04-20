import { BellOff } from "lucide-react";
import { useSiteI18n } from "@/components/site/site-i18n";
import { Button } from "@/components/ui/button";
import { NotificationItem } from "@/components/notifications/notification-item";
import type { NotificationRow } from "@/types/notification";

type NotificationsListProps = {
  notifications: NotificationRow[];
  isLoading: boolean;
  isMarkingAll: boolean;
  onMarkAllAsRead: () => void;
  onNotificationClick: (notification: NotificationRow) => void;
};

export function NotificationsList({
  notifications,
  isLoading,
  isMarkingAll,
  onMarkAllAsRead,
  onNotificationClick,
}: NotificationsListProps) {
  const { t } = useSiteI18n();
  const unreadCount = notifications.filter((item) => !item.read_at).length;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={`notification-skeleton-${index}`} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center">
        <div className="rounded-full bg-muted p-3">
          <BellOff className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">
          {t("notifications.empty.title")}
        </h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {t("notifications.empty.description")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {unreadCount > 0
            ? unreadCount === 1
              ? t("notifications.page.unread.one", { count: unreadCount })
              : t("notifications.page.unread.other", { count: unreadCount })
            : t("notifications.page.unread.allRead")}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={unreadCount === 0 || isMarkingAll}
          onClick={onMarkAllAsRead}
        >
          {t("notifications.page.markAll")}
        </Button>
      </div>

      <div className="space-y-3">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onClick={onNotificationClick}
          />
        ))}
      </div>
    </div>
  );
}
