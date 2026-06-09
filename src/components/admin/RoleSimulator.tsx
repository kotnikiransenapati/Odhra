import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Tablet, Monitor, RefreshCw, ExternalLink, EyeOff } from "lucide-react";

type Persona = "guest" | "customer" | "vendor" | "admin";
type Device = "mobile" | "tablet" | "desktop";

const PERSONA_ROUTES: Record<Persona, { label: string; routes: { label: string; path: string }[] }> = {
  guest: {
    label: "Guest visitor",
    routes: [
      { label: "Home", path: "/" },
      { label: "Shop", path: "/shop" },
      { label: "Product detail", path: "/shop" },
      { label: "Cart", path: "/cart" },
      { label: "Sign in", path: "/auth" },
    ],
  },
  customer: {
    label: "Customer",
    routes: [
      { label: "Account", path: "/account" },
      { label: "Orders", path: "/account/orders" },
      { label: "Wishlist", path: "/wishlist" },
      { label: "Rewards", path: "/account/rewards" },
      { label: "Checkout", path: "/checkout" },
    ],
  },
  vendor: {
    label: "Vendor",
    routes: [
      { label: "Vendor dashboard", path: "/vendor" },
      { label: "Products", path: "/vendor/products" },
      { label: "Orders", path: "/vendor/orders" },
      { label: "Wallet", path: "/vendor/wallet" },
      { label: "Settings", path: "/vendor/settings" },
    ],
  },
  admin: {
    label: "Admin (you)",
    routes: [
      { label: "Overview", path: "/admin" },
      { label: "Orders", path: "/admin?tab=orders" },
      { label: "Vendors", path: "/admin?tab=vendors" },
    ],
  },
};

const DEVICE_SIZE: Record<Device, { w: number; h: number; icon: typeof Monitor }> = {
  mobile: { w: 390, h: 780, icon: Smartphone },
  tablet: { w: 768, h: 1024, icon: Tablet },
  desktop: { w: 1280, h: 800, icon: Monitor },
};

export function RoleSimulator() {
  const [persona, setPersona] = useState<Persona>("guest");
  const [device, setDevice] = useState<Device>("desktop");
  const [path, setPath] = useState<string>(PERSONA_ROUTES.guest.routes[0].path);
  const [key, setKey] = useState(0);

  const size = DEVICE_SIZE[device];
  const src = `${path}${path.includes("?") ? "&" : "?"}__preview=1`;

  const setPersonaAnd = (p: Persona) => {
    setPersona(p);
    setPath(PERSONA_ROUTES[p].routes[0].path);
    setKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <EyeOff className="h-6 w-6" /> Preview as Role
          </h2>
          <p className="text-sm text-muted-foreground">
            Sandboxed iframe preview of how the app looks for each persona. Auth is your own — guest preview opens in a fresh sandbox.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Persona</Label>
              <Select value={persona} onValueChange={(v) => setPersonaAnd(v as Persona)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PERSONA_ROUTES) as Persona[]).map((p) => (
                    <SelectItem key={p} value={p}>{PERSONA_ROUTES[p].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Quick route</Label>
              <Select value={path} onValueChange={(v) => { setPath(v); setKey((k) => k + 1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERSONA_ROUTES[persona].routes.map((r) => (
                    <SelectItem key={r.path} value={r.path}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs">Custom path</Label>
              <div className="flex gap-2">
                <Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/some-route" />
                <Button variant="outline" onClick={() => setKey((k) => k + 1)}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="outline" asChild>
                  <a href={path} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            {(Object.keys(DEVICE_SIZE) as Device[]).map((d) => {
              const Icon = DEVICE_SIZE[d].icon;
              return (
                <Button
                  key={d}
                  size="sm"
                  variant={device === d ? "default" : "outline"}
                  onClick={() => setDevice(d)}
                >
                  <Icon className="h-4 w-4 mr-1" /> {d}
                </Button>
              );
            })}
            <Badge variant="outline" className="ml-2">
              {size.w} × {size.h}
            </Badge>
            <Badge variant="secondary" className="ml-auto">
              Persona: {PERSONA_ROUTES[persona].label}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 overflow-auto">
          <div
            className="mx-auto rounded-lg border shadow-lg bg-background overflow-hidden"
            style={{ width: size.w, height: size.h, maxWidth: "100%" }}
          >
            <iframe
              key={key}
              src={src}
              title={`${persona} preview`}
              className="w-full h-full"
              sandbox={
                persona === "guest"
                  ? "allow-scripts allow-forms allow-popups allow-same-origin"
                  : "allow-scripts allow-forms allow-popups allow-same-origin allow-storage-access-by-user-activation"
              }
            />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Tip: guest preview omits your session storage so you see the unauthenticated experience.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default RoleSimulator;
