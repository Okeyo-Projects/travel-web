import { BellOff } from "lucide-react";
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
        <h2 className="mt-4 text-lg font-semibold">Aucune notification</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Les nouvelles alertes de réservation, paiement et activité apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {unreadCount > 0
            ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
            : "Tout est lu"}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={unreadCount === 0 || isMarkingAll}
          onClick={onMarkAllAsRead}
        >
          Tout marquer comme lu
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
