import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Bell,
  CalendarCheck,
  CalendarClock,
  CircleDollarSign,
  Heart,
  MessageSquare,
  Star,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NotificationKind, NotificationRow } from "@/types/notification";

type NotificationItemProps = {
  notification: NotificationRow;
  onClick: (notification: NotificationRow) => void;
};

function getNotificationIcon(kind: NotificationKind) {
  switch (kind) {
    case "booking_request":
    case "booking_confirmed":
    case "booking_cancelled":
    case "booking_created":
    case "booking_approved":
    case "booking_declined":
    case "booking_reminder":
      return CalendarClock;
    case "payment_succeeded":
    case "payment_failed":
    case "booking_paid":
      return CircleDollarSign;
    case "new_review":
    case "review_response":
    case "review_request":
    case "review_received":
      return Star;
    case "new_message":
      return MessageSquare;
    case "follow":
    case "new_follow":
      return UserPlus;
    case "like":
    case "like_experience":
    case "like_reel":
      return Heart;
    case "comment":
    case "comment_reply":
    case "comment_experience":
    case "reply_to_comment":
    case "new_comment":
      return CalendarCheck;
    default:
      return Bell;
  }
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const unread = !notification.read_at;
  const Icon = getNotificationIcon(notification.kind as NotificationKind);

  return (
    <button
      type="button"
      onClick={() => onClick(notification)}
      className={cn(
        "w-full rounded-xl border p-4 text-left transition-colors hover:bg-muted/60",
        unread ? "border-primary/30 bg-primary/5" : "border-border bg-card",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-muted p-2">
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <p className={cn("text-sm", unread ? "font-semibold" : "font-medium")}>
            {notification.title}
          </p>
          {notification.body ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">{notification.body}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
              locale: fr,
            })}
          </p>
        </div>
      </div>
    </button>
  );
}
