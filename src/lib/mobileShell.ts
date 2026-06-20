/**
 * Batch J1 — Capacitor Mobile Shell Bootstrap
 *
 * Lightweight runtime helpers that detect the Capacitor container, register
 * deep-link / universal-link handlers, and expose typed lifecycle hooks.
 * The actual Capacitor packages are loaded dynamically so the web build stays
 * unaffected when the native shell isn't installed yet.
 *
 * To enable native:
 *   1. `npm i -D @capacitor/core @capacitor/cli @capacitor/app @capacitor/status-bar`
 *   2. `npx cap init odhra com.odhra.app --web-dir=dist`
 *   3. `npx cap add android && npx cap add ios`
 *   4. Configure Universal Links / App Links with the domains below.
 */

import { getSiteBaseUrl } from "@/lib/siteUrl";

export const NATIVE_APP_ID = "com.odhra.app";
export const UNIVERSAL_LINK_DOMAINS = [
  "odhra1.lovable.app",
  "odhra.com",
];

export type DeepLinkHandler = (path: string, url: URL) => void;

interface CapacitorLike {
  isNativePlatform?: () => boolean;
  getPlatform?: () => "web" | "ios" | "android";
}

let _cap: CapacitorLike | null = null;
let _ready = false;

async function loadCapacitor(): Promise<CapacitorLike | null> {
  if (_cap) return _cap;
  try {
    const mod: any = await import(/* @vite-ignore */ "@capacitor/core").catch(() => null);
    _cap = mod?.Capacitor ?? null;
    return _cap;
  } catch {
    return null;
  }
}

export async function isNative(): Promise<boolean> {
  const cap = await loadCapacitor();
  return !!cap?.isNativePlatform?.();
}

export async function getPlatform(): Promise<"web" | "ios" | "android"> {
  const cap = await loadCapacitor();
  return (cap?.getPlatform?.() as any) ?? "web";
}

/** Convert any incoming URL (web, custom scheme, universal) into a route path. */
export function normalizeDeepLink(input: string): { path: string; url: URL } | null {
  try {
    const url = new URL(input);
    let path = url.pathname + url.search + url.hash;
    if (!path.startsWith("/")) path = "/" + path;
    return { path, url };
  } catch {
    return null;
  }
}

/** Register deep-link / universal-link routing. Returns an unsubscribe fn. */
export async function registerDeepLinks(handler: DeepLinkHandler): Promise<() => void> {
  const cap = await loadCapacitor();
  if (!cap?.isNativePlatform?.()) {
    // Web fallback: intercept ?deeplink= for QA / staging.
    const handle = () => {
      const params = new URLSearchParams(window.location.search);
      const dl = params.get("deeplink");
      if (dl) {
        const n = normalizeDeepLink(dl);
        if (n) handler(n.path, n.url);
      }
    };
    handle();
    window.addEventListener("popstate", handle);
    return () => window.removeEventListener("popstate", handle);
  }
  try {
    const App: any = await import(/* @vite-ignore */ "@capacitor/app");
    const sub = await App.App.addListener("appUrlOpen", (event: { url: string }) => {
      const n = normalizeDeepLink(event.url);
      if (n) handler(n.path, n.url);
    });
    return () => sub.remove?.();
  } catch {
    return () => {};
  }
}

/** Configure status bar tint to match the brand palette. */
export async function applyNativeChrome(theme: "light" | "dark" = "light") {
  const cap = await loadCapacitor();
  if (!cap?.isNativePlatform?.()) return;
  try {
    const sb: any = await import(/* @vite-ignore */ "@capacitor/status-bar");
    await sb.StatusBar.setStyle({ style: theme === "dark" ? sb.Style.Dark : sb.Style.Light });
    await sb.StatusBar.setOverlaysWebView({ overlay: false });
  } catch {}
}

/** Single entry point to bootstrap the native shell. Safe to call on web. */
export async function bootstrapMobileShell(router: { navigate: (path: string) => void }) {
  if (_ready) return;
  _ready = true;

  const platform = await getPlatform();
  if (platform === "web") return;

  await applyNativeChrome("light");
  await registerDeepLinks((path) => {
    // Hard guard: only navigate to in-app paths.
    if (path.startsWith("/")) router.navigate(path);
  });

  // Surface platform info for analytics / debug tooling.
  (window as any).__odhraNative = { platform, appId: NATIVE_APP_ID, site: siteUrl() };
}

/** Apple App Site Association / Android assetlinks payloads served from /.well-known */
export const ASSOC_FILES = {
  apple: {
    applinks: {
      apps: [],
      details: UNIVERSAL_LINK_DOMAINS.map((d) => ({
        appID: `TEAMID.${NATIVE_APP_ID}`,
        paths: ["*", "/product/*", "/order/*", "/category/*"],
      })),
    },
  },
  android: [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: NATIVE_APP_ID,
        sha256_cert_fingerprints: ["REPLACE_WITH_RELEASE_SHA256"],
      },
    },
  ],
};
