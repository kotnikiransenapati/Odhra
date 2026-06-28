import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from "@/components/ui/command";
import {
  LayoutDashboard, Package, ShoppingCart, Users, Store, BarChart3,
  Tag, Bell, Settings, Activity, History, Megaphone, Wallet,
  CreditCard, FileText, Truck, Search, Webhook, Gauge, Siren,
  CalendarClock, Radio, Building2, LogIn, Users2, ClipboardCheck,
  Receipt, BadgePercent, LineChart, LifeBuoy, ShieldCheck, FileBarChart,
} from "lucide-react";

type Action = {
  id: string;
  label: string;
  group: string;
  icon: React.ComponentType<{ className?: string }>;
  /** admin tab id (set ?tab=) */
  tab?: string;
  /** absolute route */
  to?: string;
  keywords?: string[];
};

const ACTIONS: Action[] = [
  { id: "overview", label: "Overview", group: "Admin", icon: LayoutDashboard, tab: "overview" },
  { id: "orders", label: "Orders", group: "Admin", icon: ShoppingCart, tab: "orders", keywords: ["sales", "checkout"] },
  { id: "products", label: "Products", group: "Admin", icon: Package, tab: "products" },
  { id: "customers", label: "Customers", group: "Admin", icon: Users, tab: "customers" },
  { id: "vendors", label: "Vendors", group: "Admin", icon: Store, tab: "vendors" },
  { id: "payouts", label: "Payouts", group: "Admin", icon: Wallet, tab: "payouts" },
  { id: "refunds", label: "Refunds", group: "Admin", icon: CreditCard, tab: "refunds" },
  { id: "invoices", label: "Invoices", group: "Admin", icon: FileText, tab: "invoices" },
  { id: "shipping", label: "Shipping", group: "Admin", icon: Truck, tab: "shipping" },
  { id: "promotions", label: "Promotions", group: "Marketing", icon: Tag, tab: "promotions" },
  { id: "push-notifications", label: "Push Notifications", group: "Marketing", icon: Bell, tab: "push-notifications" },
  { id: "broadcast", label: "Broadcast Banner", group: "Marketing", icon: Megaphone, tab: "broadcast-banners" },
  { id: "customer-broadcasts", label: "Customer Broadcasts", group: "Marketing", icon: Radio, tab: "customer-broadcasts" },
  { id: "ga4-analytics", label: "Google Analytics", group: "Analytics", icon: BarChart3, tab: "ga4-analytics" },
  { id: "behavior-analytics", label: "Behavior Analytics", group: "Analytics", icon: BarChart3, tab: "behavior-analytics" },
  { id: "observability", label: "Observability & SLOs", group: "System", icon: Activity, tab: "observability" },
  { id: "system-health", label: "System Health", group: "System", icon: Activity, tab: "system-health" },
  { id: "webhook-explorer", label: "Webhook Explorer", group: "System", icon: Webhook, tab: "webhook-explorer" },
  { id: "circuit-breakers", label: "Circuit Breakers", group: "System", icon: Gauge, tab: "circuit-breakers" },
  { id: "scheduled-rollouts", label: "Scheduled Rollouts", group: "System", icon: CalendarClock, tab: "scheduled-rollouts" },
  { id: "anomaly-alerts", label: "Anomaly Alerts", group: "System", icon: Siren, tab: "anomaly-alerts" },
  { id: "release-notes", label: "Release Notes", group: "System", icon: FileText, tab: "release-notes" },
  { id: "error-monitoring", label: "Error Monitor", group: "System", icon: Activity, tab: "error-monitoring" },
  { id: "audit-logs", label: "Audit Logs", group: "System", icon: History, tab: "audit-logs" },
  { id: "settings", label: "Settings", group: "System", icon: Settings, tab: "settings" },
  { id: "open-store", label: "Open storefront", group: "Navigate", icon: Search, to: "/" },

  // Wholesale (admin-side)
  { id: "wholesalers", label: "Wholesalers", group: "Wholesale", icon: Users2, tab: "wholesalers", keywords: ["b2b", "wholesale"] },
  { id: "wholesale-approvals", label: "Wholesale Approvals", group: "Wholesale", icon: ClipboardCheck, tab: "wholesale-approvals" },
  { id: "wholesale-pricing", label: "Wholesale Tier Pricing", group: "Wholesale", icon: BadgePercent, tab: "wholesale-pricing" },
  { id: "wholesale-360", label: "Wholesale Customer 360", group: "Wholesale", icon: LineChart, to: "/admin/wholesale-360" },
  { id: "wholesale-reports", label: "Wholesale Reports & SLOs", group: "Wholesale", icon: FileBarChart, to: "/admin/wholesale-reports" },
  { id: "wholesale-support", label: "Wholesale KAM Support", group: "Wholesale", icon: LifeBuoy, tab: "wholesale-support" },
  { id: "wholesale-announcements", label: "Wholesale Announcements", group: "Wholesale", icon: Megaphone, tab: "wholesale-announcements" },

  // Wholesale portal shortcuts
  { id: "wholesale-apply", label: "Apply for Wholesale Account", group: "Wholesale Portal", icon: Building2, to: "/wholesale/apply", keywords: ["b2b", "register", "signup"] },
  { id: "wholesale-login", label: "Wholesale Login", group: "Wholesale Portal", icon: LogIn, to: "/auth?redirect=/wholesale", keywords: ["b2b", "signin"] },
  { id: "wholesale-dashboard", label: "Wholesale Dashboard", group: "Wholesale Portal", icon: LayoutDashboard, to: "/wholesale" },
  { id: "wholesale-catalog", label: "Wholesale Catalog", group: "Wholesale Portal", icon: Package, to: "/wholesale/catalog" },
  { id: "wholesale-cart", label: "Wholesale Cart", group: "Wholesale Portal", icon: ShoppingCart, to: "/wholesale/cart" },
  { id: "wholesale-invoices", label: "Wholesale Invoices", group: "Wholesale Portal", icon: Receipt, to: "/wholesale/invoices" },
  { id: "wholesale-payments", label: "Wholesale Payments", group: "Wholesale Portal", icon: CreditCard, to: "/wholesale/payments" },
  { id: "wholesale-reports-portal", label: "Wholesale Statements", group: "Wholesale Portal", icon: BarChart3, to: "/wholesale/reports" },
  { id: "wholesale-support-portal", label: "Wholesale Support", group: "Wholesale Portal", icon: LifeBuoy, to: "/wholesale/support" },
  { id: "wholesale-security", label: "Wholesale Security (2FA)", group: "Wholesale Portal", icon: ShieldCheck, to: "/wholesale/security" },
];

export function AdminCommandPalette() {
  const [open, setOpen] = useState(false);
  const [, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const grouped = useMemo(() => {
    const m: Record<string, Action[]> = {};
    for (const a of ACTIONS) (m[a.group] ||= []).push(a);
    return m;
  }, []);

  const run = (a: Action) => {
    setOpen(false);
    if (a.to) navigate(a.to);
    else if (a.tab) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", a.tab!);
        return next;
      });
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Jump to… (Cmd/Ctrl + K)" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        {Object.entries(grouped).map(([group, items], idx) => (
          <div key={group}>
            {idx > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {items.map((a) => (
                <CommandItem
                  key={a.id}
                  value={`${a.label} ${a.keywords?.join(" ") ?? ""}`}
                  onSelect={() => run(a)}
                >
                  <a.icon className="mr-2 h-4 w-4" />
                  {a.label}
                  {a.tab && <CommandShortcut>{a.tab}</CommandShortcut>}
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

export default AdminCommandPalette;
