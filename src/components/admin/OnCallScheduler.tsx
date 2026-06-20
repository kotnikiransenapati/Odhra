/**
 * Q4: On-Call Scheduler & Notification Routing UI
 * - Manage schedules, rotation windows, and routes that connect alerts → people.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { CalendarClock, Plus, UserPlus, Radio, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getCurrentOnCall, type OnCallPerson, type RouteChannel } from "@/lib/onCall";

type Schedule = { id: string; name: string; description: string | null; timezone: string; is_active: boolean };
type Rotation = {
  id: string; schedule_id: string; user_id: string; user_name: string | null;
  contact_email: string | null; contact_phone: string | null;
  starts_at: string; ends_at: string; level: number;
};
type Route = {
  id: string; name: string;
  match_severity: string[]; match_services: string[]; match_event_types: string[];
  schedule_id: string | null; channels: RouteChannel[];
  escalate_after_minutes: number; is_active: boolean; priority: number;
};

export function OnCallScheduler() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [rotations, setRotations] = useState<Rotation[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [activeSchedule, setActiveSchedule] = useState<string | null>(null);
  const [onCallNow, setOnCallNow] = useState<OnCallPerson[]>([]);

  const load = async () => {
    const [{ data: s }, { data: r }, { data: nr }] = await Promise.all([
      (supabase.from("on_call_schedules") as any).select("*").order("created_at", { ascending: false }),
      (supabase.from("on_call_rotations") as any).select("*").order("starts_at", { ascending: true }),
      (supabase.from("notification_routes") as any).select("*").order("priority", { ascending: true }),
    ]);
    setSchedules((s ?? []) as Schedule[]);
    setRotations((r ?? []) as Rotation[]);
    setRoutes((nr ?? []) as Route[]);
    if (!activeSchedule && s?.[0]) setActiveSchedule(s[0].id);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!activeSchedule) return;
    getCurrentOnCall(activeSchedule).then(setOnCallNow).catch(() => setOnCallNow([]));
  }, [activeSchedule, rotations]);

  const rotationsForActive = useMemo(
    () => rotations.filter((r) => r.schedule_id === activeSchedule),
    [rotations, activeSchedule]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5" /> On-Call & Notification Routing
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="schedules">
          <TabsList>
            <TabsTrigger value="schedules">Schedules</TabsTrigger>
            <TabsTrigger value="rotations">Rotations</TabsTrigger>
            <TabsTrigger value="routes">Routes</TabsTrigger>
          </TabsList>

          {/* SCHEDULES */}
          <TabsContent value="schedules" className="space-y-3">
            <NewScheduleDialog onCreated={load} />
            <div className="grid gap-2">
              {schedules.map((s) => (
                <div key={s.id}
                  className={`rounded-md border p-3 cursor-pointer ${activeSchedule === s.id ? "border-primary" : ""}`}
                  onClick={() => setActiveSchedule(s.id)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.description ?? "—"} · {s.timezone}</div>
                    </div>
                    <Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "active" : "off"}</Badge>
                  </div>
                </div>
              ))}
              {!schedules.length && <p className="text-sm text-muted-foreground">No schedules yet.</p>}
            </div>

            {activeSchedule && (
              <Card className="bg-muted/30">
                <CardHeader><CardTitle className="text-sm">On call right now</CardTitle></CardHeader>
                <CardContent className="space-y-1">
                  {onCallNow.length === 0 && <p className="text-sm text-muted-foreground">No one on-call.</p>}
                  {onCallNow.map((p) => (
                    <div key={p.user_id + p.level} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">L{p.level}</Badge>
                      <span>{p.user_name ?? p.user_id.slice(0, 8)}</span>
                      <span className="text-muted-foreground">{p.contact_email ?? p.contact_phone ?? ""}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ROTATIONS */}
          <TabsContent value="rotations" className="space-y-3">
            {!activeSchedule && <p className="text-sm text-muted-foreground">Pick a schedule first.</p>}
            {activeSchedule && (
              <>
                <NewRotationDialog scheduleId={activeSchedule} onCreated={load} />
                <div className="grid gap-2">
                  {rotationsForActive.map((r) => (
                    <div key={r.id} className="rounded-md border p-3 flex items-center justify-between">
                      <div className="text-sm">
                        <div className="font-medium">
                          {r.user_name ?? r.user_id.slice(0, 8)} <Badge variant="outline" className="ml-1">L{r.level}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(r.starts_at).toLocaleString()} → {new Date(r.ends_at).toLocaleString()}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={async () => {
                        const { error } = await (supabase.from("on_call_rotations") as any).delete().eq("id", r.id);
                        if (error) toast.error(error.message); else { toast.success("Removed"); load(); }
                      }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                  {!rotationsForActive.length && <p className="text-sm text-muted-foreground">No rotations.</p>}
                </div>
              </>
            )}
          </TabsContent>

          {/* ROUTES */}
          <TabsContent value="routes" className="space-y-3">
            <NewRouteDialog schedules={schedules} onCreated={load} />
            <div className="grid gap-2">
              {routes.map((r) => (
                <div key={r.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        <Radio className="h-4 w-4" /> {r.name}
                        <Badge variant="outline">P{r.priority}</Badge>
                        {!r.is_active && <Badge variant="secondary">off</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Severity: {r.match_severity.join(", ") || "any"} ·
                        Services: {r.match_services.join(", ") || "any"} ·
                        Escalate after {r.escalate_after_minutes}m
                      </div>
                      <div className="text-xs mt-1">
                        Channels: {r.channels.map((c) => c.type).join(", ") || "—"}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={async () => {
                      const { error } = await (supabase.from("notification_routes") as any).delete().eq("id", r.id);
                      if (error) toast.error(error.message); else { toast.success("Removed"); load(); }
                    }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
              {!routes.length && <p className="text-sm text-muted-foreground">No routes configured.</p>}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

/* ---------------- Dialog helpers ---------------- */

function NewScheduleDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(""); const [desc, setDesc] = useState("");
  const [tz, setTz] = useState("Asia/Kolkata");
  const submit = async () => {
    const uid = (await supabase.auth.getUser()).data.user?.id;
    const { error } = await (supabase.from("on_call_schedules") as any)
      .insert({ name, description: desc, timezone: tz, created_by: uid });
    if (error) { toast.error(error.message); return; }
    toast.success("Schedule created"); setOpen(false); setName(""); setDesc(""); onCreated();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New schedule</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New schedule</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <Input placeholder="Timezone" value={tz} onChange={(e) => setTz(e.target.value)} />
        </div>
        <DialogFooter><Button onClick={submit} disabled={!name.trim()}>Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewRotationDialog({ scheduleId, onCreated }: { scheduleId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState(""); const [name, setName] = useState("");
  const [email, setEmail] = useState(""); const [phone, setPhone] = useState("");
  const [starts, setStarts] = useState(""); const [ends, setEnds] = useState("");
  const [level, setLevel] = useState("1");
  const submit = async () => {
    const { error } = await (supabase.from("on_call_rotations") as any).insert({
      schedule_id: scheduleId, user_id: userId, user_name: name,
      contact_email: email || null, contact_phone: phone || null,
      starts_at: starts, ends_at: ends, level: Number(level),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Rotation added"); setOpen(false); onCreated();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><UserPlus className="h-4 w-4 mr-1" /> Add rotation</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add rotation</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="User ID (auth.users.id)" value={userId} onChange={(e) => setUserId(e.target.value)} />
          <Input placeholder="Display name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <div className="space-y-1"><Label className="text-xs">Starts</Label>
            <Input type="datetime-local" value={starts} onChange={(e) => setStarts(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Ends</Label>
            <Input type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} /></div>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">L1 · Primary</SelectItem>
              <SelectItem value="2">L2 · Secondary</SelectItem>
              <SelectItem value="3">L3 · Escalation</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={!userId || !starts || !ends}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewRouteDialog({ schedules, onCreated }: { schedules: Schedule[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [severity, setSeverity] = useState("major,critical");
  const [services, setServices] = useState("");
  const [scheduleId, setScheduleId] = useState<string>("");
  const [channels, setChannels] = useState("email,push");
  const [escalate, setEscalate] = useState("15");
  const [priority, setPriority] = useState("100");
  const [active, setActive] = useState(true);

  const submit = async () => {
    const uid = (await supabase.auth.getUser()).data.user?.id;
    const ch = channels.split(",").map((s) => s.trim()).filter(Boolean).map((type) => ({ type }));
    const { error } = await (supabase.from("notification_routes") as any).insert({
      name,
      match_severity: severity.split(",").map((s) => s.trim()).filter(Boolean),
      match_services: services ? services.split(",").map((s) => s.trim()).filter(Boolean) : [],
      schedule_id: scheduleId || null,
      channels: ch,
      escalate_after_minutes: Number(escalate),
      priority: Number(priority),
      is_active: active,
      created_by: uid,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Route created"); setOpen(false); onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New route</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New notification route</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="Route name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Severities (comma)" value={severity} onChange={(e) => setSeverity(e.target.value)} />
          <Input placeholder="Services (comma, blank=any)" value={services} onChange={(e) => setServices(e.target.value)} />
          <Select value={scheduleId} onValueChange={setScheduleId}>
            <SelectTrigger><SelectValue placeholder="Schedule" /></SelectTrigger>
            <SelectContent>
              {schedules.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Channels (email,sms,push,whatsapp)" value={channels} onChange={(e) => setChannels(e.target.value)} />
          <Input placeholder="Escalate after (min)" value={escalate} onChange={(e) => setEscalate(e.target.value)} />
          <Input placeholder="Priority" value={priority} onChange={(e) => setPriority(e.target.value)} />
          <div className="flex items-center gap-2"><Switch checked={active} onCheckedChange={setActive} /><Label>Active</Label></div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={!name.trim()}>Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default OnCallScheduler;
