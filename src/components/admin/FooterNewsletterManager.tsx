import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Mail, Users, Trash2, Download, Search, Eye, MessageSquare,
  CheckCircle2, XCircle, Clock, Loader2, Send, AlertTriangle,
  Inbox, UserCheck, MailX, FileText,
} from 'lucide-react';

// ===== Newsletter Subscribers =====
function useNewsletterSubscribers() {
  return useQuery({
    queryKey: ['admin-newsletter-subscribers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

function useContactSubmissions() {
  return useQuery({
    queryKey: ['admin-contact-submissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_submissions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function FooterNewsletterManager() {
  const [activeTab, setActiveTab] = useState('subscribers');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Newsletter & Contact Manager</h2>
        <p className="text-muted-foreground">Manage newsletter subscribers, contact form submissions, and footer content</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="subscribers" className="gap-2"><Mail className="w-4 h-4" /> Newsletter</TabsTrigger>
          <TabsTrigger value="contacts" className="gap-2"><MessageSquare className="w-4 h-4" /> Contact Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="subscribers"><SubscribersTab /></TabsContent>
        <TabsContent value="contacts"><ContactsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function SubscribersTab() {
  const { data: subscribers, isLoading } = useNewsletterSubscribers();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('newsletter_subscribers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-newsletter-subscribers'] });
      toast.success('Subscriber removed');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === 'unsubscribed') updates.unsubscribed_at = new Date().toISOString();
      const { error } = await supabase.from('newsletter_subscribers').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-newsletter-subscribers'] });
      toast.success('Status updated');
    },
  });

  const filtered = (subscribers || []).filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (search && !s.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const activeCount = (subscribers || []).filter(s => s.status === 'active').length;
  const unsubCount = (subscribers || []).filter(s => s.status === 'unsubscribed').length;

  const handleExport = () => {
    const csv = ['Email,Status,Source,Subscribed At', ...filtered.map(s =>
      `"${s.email}","${s.status}","${s.source}","${s.subscribed_at}"`
    )].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `newsletter_subscribers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported successfully');
  };

  if (isLoading) return <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;

  return (
    <div className="space-y-4 mt-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Users className="w-4 h-4" /> Total</div>
          <p className="text-2xl font-bold mt-1">{subscribers?.length || 0}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-green-600"><UserCheck className="w-4 h-4" /> Active</div>
          <p className="text-2xl font-bold mt-1">{activeCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-destructive"><MailX className="w-4 h-4" /> Unsubscribed</div>
          <p className="text-2xl font-bold mt-1">{unsubCount}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Subscribed</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(sub => (
              <TableRow key={sub.id}>
                <TableCell className="font-medium">{sub.email}</TableCell>
                <TableCell>
                  <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                    {sub.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{sub.source}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {format(new Date(sub.subscribed_at), 'dd MMM yyyy')}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleStatusMutation.mutate({
                      id: sub.id,
                      status: sub.status === 'active' ? 'unsubscribed' : 'active',
                    })}
                  >
                    {sub.status === 'active' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(sub.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No subscribers found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function ContactsTab() {
  const { data: submissions, isLoading } = useContactSubmissions();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, admin_notes }: { id: string; status: string; admin_notes?: string }) => {
      const updates: any = { status };
      if (admin_notes !== undefined) updates.admin_notes = admin_notes;
      if (status === 'resolved') {
        updates.resolved_at = new Date().toISOString();
        const { data: { user } } = await supabase.auth.getUser();
        updates.resolved_by = user?.id;
      }
      const { error } = await supabase.from('contact_submissions').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contact-submissions'] });
      toast.success('Submission updated');
      setSelectedSubmission(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contact_submissions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contact-submissions'] });
      toast.success('Submission deleted');
    },
  });

  const filtered = (submissions || []).filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.subject.toLowerCase().includes(q);
    }
    return true;
  });

  const newCount = (submissions || []).filter(s => s.status === 'new').length;
  const inProgressCount = (submissions || []).filter(s => s.status === 'in_progress').length;

  const statusBadge = (status: string) => {
    switch (status) {
      case 'new': return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" /> New</Badge>;
      case 'in_progress': return <Badge variant="default" className="gap-1"><Clock className="w-3 h-3" /> In Progress</Badge>;
      case 'resolved': return <Badge variant="secondary" className="gap-1"><CheckCircle2 className="w-3 h-3" /> Resolved</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleExport = () => {
    const csv = ['Name,Email,Phone,Subject,Topic,Status,Created At', ...filtered.map(s =>
      `"${s.name}","${s.email}","${s.phone || ''}","${s.subject}","${s.topic || ''}","${s.status}","${s.created_at}"`
    )].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contact_submissions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported successfully');
  };

  if (isLoading) return <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;

  return (
    <div className="space-y-4 mt-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Inbox className="w-4 h-4" /> Total</div>
          <p className="text-2xl font-bold mt-1">{submissions?.length || 0}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-destructive"><AlertTriangle className="w-4 h-4" /> New</div>
          <p className="text-2xl font-bold mt-1">{newCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-primary"><Clock className="w-4 h-4" /> In Progress</div>
          <p className="text-2xl font-bold mt-1">{inProgressCount}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search name, email, subject..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(sub => (
              <TableRow key={sub.id} className="cursor-pointer" onClick={() => { setSelectedSubmission(sub); setAdminNotes(sub.admin_notes || ''); }}>
                <TableCell>
                  <div>
                    <p className="font-medium">{sub.name}</p>
                    <p className="text-xs text-muted-foreground">{sub.email}</p>
                  </div>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">{sub.subject}</TableCell>
                <TableCell className="capitalize text-sm">{sub.topic || 'other'}</TableCell>
                <TableCell>{statusBadge(sub.status)}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {format(new Date(sub.created_at), 'dd MMM yyyy')}
                </TableCell>
                <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedSubmission(sub); setAdminNotes(sub.admin_notes || ''); }}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(sub.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No submissions found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Contact Submission</DialogTitle>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Name</p><p className="font-medium">{selectedSubmission.name}</p></div>
                <div><p className="text-muted-foreground">Email</p><p className="font-medium">{selectedSubmission.email}</p></div>
                {selectedSubmission.phone && (
                  <div><p className="text-muted-foreground">Phone</p><p className="font-medium">{selectedSubmission.phone}</p></div>
                )}
                <div><p className="text-muted-foreground">Topic</p><p className="font-medium capitalize">{selectedSubmission.topic || 'other'}</p></div>
              </div>
              <div>
                <p className="text-muted-foreground text-sm mb-1">Subject</p>
                <p className="font-medium">{selectedSubmission.subject}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm mb-1">Message</p>
                <p className="text-sm bg-secondary/30 p-3 rounded-lg whitespace-pre-wrap">{selectedSubmission.message}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm mb-1">Status</p>
                <Select
                  value={selectedSubmission.status}
                  onValueChange={(val) => setSelectedSubmission({ ...selectedSubmission, status: val })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-muted-foreground text-sm mb-1">Admin Notes</p>
                <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Add internal notes..." rows={3} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSubmission(null)}>Cancel</Button>
            <Button
              onClick={() => updateMutation.mutate({
                id: selectedSubmission.id,
                status: selectedSubmission.status,
                admin_notes: adminNotes,
              })}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
