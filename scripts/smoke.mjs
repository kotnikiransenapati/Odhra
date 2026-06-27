#!/usr/bin/env node
/**
 * Production smoke test harness.
 *
 * Usage:
 *   node scripts/smoke.mjs https://your-domain.example
 *
 * Checks:
 *   1. / responds 200 and contains <title>.
 *   2. /healthz responds 200 with JSON { status: "ok" | "degraded" }.
 *   3. /shop responds 200.
 *   4. /robots.txt and /sitemap.xml are reachable.
 *   5. Security headers are present (CSP, X-Content-Type-Options, Referrer-Policy).
 *
 * Exits with non-zero status on any failure — wire into CI after deploy.
 */

const base = process.argv[2] || process.env.SMOKE_BASE_URL;
if (!base) {
  console.error("Usage: node scripts/smoke.mjs <base-url>");
  process.exit(2);
}

const results = [];
function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  const tag = ok ? "✓" : "✗";
  console.log(`${tag} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function check(path, validate) {
  const url = new URL(path, base).toString();
  try {
    const res = await fetch(url, { redirect: "follow" });
    await validate(res, url);
  } catch (err) {
    record(`GET ${path}`, false, err?.message || String(err));
  }
}

await check("/", async (res) => {
  const ok = res.status === 200;
  const body = ok ? await res.text() : "";
  record("Home loads", ok && body.includes("<title"), `status=${res.status}`);
  const csp = res.headers.get("content-security-policy");
  record("CSP header present", Boolean(csp));
  record(
    "Referrer-Policy present",
    Boolean(res.headers.get("referrer-policy"))
  );
  record(
    "X-Content-Type-Options present",
    res.headers.get("x-content-type-options") === "nosniff"
  );
});

await check("/healthz", async (res) => {
  const ok = res.status === 200;
  let payload = null;
  try {
    payload = await res.json();
  } catch {
    /* ignore */
  }
  record(
    "/healthz responds",
    ok && payload && (payload.status === "ok" || payload.status === "degraded"),
    `status=${res.status} body.status=${payload?.status}`
  );
});

await check("/shop", async (res) => {
  record("Shop loads", res.status === 200, `status=${res.status}`);
});

await check("/robots.txt", async (res) => {
  record("robots.txt reachable", res.status === 200, `status=${res.status}`);
});

await check("/sitemap.xml", async (res) => {
  record("sitemap.xml reachable", res.status === 200, `status=${res.status}`);
});

const failed = results.filter((r) => !r.ok);
console.log(
  `\nSmoke summary: ${results.length - failed.length}/${results.length} passed`
);
if (failed.length > 0) {
  console.error("Failures:", failed.map((f) => f.name).join(", "));
  process.exit(1);
}
