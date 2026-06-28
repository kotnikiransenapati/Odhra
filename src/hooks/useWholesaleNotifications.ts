import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface WholesaleNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  read_at: string | null;
  created_at: string;
}

export interface WholesaleAnnouncement {
  id: string;
  title: string;
  body: string;
  link: string | null;
  cta_label: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  pinned: boolean;
  starts_at: string;
  expires_at: string | null;
}

export function useWholesaleNotifications(wholesalerId: string | null | undefined) {
  const [notifications, setNotifications] = useState<WholesaleNotification[]>([]);
  const [announcements, setAnnouncements] = useState<WholesaleAnnouncement[]>([]);
  const [readAnnouncementIds, setReadAnnouncementIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!wholesalerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [nRes, aRes, rRes] = await Promise.all([
      supabase
        .from("wholesale_notifications" as any)
        .select("*")
        .eq("wholesaler_id", wholesalerId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("wholesale_announcements" as any)
        .select("*")
        .eq("is_active", true)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("wholesale_announcement_reads" as any)
        .select("announcement_id")
        .eq("wholesaler_id", wholesalerId),
    ]);
    setNotifications((nRes.data as any) ?? []);
    setAnnouncements((aRes.data as any) ?? []);
    setReadAnnouncementIds(
      new Set(((rRes.data as any) ?? []).map((r: any) => r.announcement_id))
    );
    setLoading(false);
  }, [wholesalerId]);

  useEffect(() => {
    refresh();
    if (!wholesalerId) return;
    const ch = supabase
      .channel(`wsh-notif-${wholesalerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "wholesale_notifications",
          filter: `wholesaler_id=eq.${wholesalerId}`,
        },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [wholesalerId, refresh]);

  const unreadCount =
    notifications.filter((n) => !n.read_at).length +
    announcements.filter((a) => !readAnnouncementIds.has(a.id)).length;

  const markRead = async (id: string) => {
    await supabase
      .from("wholesale_notifications" as any)
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    setNotifications((p) =>
      p.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
  };

  const markAllRead = async () => {
    if (!wholesalerId) return;
    await supabase
      .from("wholesale_notifications" as any)
      .update({ read_at: new Date().toISOString() })
      .eq("wholesaler_id", wholesalerId)
      .is("read_at", null);
    setNotifications((p) =>
      p.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() }))
    );
  };

  const markAnnouncementRead = async (announcementId: string) => {
    if (!wholesalerId) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    await supabase.from("wholesale_announcement_reads" as any).upsert(
      {
        announcement_id: announcementId,
        wholesaler_id: wholesalerId,
        user_id: auth.user.id,
      },
      { onConflict: "announcement_id,user_id" }
    );
    setReadAnnouncementIds((p) => new Set([...p, announcementId]));
  };

  return {
    loading,
    notifications,
    announcements,
    readAnnouncementIds,
    unreadCount,
    refresh,
    markRead,
    markAllRead,
    markAnnouncementRead,
  };
}

/** Register a Web Push subscription for a wholesaler. */
export async function subscribeWholesalePush(
  wholesalerId: string,
  vapidPublicKey: string
) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push notifications not supported");
  }
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }
  const json = sub.toJSON() as any;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  await supabase.from("wholesale_push_subscriptions" as any).upsert(
    {
      wholesaler_id: wholesalerId,
      user_id: auth.user.id,
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      user_agent: navigator.userAgent,
      device_label:
        /iPhone|iPad|Android/i.test(navigator.userAgent) ? "Mobile" : "Desktop",
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );
  return true;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const out = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) out[i] = rawData.charCodeAt(i);
  return out;
}
