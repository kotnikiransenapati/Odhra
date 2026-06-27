/**
 * Typed, validated environment layer for Odhra.
 *
 * - Parses `import.meta.env` at module load with Zod
 * - Fails fast in dev, warns in prod (never crashes the bundle)
 * - All optional integrations are gated by `enabled` flags
 * - Use `env` everywhere instead of `import.meta.env.*`
 */
import { z } from "zod";

const truthy = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((v) => {
    if (typeof v === "boolean") return v;
    if (!v) return false;
    return ["1", "true", "yes", "on"].includes(v.toLowerCase());
  });

const optionalUrl = z
  .string()
  .url()
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalStr = z
  .string()
  .min(1)
  .optional()
  .or(z.literal("").transform(() => undefined));

const Schema = z.object({
  // --- Core (required) ---
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  VITE_SUPABASE_PROJECT_ID: z.string().min(1),

  // --- Site identity ---
  VITE_SITE_URL: optionalUrl,
  VITE_SITE_NAME: optionalStr,
  VITE_SUPPORT_EMAIL: optionalStr,

  // --- Payments ---
  VITE_PAYMENT_PROVIDER: z
    .enum(["razorpay", "stripe", "paypal", "none"])
    .optional()
    .default("razorpay"),
  VITE_RAZORPAY_KEY_ID: optionalStr,
  VITE_STRIPE_PUBLISHABLE_KEY: optionalStr,

  // --- Analytics & telemetry ---
  VITE_GA4_MEASUREMENT_ID: optionalStr,
  VITE_META_PIXEL_ID: optionalStr,
  VITE_SENTRY_DSN: optionalUrl,
  VITE_POSTHOG_KEY: optionalStr,
  VITE_POSTHOG_HOST: optionalUrl,

  // --- Search ---
  VITE_SEARCH_PROVIDER: z
    .enum(["algolia", "meilisearch", "postgres"])
    .optional()
    .default("postgres"),
  VITE_ALGOLIA_APP_ID: optionalStr,
  VITE_ALGOLIA_SEARCH_KEY: optionalStr,
  VITE_MEILISEARCH_HOST: optionalUrl,
  VITE_MEILISEARCH_SEARCH_KEY: optionalStr,

  // --- Maps / location ---
  VITE_GOOGLE_MAPS_KEY: optionalStr,

  // --- Feature toggles (build-time) ---
  VITE_ENABLE_PWA: truthy,
  VITE_ENABLE_LIVE_CHAT: truthy,
  VITE_ENABLE_VOICE_SEARCH: truthy,
  VITE_ENABLE_AB_TESTING: truthy,
});

export type AppEnv = z.infer<typeof Schema>;

function parseEnv(): AppEnv {
  const raw = (typeof import.meta !== "undefined" ? import.meta.env : {}) as Record<
    string,
    unknown
  >;
  const result = Schema.safeParse(raw);
  if (result.success) return result.data;

  const issues = result.error.issues
    .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  const message = `[env] Invalid environment configuration:\n${issues}`;

  if (import.meta.env.DEV) {
    // Fail fast during development
    throw new Error(message);
  }

  // In production, warn loudly but keep the app running with defaults
  // (missing optional fields just disable their features).
  // eslint-disable-next-line no-console
  console.error(message);
  // Best-effort partial parse: drop invalid fields.
  const partial: Record<string, unknown> = {};
  for (const key of Object.keys(Schema.shape)) {
    const v = raw[key];
    if (v !== undefined && v !== "") partial[key] = v;
  }
  // Re-attempt with partial; if still invalid, return minimal shape.
  const retry = Schema.safeParse(partial);
  if (retry.success) return retry.data;
  return {
    VITE_SUPABASE_URL: String(raw.VITE_SUPABASE_URL ?? ""),
    VITE_SUPABASE_PUBLISHABLE_KEY: String(raw.VITE_SUPABASE_PUBLISHABLE_KEY ?? ""),
    VITE_SUPABASE_PROJECT_ID: String(raw.VITE_SUPABASE_PROJECT_ID ?? ""),
    VITE_PAYMENT_PROVIDER: "razorpay",
    VITE_SEARCH_PROVIDER: "postgres",
    VITE_ENABLE_PWA: false,
    VITE_ENABLE_LIVE_CHAT: false,
    VITE_ENABLE_VOICE_SEARCH: false,
    VITE_ENABLE_AB_TESTING: false,
  } as AppEnv;
}

export const env: AppEnv = parseEnv();

/** Convenience grouped accessors so call-sites read clean. */
export const integrations = {
  payments: {
    provider: env.VITE_PAYMENT_PROVIDER,
    razorpay: env.VITE_RAZORPAY_KEY_ID
      ? { keyId: env.VITE_RAZORPAY_KEY_ID }
      : null,
    stripe: env.VITE_STRIPE_PUBLISHABLE_KEY
      ? { publishableKey: env.VITE_STRIPE_PUBLISHABLE_KEY }
      : null,
  },
  analytics: {
    ga4: env.VITE_GA4_MEASUREMENT_ID ?? null,
    metaPixel: env.VITE_META_PIXEL_ID ?? null,
    sentry: env.VITE_SENTRY_DSN ?? null,
    posthog:
      env.VITE_POSTHOG_KEY && env.VITE_POSTHOG_HOST
        ? { key: env.VITE_POSTHOG_KEY, host: env.VITE_POSTHOG_HOST }
        : null,
  },
  search: {
    provider: env.VITE_SEARCH_PROVIDER,
    algolia:
      env.VITE_ALGOLIA_APP_ID && env.VITE_ALGOLIA_SEARCH_KEY
        ? { appId: env.VITE_ALGOLIA_APP_ID, searchKey: env.VITE_ALGOLIA_SEARCH_KEY }
        : null,
    meilisearch:
      env.VITE_MEILISEARCH_HOST && env.VITE_MEILISEARCH_SEARCH_KEY
        ? { host: env.VITE_MEILISEARCH_HOST, searchKey: env.VITE_MEILISEARCH_SEARCH_KEY }
        : null,
  },
  maps: {
    googleApiKey: env.VITE_GOOGLE_MAPS_KEY ?? null,
  },
} as const;

export const features = {
  pwa: env.VITE_ENABLE_PWA,
  liveChat: env.VITE_ENABLE_LIVE_CHAT,
  voiceSearch: env.VITE_ENABLE_VOICE_SEARCH,
  abTesting: env.VITE_ENABLE_AB_TESTING,
} as const;

export const site = {
  name: env.VITE_SITE_NAME ?? "Odhra",
  supportEmail: env.VITE_SUPPORT_EMAIL ?? "support@odhra.app",
  /** Configured public URL (may be empty in dev/preview). */
  configuredUrl: env.VITE_SITE_URL ?? null,
} as const;
