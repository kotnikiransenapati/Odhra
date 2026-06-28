import { useState } from "react";
import { Link } from "react-router-dom";
import { useWholesaler } from "@/hooks/useWholesaler";
import {
  useWholesaleNotifications,
  subscribeWholesalePush,
} from "@/hooks/useWholesaleNotifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, BellRing, Check, CheckCheck, Megaphone, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-amber-500",
  normal: "bg-blue-500",
  low: "bg-muted-foreground",
};

export function WholesaleNotificationBell() {
  const { account } = useWholesaler();
  const {
    notifications,
    announcements,
    readAnnouncementIds,
    unreadCount,
    markRead,
    markAllRead,
    markAnnouncementRead,
  } = useWholesaleNotifications(account?.id);
  const [open, setOpen] = useState(false);

  const enablePush = async () => {
    if (!account?.id) return;
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast.error("Browser notifications blocked");
        return;
      }
      const key =
        (import.meta.env.VITE_VAPID_PUBLIC_KEY as string) ||
        "BJN6JI4qhfWzS-yX5jzWmL4o2I0xL1L0pCS5Z3fH9R7yLcGq3OoP4F9rZjJk2cT2K9hLgX0bH1nQjI3vM6sP8YA";
      await subscribeWholesalePush(account.id, key);
      toast.success("Push notifications enabled");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to enable push");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-md hover:bg-muted transition-colors"
          aria-label="Notifications"
        >
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5 text-primary" />
          ) : (
            <Bell className="h-5 w-5 text-muted-foreground" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="font-semibold text-sm">Notifications</div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={enablePush}
            >
              <BellRing className="h-3.5 w-3.5 mr-1" /> Enable push
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={markAllRead}
              disabled={notifications.every((n) => n.read_at)}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark all
            </Button>
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {announcements.length > 0 && (
            <div className="border-b">
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30 flex items-center gap-1">
                <Megaphone className="h-3 w-3" /> Announcements
              </div>
              {announcements.map((a) => {
                const isRead = readAnnouncementIds.has(a.id);
                return (
                  <div
                    key={a.id}
                    className={cn(
                      "px-3 py-2.5 border-b last:border-b-0 cursor-pointer hover:bg-muted/30",
                      !isRead && "bg-primary/5"
                    )}
                    onClick={() => markAnnouncementRead(a.id)}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full mt-1.5 shrink-0",
                          PRIORITY_DOT[a.priority]
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {a.pinned && (
                            <Pin className="h-3 w-3 text-amber-500" />
                          )}
                          <div className="text-sm font-medium truncate">
                            {a.title}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {a.body}
                        </div>
                        {a.link && (
                          <Link
                            to={a.link}
                            className="text-xs text-primary hover:underline mt-1 inline-block"
                            onClick={() => setOpen(false)}
                          >
                            {a.cta_label ?? "View details"} →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              You're all caught up.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "px-3 py-2.5 border-b last:border-b-0 hover:bg-muted/30 group",
                  !n.read_at && "bg-primary/5"
                )}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full mt-1.5 shrink-0",
                      PRIORITY_DOT[n.priority]
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{n.title}</div>
                    {n.body && (
                      <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {n.body}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(n.created_at).toLocaleString("en-IN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                      {n.link && (
                        <Link
                          to={n.link}
                          className="text-[11px] text-primary hover:underline"
                          onClick={() => {
                            markRead(n.id);
                            setOpen(false);
                          }}
                        >
                          Open →
                        </Link>
                      )}
                    </div>
                  </div>
                  {!n.read_at && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="opacity-0 group-hover:opacity-100 transition p-1"
                      title="Mark read"
                    >
                      <Check className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
