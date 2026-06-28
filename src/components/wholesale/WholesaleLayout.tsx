import { ReactNode, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ClipboardList,
  Receipt,
  CreditCard,
  BarChart3,
  LifeBuoy,
  Settings,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WholesaleNotificationBell } from "./WholesaleNotificationBell";

const NAV = [
  { to: "/wholesale", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/wholesale/catalog", label: "Catalog", icon: Package },
  { to: "/wholesale/cart", label: "Cart", icon: ShoppingCart },
  { to: "/wholesale/quotes", label: "Quotes (RFQ)", icon: ClipboardList },
  { to: "/wholesale/orders", label: "Orders", icon: ClipboardList },
  { to: "/wholesale/invoices", label: "Invoices", icon: Receipt },
  { to: "/wholesale/payments", label: "Payments", icon: CreditCard },
  { to: "/wholesale/reports", label: "Reports", icon: BarChart3 },
  { to: "/wholesale/support", label: "Support", icon: LifeBuoy },
  { to: "/wholesale/settings", label: "Settings", icon: Settings },
];

export default function WholesaleLayout({ children }: { children?: ReactNode }) {
  const location = useLocation();

  // Scope a distinct visual theme to this portal only.
  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute("data-portal", "wholesale");
    return () => {
      el.removeAttribute("data-portal");
    };
  }, []);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:w-64 shrink-0 flex-col border-r border-border bg-card">
        <div className="px-5 py-4 border-b border-border">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Wholesale Portal
          </div>
          <div className="font-semibold text-lg">B2B Workspace</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <a
            href="/install"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Download className="h-3.5 w-3.5" /> Install B2B app
          </a>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-border bg-card/60 backdrop-blur flex items-center px-4 md:px-6 justify-between">
          <div className="text-sm text-muted-foreground truncate">
            {NAV.find((n) =>
              n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)
            )?.label ?? "Wholesale"}
          </div>
          <div className="flex items-center gap-3">
            <WholesaleNotificationBell />
            <div className="text-xs text-muted-foreground hidden sm:block">
              Approved Account
            </div>
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="md:hidden flex overflow-x-auto gap-1 border-b border-border bg-card px-2 py-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "shrink-0 px-3 py-1.5 rounded-md text-xs whitespace-nowrap",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
