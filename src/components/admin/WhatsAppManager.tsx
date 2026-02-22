import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import {
  MessageCircle, Send, Plus, RefreshCw, Search, Filter, Eye, Edit, Trash2,
  CheckCircle, XCircle, Clock, AlertTriangle, BarChart3, Users, FileText,
  Phone, Globe, Link2, Copy, QrCode, TrendingUp, MessageSquare, Zap
} from 'lucide-react';

// --- Hooks ---

function useWhatsAppTemplates() {
  return useQuery({
    queryKey: ['admin-whatsapp-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

function useWhatsAppMessages(filters: { status?: string; dateRange?: string; search?: string }) {
  return useQuery({
    queryKey: ['admin-whatsapp-messages', filters],
    queryFn: async () => {
      let query = supabase
        .from('whatsapp_messages')
        .select('*, whatsapp_templates(name, template_type)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

function useWhatsAppAnalytics() {
  return useQuery({
    queryKey: ['admin-whatsapp-analytics'],
    queryFn: async () => {
      const { data: messages, error } = await supabase
        .from('whatsapp_messages')
        .select('status, created_at, delivered_at, read_at, message_type, reference_type');
      if (error) throw error;

      const total = messages?.length || 0;
      const sent = messages?.filter(m => m.status === 'sent').length || 0;
      const delivered = messages?.filter(m => m.delivered_at).length || 0;
      const read = messages?.filter(m => m.read_at).length || 0;
      const failed = messages?.filter(m => m.status === 'failed').length || 0;

      // By type breakdown
      const byType: Record<string, number> = {};
      messages?.forEach(m => {
        const type = m.reference_type || 'other';
        byType[type] = (byType[type] || 0) + 1;
      });

      // Last 7 days trend
      const now = new Date();
      const dailyTrend: { date: string; count: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const count = messages?.filter(m => m.created_at.startsWith(dateStr)).length || 0;
        dailyTrend.push({ date: dateStr, count });
      }

      // Opted-in users
      const { count: optedInCount } = await supabase
        .from('whatsapp_preferences')
        .select('*', { count: 'exact', head: true })
        .eq('order_notifications', true);

      return {
        total, sent, delivered, read, failed,
        deliveryRate: total > 0 ? Math.round((delivered / total) * 100) : 0,
        readRate: delivered > 0 ? Math.round((read / delivered) * 100) : 0,
        failRate: total > 0 ? Math.round((failed / total) * 100) : 0,
        byType,
        dailyTrend,
        optedInUsers: optedInCount || 0,
      };
    },
  });
}

function useWhatsAppSubscribers() {
  return useQuery({
    queryKey: ['admin-whatsapp-subscribers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_preferences')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// --- Status badge ---
const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
    sent: { variant: 'default', icon: <CheckCircle className="w-3 h-3" /> },
    delivered: { variant: 'secondary', icon: <CheckCircle className="w-3 h-3" /> },
    read: { variant: 'outline', icon: <Eye className="w-3 h-3" /> },
    failed: { variant: 'destructive', icon: <XCircle className="w-3 h-3" /> },
    pending: { variant: 'outline', icon: <Clock className="w-3 h-3" /> },
  };
  const c = config[status] || config.pending;
  return (
    <Badge variant={c.variant} className="gap-1 text-xs">
      {c.icon} {status}
    </Badge>
  );
};

// --- Template Form Dialog ---
const TemplateFormDialog = ({ template, onClose }: { template?: any; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: template?.name || '',
    template_type: template?.template_type || 'order_confirmation',
    language: template?.language || 'en',
    template_id: template?.template_id || '',
    header_type: template?.header_type || '',
    header_content: template?.header_content || '',
    body_text: template?.body_text || '',
    footer_text: template?.footer_text || '',
    variables: template?.variables?.join(', ') || '',
    is_active: template?.is_active ?? true,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        variables: form.variables ? form.variables.split(',').map(v => v.trim()).filter(Boolean) : [],
        buttons: template?.buttons || null,
      };
      if (template?.id) {
        const { error } = await supabase
          .from('whatsapp_templates')
          .update(payload)
          .eq('id', template.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('whatsapp_templates')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-whatsapp-templates'] });
      toast.success(template ? 'Template updated' : 'Template created');
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{template ? 'Edit Template' : 'Create Template'}</DialogTitle>
        <DialogDescription>Configure the WhatsApp message template for Meta Business API</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Template Name</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="order_confirmation_v1" />
          </div>
          <div className="space-y-2">
            <Label>Meta Template ID</Label>
            <Input value={form.template_id} onChange={e => setForm(f => ({ ...f, template_id: e.target.value }))} placeholder="Optional: Meta template ID" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={form.template_type} onValueChange={v => setForm(f => ({ ...f, template_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="order_confirmation">Order Confirmation</SelectItem>
                <SelectItem value="shipping_update">Shipping Update</SelectItem>
                <SelectItem value="delivery_confirmation">Delivery Confirmation</SelectItem>
                <SelectItem value="return_update">Return Update</SelectItem>
                <SelectItem value="refund_update">Refund Update</SelectItem>
                <SelectItem value="promotional">Promotional</SelectItem>
                <SelectItem value="abandoned_cart">Abandoned Cart</SelectItem>
                <SelectItem value="welcome">Welcome</SelectItem>
                <SelectItem value="otp">OTP / Verification</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Language</Label>
            <Select value={form.language} onValueChange={v => setForm(f => ({ ...f, language: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">Hindi</SelectItem>
                <SelectItem value="ta">Tamil</SelectItem>
                <SelectItem value="te">Telugu</SelectItem>
                <SelectItem value="mr">Marathi</SelectItem>
                <SelectItem value="bn">Bengali</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Header Type</Label>
            <Select value={form.header_type || 'none'} onValueChange={v => setForm(f => ({ ...f, header_type: v === 'none' ? '' : v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Header</SelectItem>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="document">Document</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.header_type && (
            <div className="space-y-2">
              <Label>Header Content</Label>
              <Input value={form.header_content} onChange={e => setForm(f => ({ ...f, header_content: e.target.value }))} placeholder={form.header_type === 'text' ? 'Header text...' : 'URL...'} />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label>Body Text</Label>
          <Textarea value={form.body_text} onChange={e => setForm(f => ({ ...f, body_text: e.target.value }))} rows={4} placeholder="Hello {{customer_name}}, your order {{order_number}} has been confirmed..." />
          <p className="text-xs text-muted-foreground">Use {'{{variable_name}}'} for dynamic content</p>
        </div>
        <div className="space-y-2">
          <Label>Footer Text</Label>
          <Input value={form.footer_text} onChange={e => setForm(f => ({ ...f, footer_text: e.target.value }))} placeholder="Optional footer text" />
        </div>
        <div className="space-y-2">
          <Label>Variables (comma-separated)</Label>
          <Input value={form.variables} onChange={e => setForm(f => ({ ...f, variables: e.target.value }))} placeholder="customer_name, order_number, amount" />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
          <Label>Active</Label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.name || !form.body_text}>
          {mutation.isPending ? 'Saving...' : template ? 'Update' : 'Create'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

// --- Bulk Send Dialog ---
const BulkSendDialog = ({ templates, onClose }: { templates: any[]; onClose: () => void }) => {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [targetAudience, setTargetAudience] = useState('all_opted_in');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!selectedTemplate) { toast.error('Select a template'); return; }
    setIsSending(true);
    try {
      // Get opted-in users
      let query = supabase.from('whatsapp_preferences').select('*');
      if (targetAudience === 'order_opted') query = query.eq('order_notifications', true);
      if (targetAudience === 'promo_opted') query = query.eq('promotional_messages', true);
      
      const { data: subscribers, error } = await query;
      if (error) throw error;

      if (!subscribers?.length) { toast.error('No subscribers found for this audience'); setIsSending(false); return; }

      // Send via edge function (batch)
      let successCount = 0;
      let failCount = 0;
      for (const sub of subscribers) {
        try {
          const { error: sendError } = await supabase.functions.invoke('send-whatsapp', {
            body: {
              phone_number: sub.phone_number,
              template_name: selectedTemplate,
              template_params: {},
              user_id: sub.user_id,
              reference_type: 'bulk_campaign',
            },
          });
          if (sendError) failCount++;
          else successCount++;
        } catch {
          failCount++;
        }
      }

      toast.success(`Sent to ${successCount} users, ${failCount} failed`);
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    }
    setIsSending(false);
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><Send className="w-5 h-5" /> Bulk WhatsApp Campaign</DialogTitle>
        <DialogDescription>Send a template message to opted-in subscribers</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <Label>Template</Label>
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
            <SelectContent>
              {templates.filter(t => t.is_active).map(t => (
                <SelectItem key={t.id} value={t.name}>{t.name} ({t.template_type})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Target Audience</Label>
          <Select value={targetAudience} onValueChange={setTargetAudience}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all_opted_in">All Opted-In Users</SelectItem>
              <SelectItem value="order_opted">Order Notification Subscribers</SelectItem>
              <SelectItem value="promo_opted">Promotional Subscribers</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSend} disabled={isSending || !selectedTemplate}>
          {isSending ? 'Sending...' : 'Send Campaign'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

// --- Web Link Generator ---
const WebLinkGenerator = () => {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const waLink = `https://wa.me/${phone.replace(/[^0-9]/g, '')}${message ? `?text=${encodeURIComponent(message)}` : ''}`;

  const copyLink = () => {
    navigator.clipboard.writeText(waLink);
    toast.success('WhatsApp link copied!');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Link2 className="w-4 h-4" /> WhatsApp Web Link Generator</CardTitle>
        <CardDescription>Generate click-to-chat links for marketing, support, and embedding</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Phone Number (with country code)</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+919876543210" />
          </div>
          <div className="space-y-2">
            <Label>Pre-filled Message (optional)</Label>
            <Input value={message} onChange={e => setMessage(e.target.value)} placeholder="Hi! I have a question about..." />
          </div>
        </div>
        {phone && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
            <code className="text-xs flex-1 break-all">{waLink}</code>
            <Button size="sm" variant="outline" onClick={copyLink} className="shrink-0">
              <Copy className="w-3 h-3 mr-1" /> Copy
            </Button>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { setMessage('Hi! I need help with my order.'); }}>
            <MessageSquare className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-xs font-medium">Support Chat</p>
          </Card>
          <Card className="p-3 text-center cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { setMessage('Hi! I\'d like to know more about your products.'); }}>
            <Zap className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-xs font-medium">Sales Inquiry</p>
          </Card>
          <Card className="p-3 text-center cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { setMessage('Hi! I want to track my order.'); }}>
            <FileText className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-xs font-medium">Order Tracking</p>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};

// --- Main Component ---
export const WhatsAppManager = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [templateDialog, setTemplateDialog] = useState<{ open: boolean; template?: any }>({ open: false });
  const [bulkSendOpen, setBulkSendOpen] = useState(false);
  const [msgFilters, setMsgFilters] = useState({ status: 'all', dateRange: '', search: '' });

  const { data: templates, isLoading: templatesLoading } = useWhatsAppTemplates();
  const { data: messages, isLoading: messagesLoading } = useWhatsAppMessages(msgFilters);
  const { data: analytics, isLoading: analyticsLoading } = useWhatsAppAnalytics();
  const { data: subscribers, isLoading: subscribersLoading } = useWhatsAppSubscribers();
  const queryClient = useQueryClient();

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('whatsapp_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-whatsapp-templates'] });
      toast.success('Template deleted');
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-green-500" />
            WhatsApp Communication Center
          </h2>
          <p className="text-muted-foreground">Manage templates, campaigns, message logs, and web links</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkSendOpen(true)}>
            <Send className="w-4 h-4 mr-1" /> Bulk Campaign
          </Button>
          <Button onClick={() => setTemplateDialog({ open: true })}>
            <Plus className="w-4 h-4 mr-1" /> New Template
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
          <TabsTrigger value="web-links">Web Links</TabsTrigger>
        </TabsList>

        {/* ===== OVERVIEW ===== */}
        <TabsContent value="overview" className="space-y-6">
          {analyticsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-28" />)}
            </div>
          ) : analytics && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm"><Send className="w-4 h-4" /> Total Sent</div>
                  <p className="text-2xl font-bold mt-1">{analytics.total}</p>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm"><CheckCircle className="w-4 h-4 text-green-500" /> Delivered</div>
                  <p className="text-2xl font-bold mt-1">{analytics.delivered}</p>
                  <p className="text-xs text-green-600">{analytics.deliveryRate}% delivery rate</p>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm"><Eye className="w-4 h-4 text-blue-500" /> Read</div>
                  <p className="text-2xl font-bold mt-1">{analytics.read}</p>
                  <p className="text-xs text-blue-600">{analytics.readRate}% read rate</p>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm"><XCircle className="w-4 h-4 text-destructive" /> Failed</div>
                  <p className="text-2xl font-bold mt-1">{analytics.failed}</p>
                  <p className="text-xs text-destructive">{analytics.failRate}% fail rate</p>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm"><Users className="w-4 h-4" /> Subscribers</div>
                  <p className="text-2xl font-bold mt-1">{analytics.optedInUsers}</p>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm"><FileText className="w-4 h-4" /> Templates</div>
                  <p className="text-2xl font-bold mt-1">{templates?.length || 0}</p>
                </Card>
                <Card className="p-4 col-span-2">
                  <div className="text-muted-foreground text-sm mb-2">7-Day Trend</div>
                  <div className="flex items-end gap-1 h-16">
                    {analytics.dailyTrend.map((d, i) => {
                      const maxCount = Math.max(...analytics.dailyTrend.map(x => x.count), 1);
                      const height = (d.count / maxCount) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full bg-primary/80 rounded-t" style={{ height: `${Math.max(height, 4)}%` }} />
                          <span className="text-[9px] text-muted-foreground">{d.date.slice(8)}</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>

              {/* By Type */}
              <Card>
                <CardHeader><CardTitle className="text-base">Messages by Type</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(analytics.byType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm capitalize">{type.replace(/_/g, ' ')}</span>
                        <Badge variant="secondary">{count as number}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ===== TEMPLATES ===== */}
        <TabsContent value="templates" className="space-y-4">
          {templatesLoading ? (
            <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
          ) : (
            <div className="grid gap-4">
              {templates?.map(t => (
                <Card key={t.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{t.name}</h3>
                        <Badge variant={t.is_active ? 'default' : 'secondary'}>{t.is_active ? 'Active' : 'Inactive'}</Badge>
                        <Badge variant="outline">{t.template_type}</Badge>
                        <Badge variant="outline">{t.language}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{t.body_text}</p>
                      {t.variables?.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {t.variables.map((v: string) => (
                            <Badge key={v} variant="outline" className="text-xs">{`{{${v}}}`}</Badge>
                          ))}
                        </div>
                      )}
                      {t.footer_text && <p className="text-xs text-muted-foreground italic mt-1">{t.footer_text}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => setTemplateDialog({ open: true, template: t })}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm('Delete this template?')) deleteTemplate.mutate(t.id); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {templates?.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No templates created yet</p>
                  <Button className="mt-3" onClick={() => setTemplateDialog({ open: true })}>
                    <Plus className="w-4 h-4 mr-1" /> Create First Template
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ===== MESSAGES ===== */}
        <TabsContent value="messages" className="space-y-4">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search messages..." className="pl-9" value={msgFilters.search} onChange={e => setMsgFilters(f => ({ ...f, search: e.target.value }))} />
            </div>
            <Select value={msgFilters.status} onValueChange={v => setMsgFilters(f => ({ ...f, status: v }))}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-whatsapp-messages'] })}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {messagesLoading ? (
            <div className="space-y-2">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phone</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Delivered</TableHead>
                    <TableHead>Read</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages?.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-xs">{m.phone_number}</TableCell>
                      <TableCell className="text-sm">{(m as any).whatsapp_templates?.name || '-'}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{m.reference_type || m.message_type}</Badge></TableCell>
                      <TableCell><StatusBadge status={m.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.sent_at ? format(new Date(m.sent_at), 'MMM dd, HH:mm') : '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.delivered_at ? format(new Date(m.delivered_at), 'MMM dd, HH:mm') : '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.read_at ? format(new Date(m.read_at), 'MMM dd, HH:mm') : '-'}</TableCell>
                    </TableRow>
                  ))}
                  {messages?.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No messages found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </TabsContent>

        {/* ===== SUBSCRIBERS ===== */}
        <TabsContent value="subscribers" className="space-y-4">
          {subscribersLoading ? (
            <div className="space-y-2">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phone</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Shipping</TableHead>
                    <TableHead>Returns</TableHead>
                    <TableHead>Promos</TableHead>
                    <TableHead>Opted In</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscribers?.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.phone_number}</TableCell>
                      <TableCell>{s.order_notifications ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-muted-foreground" />}</TableCell>
                      <TableCell>{s.shipping_notifications ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-muted-foreground" />}</TableCell>
                      <TableCell>{s.return_notifications ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-muted-foreground" />}</TableCell>
                      <TableCell>{s.promotional_messages ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-muted-foreground" />}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(s.opted_in_at), { addSuffix: true })}</TableCell>
                      <TableCell>
                        <Badge variant={s.opted_out_at ? 'destructive' : 'default'}>{s.opted_out_at ? 'Opted Out' : 'Active'}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {subscribers?.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No subscribers yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </TabsContent>

        {/* ===== WEB LINKS ===== */}
        <TabsContent value="web-links" className="space-y-6">
          <WebLinkGenerator />
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><QrCode className="w-4 h-4" /> Embeddable Chat Widgets</CardTitle>
              <CardDescription>Use these code snippets to add WhatsApp contact buttons to external sites</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>HTML Button Snippet</Label>
                <div className="p-3 bg-muted rounded-lg">
                  <code className="text-xs break-all whitespace-pre-wrap">{`<a href="https://wa.me/YOUR_PHONE?text=Hi!" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:#25D366;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>Chat on WhatsApp</a>`}</code>
                </div>
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(`<a href="https://wa.me/YOUR_PHONE?text=Hi!" target="_blank">Chat on WhatsApp</a>`); toast.success('Copied!'); }}>
                  <Copy className="w-3 h-3 mr-1" /> Copy Snippet
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Dialog */}
      <Dialog open={templateDialog.open} onOpenChange={v => !v && setTemplateDialog({ open: false })}>
        {templateDialog.open && <TemplateFormDialog template={templateDialog.template} onClose={() => setTemplateDialog({ open: false })} />}
      </Dialog>

      {/* Bulk Send Dialog */}
      <Dialog open={bulkSendOpen} onOpenChange={setBulkSendOpen}>
        {bulkSendOpen && templates && <BulkSendDialog templates={templates} onClose={() => setBulkSendOpen(false)} />}
      </Dialog>
    </div>
  );
};
