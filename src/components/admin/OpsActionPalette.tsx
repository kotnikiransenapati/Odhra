/**
 * Q3: Ops Action Palette — Cmd/Ctrl + Shift + K
 * High-impact ops shortcuts with confirmation guards for destructive actions.
 */
import { useEffect, useState } from "react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import {
  AlertTriangle, ShieldOff, ShieldCheck, Zap, Activity, PlayCircle, Siren, Radio,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { declareIncident } from "@/lib/incidentEngine";
import { runSmokeSuite, DEFAULT_JOURNEYS } from "@/lib/smokeHarness";
import { resolveNotificationTargets } from "@/lib/onCall";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type PendingAction =
  | { kind: "declare" }
  | { kind: "killswitch"; code: string; enabled: boolean }
  | { kind: "circuit"; service: string }
  | { kind: "ack_all" }
  | { kind: "smoke" }
  | { kind: "page_oncall" }
  | null;

export function OpsActionPalette() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);

  // form state
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<"info" | "minor" | "major" | "critical">("major");
  const [impact, setImpact] = useState("");
  const [code, setCode] = useState("");
  const [service, setService] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const queue = (a: NonNullable<PendingAction>) => { setOpen(false); setPending(a); };

  const userId = async () => (await supabase.auth.getUser()).data.user?.id ?? "";

  const exec = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const uid = await userId();
      if (pending.kind === "declare") {
        if (!title.trim()) throw new Error("Title required");
        const inc = await declareIncident({
          title, severity, impact: impact || undefined, createdBy: uid,
        });
        toast.success(`Incident ${inc.id.slice(0,8)} declared`);
      } else if (pending.kind === "killswitch") {
        if (!reason.trim()) throw new Error("Reason required for audit");
        const { error } = await (supabase.from("kill_switches") as any)
          .update({ enabled: pending.enabled, reason, toggled_by: uid, toggled_at: new Date().toISOString() })
          .eq("code", pending.code);
        if (error) throw error;
        toast.success(`Kill switch '${pending.code}' ${pending.enabled ? "ENABLED" : "disabled"}`);
      } else if (pending.kind === "circuit") {
        if (!reason.trim()) throw new Error("Reason required");
        const { error } = await (supabase.from("outbound_circuit_breakers") as any)
          .update({ state: "open", opened_at: new Date().toISOString(), cooldown_seconds: 300, last_failure_reason: reason })
          .eq("service_name", pending.service);
        if (error) throw error;
        toast.success(`Breaker '${pending.service}' forced open (5m cooldown)`);
      } else if (pending.kind === "ack_all") {
        const { error } = await (supabase.from("anomaly_alerts") as any)
          .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: uid })
          .is("acknowledged_at", null).is("resolved_at", null);
        if (error) throw error;
        toast.success("All open anomalies acknowledged");
      } else if (pending.kind === "smoke") {
        const res = await runSmokeSuite(DEFAULT_JOURNEYS, { env: "preview", baseUrl: window.location.origin });
        toast.success(`Smoke: ${res.passed}/${res.total} journeys passed`);
      } else if (pending.kind === "page_oncall") {
        const targets = await resolveNotificationTargets({
          severity, service: service || null, event_type: null,
        });
        const total = targets.reduce((n, t) => n + t.people.length, 0);
        toast.success(`Paged ${total} on-call across ${targets.length} routes`);
      }
      setPending(null);
      setTitle(""); setImpact(""); setReason(""); setCode(""); setService("");
    } catch (e: any) {
      toast.error(e?.message ?? "Action failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Ops actions… (Cmd/Ctrl + Shift + K)" />
        <CommandList>
          <CommandEmpty>No actions.</CommandEmpty>
          <CommandGroup heading="Incident">
            <CommandItem onSelect={() => queue({ kind: "declare" })}>
              <Siren className="mr-2 h-4 w-4 text-destructive" /> Declare incident…
            </CommandItem>
            <CommandItem onSelect={() => queue({ kind: "ack_all" })}>
              <Activity className="mr-2 h-4 w-4" /> Acknowledge all open anomalies
            </CommandItem>
            <CommandItem onSelect={() => queue({ kind: "page_oncall" })}>
              <Radio className="mr-2 h-4 w-4" /> Page on-call (test routing)
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Reliability">
            <CommandItem onSelect={() => queue({ kind: "killswitch", code: "", enabled: true })}>
              <ShieldOff className="mr-2 h-4 w-4 text-destructive" /> Enable kill switch…
            </CommandItem>
            <CommandItem onSelect={() => queue({ kind: "killswitch", code: "", enabled: false })}>
              <ShieldCheck className="mr-2 h-4 w-4" /> Disable kill switch…
            </CommandItem>
            <CommandItem onSelect={() => queue({ kind: "circuit", service: "" })}>
              <Zap className="mr-2 h-4 w-4 text-destructive" /> Force-open circuit breaker…
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Verification">
            <CommandItem onSelect={() => queue({ kind: "smoke" })}>
              <PlayCircle className="mr-2 h-4 w-4" /> Run smoke harness
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <Dialog open={!!pending} onOpenChange={(v) => !v && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Confirm ops action
            </DialogTitle>
          </DialogHeader>

          {pending?.kind === "declare" && (
            <div className="space-y-3">
              <Input placeholder="Incident title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Select value={severity} onValueChange={(v) => setSeverity(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["info","minor","major","critical"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea placeholder="Impact (optional)" value={impact} onChange={(e) => setImpact(e.target.value)} />
            </div>
          )}

          {pending?.kind === "killswitch" && (
            <div className="space-y-3">
              <Input placeholder="kill switch code (e.g. checkout_disabled)"
                value={pending.code} onChange={(e) => setPending({ ...pending, code: e.target.value })} />
              <Textarea placeholder="Reason (mandatory, audited)" value={reason} onChange={(e) => setReason(e.target.value)} />
              <p className="text-xs text-muted-foreground">Will set <code>enabled={String(pending.enabled)}</code>.</p>
            </div>
          )}

          {pending?.kind === "circuit" && (
            <div className="space-y-3">
              <Input placeholder="service name (e.g. razorpay)"
                value={pending.service} onChange={(e) => setPending({ ...pending, service: e.target.value })} />
              <Textarea placeholder="Reason (audited)" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          )}

          {pending?.kind === "page_oncall" && (
            <div className="space-y-3">
              <Select value={severity} onValueChange={(v) => setSeverity(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["info","minor","major","critical"].map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
              <Input placeholder="service filter (optional)" value={service} onChange={(e) => setService(e.target.value)} />
            </div>
          )}

          {(pending?.kind === "ack_all" || pending?.kind === "smoke") && (
            <p className="text-sm text-muted-foreground">Proceed with this action?</p>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setPending(null)} disabled={busy}>Cancel</Button>
            <Button onClick={exec} disabled={busy}>
              {busy ? "Working…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default OpsActionPalette;
