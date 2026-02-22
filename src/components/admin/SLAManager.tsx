import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Clock, Plus, Edit2, Trash2, Loader2, MessageSquare, Tag, Link2,
  AlertTriangle, Shield, BarChart3, CheckCircle, XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow, differenceInHours, isPast } from 'date-fns';

// ==================== SLA Policies Tab ====================
function SLAPoliciesTab() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    name: '', description: '', priority: 'medium',
    first_response_hours: '4', resolution_hours: '24', escalation_hours: '8', is_active: true,
  });

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ['sla-policies'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('sla_policies') as any).select('*').order('priority');
      if (error) throw error;
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        name: data.name, description: data.description || null, priority: data.priority,
        first_response_hours: Number(data.first_response_hours), resolution_hours: Number(data.resolution_hours),
        escalation_hours: Number(data.escalation_hours), is_active: data.is_active,
      };
      if (editing) {
        const { error } = await (supabase.from('sla_policies') as any).update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('sla_policies') as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-policies'] });
      setShowDialog(false);
      setEditing(null);
      toast.success('SLA policy saved');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('sla_policies') as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-policies'] });
      toast.success('SLA policy deleted');
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setForm({ name: '', description: '', priority: 'medium', first_response_hours: '4', resolution_hours: '24', escalation_hours: '8', is_active: true }); setShowDialog(true); }} className="gap-2">
          <Plus className="w-4 h-4" />Add SLA Policy
        </Button>
      </div>
      <Card className="glass">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Policy</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>First Response</TableHead>
                <TableHead>Resolution</TableHead>
                <TableHead>Escalation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : policies.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No SLA policies defined</TableCell></TableRow>
              ) : (
                policies.map((policy: any) => (
                  <TableRow key={policy.id}>
                    <TableCell>
                      <div><p className="font-medium">{policy.name}</p>{policy.description && <p className="text-xs text-muted-foreground">{policy.description}</p>}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`capitalize ${policy.priority === 'urgent' ? 'border-destructive text-destructive' : policy.priority === 'high' ? 'border-warning text-warning' : ''}`}>
                        {policy.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>{policy.first_response_hours}h</TableCell>
                    <TableCell>{policy.resolution_hours}h</TableCell>
                    <TableCell>{policy.escalation_hours}h</TableCell>
                    <TableCell><Badge variant={policy.is_active ? 'default' : 'secondary'}>{policy.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(policy); setForm({ name: policy.name, description: policy.description || '', priority: policy.priority, first_response_hours: String(policy.first_response_hours), resolution_hours: String(policy.resolution_hours), escalation_hours: String(policy.escalation_hours), is_active: policy.is_active }); setShowDialog(true); }}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteMutation.mutate(policy.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} SLA Policy</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium">Policy Name</label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><label className="text-sm font-medium">Description</label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div>
              <label className="text-sm font-medium">Priority Level</label>
              <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-sm font-medium">First Response (hrs)</label><Input type="number" value={form.first_response_hours} onChange={e => setForm(p => ({ ...p, first_response_hours: e.target.value }))} /></div>
              <div><label className="text-sm font-medium">Resolution (hrs)</label><Input type="number" value={form.resolution_hours} onChange={e => setForm(p => ({ ...p, resolution_hours: e.target.value }))} /></div>
              <div><label className="text-sm font-medium">Escalation (hrs)</label><Input type="number" value={form.escalation_hours} onChange={e => setForm(p => ({ ...p, escalation_hours: e.target.value }))} /></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} /><span className="text-sm">Active</span></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button disabled={!form.name} onClick={() => saveMutation.mutate(form)}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== Canned Responses Tab ====================
function CannedResponsesTab() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', category: 'general', shortcut: '', body: '', is_active: true });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['ticket-templates'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('ticket_templates') as any).select('*').order('category');
      if (error) throw error;
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editing) {
        const { error } = await (supabase.from('ticket_templates') as any).update(data).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('ticket_templates') as any).insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-templates'] });
      setShowDialog(false);
      setEditing(null);
      toast.success('Template saved');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('ticket_templates') as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-templates'] });
      toast.success('Template deleted');
    },
  });

  const categories = [...new Set(templates.map((t: any) => t.category))] as string[];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setForm({ name: '', category: 'general', shortcut: '', body: '', is_active: true }); setShowDialog(true); }} className="gap-2">
          <Plus className="w-4 h-4" />Add Template
        </Button>
      </div>

      {categories.map((cat: string) => (
        <div key={cat}>
          <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-2">{cat}</h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.filter((t: any) => t.category === cat).map((template: any) => (
              <Card key={template.id} className="glass">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{template.name}</p>
                      {template.shortcut && <Badge variant="outline" className="text-[10px] font-mono mt-1">{template.shortcut}</Badge>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditing(template); setForm(template); setShowDialog(true); }}><Edit2 className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteMutation.mutate(template.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3">{template.body}</p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Used {template.usage_count || 0} times</span>
                    <Badge variant={template.is_active ? 'default' : 'secondary'} className="text-[10px]">{template.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {templates.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No canned responses yet. Create your first template above.</p>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} Canned Response</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium">Name</label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="order">Order</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
                    <SelectItem value="shipping">Shipping</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="greeting">Greeting</SelectItem>
                    <SelectItem value="closing">Closing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><label className="text-sm font-medium">Shortcut</label><Input value={form.shortcut} onChange={e => setForm(p => ({ ...p, shortcut: e.target.value }))} placeholder="/refund" /></div>
            </div>
            <div><label className="text-sm font-medium">Response Body</label><Textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} rows={5} placeholder="Hi {{customer_name}}, ..." /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} /><span className="text-sm">Active</span></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button disabled={!form.name || !form.body} onClick={() => saveMutation.mutate(form)}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== Ticket Tags Tab ====================
function TicketTagsTab() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ name: '', color: '#6366f1', description: '' });

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['ticket-tags'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('ticket_tags') as any).select('*').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase.from('ticket_tags') as any).insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-tags'] });
      setShowDialog(false);
      toast.success('Tag created');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('ticket_tags') as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-tags'] });
      toast.success('Tag deleted');
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setForm({ name: '', color: '#6366f1', description: '' }); setShowDialog(true); }} className="gap-2">
          <Plus className="w-4 h-4" />Add Tag
        </Button>
      </div>
      <div className="flex flex-wrap gap-3">
        {tags.map((tag: any) => (
          <div key={tag.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
            <span className="text-sm font-medium">{tag.name}</span>
            {tag.description && <span className="text-xs text-muted-foreground">— {tag.description}</span>}
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteMutation.mutate(tag.id)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
        {tags.length === 0 && !isLoading && (
          <p className="text-muted-foreground text-sm">No ticket tags created yet</p>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Ticket Tag</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium">Tag Name</label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><label className="text-sm font-medium">Color</label><Input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} className="h-10 w-20" /></div>
            <div><label className="text-sm font-medium">Description</label><Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button disabled={!form.name} onClick={() => saveMutation.mutate(form)}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== Main Export ====================
export function SLAManager() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Support Configuration</h2>
        <p className="text-muted-foreground text-sm">Manage SLA policies, canned responses, ticket tags, and workflows</p>
      </div>

      <Tabs defaultValue="sla">
        <TabsList>
          <TabsTrigger value="sla" className="gap-2"><Clock className="w-4 h-4" />SLA Policies</TabsTrigger>
          <TabsTrigger value="templates" className="gap-2"><MessageSquare className="w-4 h-4" />Canned Responses</TabsTrigger>
          <TabsTrigger value="tags" className="gap-2"><Tag className="w-4 h-4" />Ticket Tags</TabsTrigger>
        </TabsList>

        <TabsContent value="sla"><SLAPoliciesTab /></TabsContent>
        <TabsContent value="templates"><CannedResponsesTab /></TabsContent>
        <TabsContent value="tags"><TicketTagsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
