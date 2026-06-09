import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useIsVendor } from "@/hooks/useUserRole";
import { Megaphone, X, AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type Banner = {
  id: string;
  message: string;
  variant: "info" | "warning" | "success" | "error";
  link_url: string | null;
  link_label: string | null;
  audience: "all" | "customers" | "vendors" | "admins";
  dismissible: boolean;
  ends_at: string | null;
};

const DISMISS_KEY = "dismissed_banners_v1";
const getDismissed = (): string[] => {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]"); } catch { return []; }
};

const ICONS = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle2,
  error: XCircle,
} as const;

const STYLES = {
  info: "bg-primary text-primary-foreground",
  warning: "bg-amber-500 text-white",
  success: "bg-emerald-600 text-white",
  error: "bg-destructive text-destructive-foreground",
} as const;

export function GlobalBroadcastBanner() {
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const { data: isVendor } = useIsVendor();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [dismissed, setDismissed] = useState<string[]>(getDismissed());

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from("broadcast_banners")
        .select("id,message,variant,link_url,link_label,audience,dismissible,ends_at")
        .eq("enabled", true)
        .lte("starts_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (mounted && data) setBanners(data as Banner[]);
    };
    load();
    const channel = supabase
      .channel("broadcast_banners_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "broadcast_banners" }, load)
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(channel); };
  }, []);

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
  };

  const audienceMatches = (a: Banner["audience"]) => {
    if (a === "all") return true;
    if (a === "customers") return !!user;
    if (a === "vendors") return !!isVendor;
    if (a === "admins") return !!isAdmin;
    return false;
  };

  const visible = banners.filter((b) => {
    if (b.ends_at && new Date(b.ends_at) <= new Date()) return false;
    if (dismissed.includes(b.id)) return false;
    return audienceMatches(b.audience);
  });

  if (visible.length === 0) return null;

  return (
    <div className="sticky top-0 z-50 w-full">
      {visible.map((b) => {
        const Icon = ICONS[b.variant];
        return (
          <div
            key={b.id}
            role="status"
            className={cn("flex items-center gap-3 px-4 py-2 text-sm", STYLES[b.variant])}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <div className="flex-1 truncate">
              <span>{b.message}</span>
              {b.link_url && (
                <Link to={b.link_url} className="ml-2 underline font-medium">
                  {b.link_label || "Learn more"}
                </Link>
              )}
            </div>
            {b.dismissible && (
              <button
                onClick={() => dismiss(b.id)}
                aria-label="Dismiss announcement"
                className="opacity-80 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {!b.dismissible && <Megaphone className="h-4 w-4 opacity-60" />}
          </div>
        );
      })}
    </div>
  );
}

export default GlobalBroadcastBanner;
