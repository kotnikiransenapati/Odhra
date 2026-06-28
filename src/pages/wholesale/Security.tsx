import { useCallback, useEffect, useMemo, useState } from "react";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { useWholesaler } from "@/hooks/useWholesaler";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Shield,
  Smartphone,
  Globe,
  History,
  Trash2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";

// ─── helpers ──────────────────────────────────────────────────────────────
async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function genRecoveryCodes(n = 8) {
  const out: string[] = [];
  const bytes = new Uint8Array(n * 5);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < n; i++) {
    const part = Array.from(bytes.slice(i * 5, i * 5 + 5))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    out.push(`${part.slice(0, 5)}-${part.slice(5, 10)}`);
  }
  return out;
}
async function deviceFingerprint() {
  const raw = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join("|");
  return (await sha256Hex(raw)).slice(0, 32);
}

interface Enrollment {
  id: string;
  status: "pending" | "active" | "disabled";
  enabled_at: string | null;
  last_verified_at: string | null;
}
interface Device {
  id: string;
  device_label: string | null;
  user_agent: string | null;
  ip_country: string | null;
  trusted: boolean;
  last_seen_at: string;
  expires_at: string;
  revoked_at: string | null;
  device_fingerprint: string;
}
interface IpEntry {
  id: string;
  cidr: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
}
interface AuditEvent {
  id: string;
  action: string;
  severity: "info" | "warning" | "critical";
  resource_type: string | null;
  metadata: any;
  created_at: string;
  step_up_verified: boolean;
}

export default function WholesaleSecurity() {
  const { account, userId, loading: accLoading } = useWholesaler();
  const wholesalerId = account?.id ?? null;

  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [ips, setIps] = useState<IpEntry[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // 2FA enrollment local state
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  // IP add form
  const [newCidr, setNewCidr] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const refresh = useCallback(async () => {
    if (!wholesalerId || !userId) return;
    setLoading(true);
    const [eRes, dRes, iRes, aRes] = await Promise.all([
      supabase
        .from("wholesale_2fa_enrollments" as any)
        .select("id,status,enabled_at,last_verified_at")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("wholesale_trusted_devices" as any)
        .select("*")
        .eq("user_id", userId)
        .order("last_seen_at", { ascending: false }),
      supabase
        .from("wholesale_ip_allowlist" as any)
        .select("*")
        .eq("wholesaler_id", wholesalerId)
        .order("created_at", { ascending: false }),
      supabase
        .from("wholesale_security_audit" as any)
        .select("id,action,severity,resource_type,metadata,created_at,step_up_verified")
        .eq("wholesaler_id", wholesalerId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    setEnrollment((eRes.data as any) ?? null);
    setDevices((dRes.data as any) ?? []);
    setIps((iRes.data as any) ?? []);
    setAudit((aRes.data as any) ?? []);
    setLoading(false);
  }, [wholesalerId, userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-register current device on first visit
  useEffect(() => {
    (async () => {
      if (!wholesalerId || !userId) return;
      const fp = await deviceFingerprint();
      await supabase.from("wholesale_trusted_devices" as any).upsert(
        {
          user_id: userId,
          wholesaler_id: wholesalerId,
          device_fingerprint: fp,
          device_label: /iPhone|iPad|Android/i.test(navigator.userAgent)
            ? "Mobile"
            : "Desktop",
          user_agent: navigator.userAgent,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "user_id,device_fingerprint" }
      );
    })();
  }, [wholesalerId, userId]);

  // ─── 2FA flows ──────────────────────────────────────────────────────────
  const startSetup = async () => {
    if (!account || !userId) return;
    setBusy(true);
    try {
      const secret = new OTPAuth.Secret({ size: 20 });
      const totp = new OTPAuth.TOTP({
        issuer: "Odhra B2B",
        label: account.contact_email || account.business_name,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret,
      });
      const url = totp.toString();
      const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 220 });
      setSetupSecret(secret.base32);
      setQrDataUrl(dataUrl);
      setRecoveryCodes(null);
      setVerifyCode("");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to start 2FA setup");
    } finally {
      setBusy(false);
    }
  };

  const confirmSetup = async () => {
    if (!setupSecret || !userId || !wholesalerId) return;
    if (verifyCode.length !== 6) {
      toast.error("Enter the 6-digit code from your authenticator");
      return;
    }
    setBusy(true);
    try {
      const totp = new OTPAuth.TOTP({
        issuer: "Odhra B2B",
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(setupSecret),
      });
      const delta = totp.validate({ token: verifyCode, window: 1 });
      if (delta === null) {
        toast.error("Invalid code — please try again");
        return;
      }
      const codes = genRecoveryCodes();
      const hashed = await Promise.all(codes.map((c) => sha256Hex(c)));

      // NOTE: TOTP secret is stored as-is — for production, encrypt via Vault/KMS.
      const { error } = await supabase.from("wholesale_2fa_enrollments" as any).upsert(
        {
          user_id: userId,
          wholesaler_id: wholesalerId,
          secret_encrypted: setupSecret,
          recovery_codes_hash: hashed,
          status: "active",
          enabled_at: new Date().toISOString(),
          last_verified_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      if (error) throw error;

      await supabase.rpc("log_wholesale_security_event" as any, {
        _wholesaler_id: wholesalerId,
        _action: "2fa_enable",
        _severity: "warning",
        _resource_type: "2fa",
        _resource_id: userId,
        _before: { status: enrollment?.status ?? "disabled" },
        _after: { status: "active" },
        _metadata: {},
      });

      setRecoveryCodes(codes);
      setSetupSecret(null);
      setQrDataUrl(null);
      setVerifyCode("");
      toast.success("Two-factor authentication enabled");
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to confirm 2FA");
    } finally {
      setBusy(false);
    }
  };

  const disable2fa = async () => {
    if (!userId || !wholesalerId) return;
    if (!confirm("Disable two-factor authentication? Your account will be less protected.")) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("wholesale_2fa_enrollments" as any)
        .update({ status: "disabled", disabled_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (error) throw error;
      await supabase.rpc("log_wholesale_security_event" as any, {
        _wholesaler_id: wholesalerId,
        _action: "2fa_disable",
        _severity: "critical",
        _resource_type: "2fa",
        _resource_id: userId,
        _before: { status: "active" },
        _after: { status: "disabled" },
        _metadata: {},
      });
      toast.success("2FA disabled");
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to disable 2FA");
    } finally {
      setBusy(false);
    }
  };

  // ─── Devices ────────────────────────────────────────────────────────────
  const revokeDevice = async (d: Device) => {
    if (!wholesalerId) return;
    await supabase
      .from("wholesale_trusted_devices" as any)
      .update({ revoked_at: new Date().toISOString(), trusted: false })
      .eq("id", d.id);
    await supabase.rpc("log_wholesale_security_event" as any, {
      _wholesaler_id: wholesalerId,
      _action: "device_revoke",
      _severity: "warning",
      _resource_type: "device",
      _resource_id: d.id,
      _before: { trusted: d.trusted },
      _after: { trusted: false },
      _metadata: { device_label: d.device_label },
    });
    toast.success("Device revoked");
    refresh();
  };

  // ─── IP allowlist ───────────────────────────────────────────────────────
  const addIp = async () => {
    if (!wholesalerId) return;
    const cidr = newCidr.trim();
    if (!/^\d{1,3}(\.\d{1,3}){3}(\/\d{1,2})?$/.test(cidr)) {
      toast.error("Enter a valid IPv4 or CIDR e.g. 203.0.113.10/32");
      return;
    }
    const { error } = await supabase.from("wholesale_ip_allowlist" as any).insert({
      wholesaler_id: wholesalerId,
      cidr: cidr.includes("/") ? cidr : `${cidr}/32`,
      label: newLabel || null,
      created_by: userId,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.rpc("log_wholesale_security_event" as any, {
      _wholesaler_id: wholesalerId,
      _action: "ip_allowlist_add",
      _severity: "warning",
      _resource_type: "ip_allowlist",
      _resource_id: null,
      _before: null,
      _after: { cidr, label: newLabel },
      _metadata: {},
    });
    setNewCidr("");
    setNewLabel("");
    toast.success("IP added to allowlist");
    refresh();
  };

  const removeIp = async (entry: IpEntry) => {
    if (!wholesalerId) return;
    await supabase.from("wholesale_ip_allowlist" as any).delete().eq("id", entry.id);
    await supabase.rpc("log_wholesale_security_event" as any, {
      _wholesaler_id: wholesalerId,
      _action: "ip_allowlist_remove",
      _severity: "warning",
      _resource_type: "ip_allowlist",
      _resource_id: entry.id,
      _before: { cidr: entry.cidr },
      _after: null,
      _metadata: {},
    });
    toast.success("IP removed");
    refresh();
  };

  const sevColor = (s: AuditEvent["severity"]) =>
    s === "critical"
      ? "bg-destructive/15 text-destructive border-destructive/30"
      : s === "warning"
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
      : "bg-muted text-muted-foreground border-border";

  const is2faActive = enrollment?.status === "active";

  if (accLoading || loading) {
    return (
      <div className="min-h-[40vh] grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" /> Security Center
        </h1>
        <p className="text-sm text-muted-foreground">
          Protect your wholesale account with 2FA, trusted devices, and IP restrictions.
        </p>
      </div>

      {/* 2FA */}
      <Card className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-semibold flex items-center gap-2">
              <Smartphone className="h-4 w-4" /> Two-Factor Authentication (TOTP)
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Add a code from Google Authenticator, Authy, or 1Password to every sign-in.
            </p>
          </div>
          {is2faActive ? (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Active
            </Badge>
          ) : (
            <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3 mr-1" /> Not enabled
            </Badge>
          )}
        </div>

        {!is2faActive && !setupSecret && (
          <Button onClick={startSetup} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Enable 2FA
          </Button>
        )}

        {setupSecret && qrDataUrl && (
          <div className="grid md:grid-cols-[220px,1fr] gap-5 items-start border-t pt-4">
            <img src={qrDataUrl} alt="2FA QR code" className="rounded-md border" />
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Manual key (if you can't scan)</Label>
                <code className="block text-xs bg-muted p-2 rounded mt-1 break-all">
                  {setupSecret}
                </code>
              </div>
              <div>
                <Label>Enter the 6-digit code</Label>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                  className="w-32 tracking-widest text-center"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={confirmSetup} disabled={busy || verifyCode.length !== 6}>
                  Verify & activate
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSetupSecret(null);
                    setQrDataUrl(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {recoveryCodes && (
          <div className="border-t pt-4">
            <div className="font-medium mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Save these recovery codes
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Store them somewhere safe — each can be used once if you lose your device.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-sm">
              {recoveryCodes.map((c) => (
                <code key={c} className="bg-muted px-2 py-1 rounded text-center">
                  {c}
                </code>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                navigator.clipboard.writeText(recoveryCodes.join("\n"));
                toast.success("Copied");
              }}
            >
              Copy all
            </Button>
          </div>
        )}

        {is2faActive && (
          <Button variant="outline" onClick={disable2fa} disabled={busy}>
            Disable 2FA
          </Button>
        )}
      </Card>

      {/* Trusted devices */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold flex items-center gap-2">
            <Smartphone className="h-4 w-4" /> Trusted Devices
          </div>
          <span className="text-xs text-muted-foreground">{devices.length} device(s)</span>
        </div>
        {devices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No devices registered yet.</p>
        ) : (
          <div className="divide-y">
            {devices.map((d) => {
              const expired = new Date(d.expires_at) < new Date();
              return (
                <div key={d.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {d.device_label || "Device"}{" "}
                      {d.revoked_at && (
                        <Badge variant="outline" className="ml-1 text-xs">
                          revoked
                        </Badge>
                      )}
                      {!d.revoked_at && expired && (
                        <Badge variant="outline" className="ml-1 text-xs">
                          expired
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      Last seen {new Date(d.last_seen_at).toLocaleString()} ·{" "}
                      {d.user_agent?.slice(0, 60)}
                    </div>
                  </div>
                  {!d.revoked_at && (
                    <Button size="sm" variant="ghost" onClick={() => revokeDevice(d)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* IP allowlist */}
      <Card className="p-5">
        <div className="font-semibold flex items-center gap-2 mb-1">
          <Globe className="h-4 w-4" /> IP Allowlist
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Optional — when set, only listed IPs can access sensitive billing actions.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <Input
            placeholder="203.0.113.10 or 203.0.113.0/24"
            value={newCidr}
            onChange={(e) => setNewCidr(e.target.value)}
            className="sm:max-w-xs"
          />
          <Input
            placeholder="Label (Office, Warehouse...)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="sm:max-w-xs"
          />
          <Button onClick={addIp}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
        {ips.length === 0 ? (
          <p className="text-sm text-muted-foreground">No restrictions configured.</p>
        ) : (
          <div className="divide-y">
            {ips.map((e) => (
              <div key={e.id} className="py-2 flex items-center justify-between">
                <div>
                  <code className="text-sm">{e.cidr}</code>
                  {e.label && (
                    <span className="text-xs text-muted-foreground ml-2">{e.label}</span>
                  )}
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeIp(e)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Audit log */}
      <Card className="p-5">
        <div className="font-semibold flex items-center gap-2 mb-3">
          <History className="h-4 w-4" /> Recent Security Activity
        </div>
        {audit.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {audit.map((e) => (
              <div
                key={e.id}
                className={`text-sm border rounded-md px-3 py-2 ${sevColor(e.severity)}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{e.action}</span>
                  <span className="text-xs opacity-70">
                    {new Date(e.created_at).toLocaleString()}
                  </span>
                </div>
                {e.resource_type && (
                  <div className="text-xs opacity-80 mt-0.5">{e.resource_type}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
