import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Bell,
  Send,
  Calendar as CalendarIcon,
  Users,
  ShoppingCart,
  Heart,
  Clock,
  Target,
  Plus,
  Trash2,
  Edit2,
  Play,
  Pause,
  Copy,
  Eye,
  TrendingUp,
  Mail,
  Smartphone,
  MessageSquare,
  Search,
  RefreshCw,
  BarChart3,
  Zap,
  Gift,
  ShoppingBag,
  Loader2,
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  useNotificationCampaigns, 
  useCreateCampaign, 
  useUpdateCampaign, 
  useDeleteCampaign,
  useCustomerSegments 
} from '@/hooks/useNotificationCampaigns';

// Types
interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  count: number;
  icon: React.ElementType;
  color: string;
}

const segmentDefinitions: Omit<CustomerSegment, 'count'>[] = [
  { id: 'all_customers', name: 'All Customers', description: 'Everyone who has made an account', icon: Users, color: 'bg-info' },
  { id: 'cart_abandonment', name: 'Cart Abandoners', description: 'Left items in cart in last 24h', icon: ShoppingCart, color: 'bg-warning' },
  { id: 'wishlist_users', name: 'Wishlist Savers', description: 'Added items to wishlist', icon: Heart, color: 'bg-destructive' },
  { id: 'first_time_buyers', name: 'First-time Buyers', description: 'Made first purchase in last 7 days', icon: Gift, color: 'bg-success' },
  { id: 'repeat_customers', name: 'Repeat Customers', description: '3+ purchases', icon: TrendingUp, color: 'bg-accent' },
  { id: 'high_value', name: 'High Value', description: 'Spent ₹10,000+ lifetime', icon: Zap, color: 'bg-warning' },
  { id: 'inactive_30_days', name: 'Inactive (30 days)', description: 'No activity in 30 days', icon: Clock, color: 'bg-destructive' },
];

export function NotificationCenter() {
  const { data: campaigns = [], isLoading: campaignsLoading } = useNotificationCampaigns();
  const { data: segmentCounts } = useCustomerSegments();
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const deleteCampaignMutation = useDeleteCampaign();
  
  const [activeTab, setActiveTab] = useState('campaigns');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isSending, setIsSending] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    message: '',
    segment: '',
    channel: 'email' as 'push' | 'email' | 'sms' | 'all',
    scheduleType: 'now' as 'now' | 'scheduled',
    scheduledDate: new Date(),
    scheduledTime: '10:00',
    emailType: 'promotional_campaign' as 'promotional_campaign' | 'flash_sale',
  });

  // Merge segment definitions with real counts
  const customerSegments: CustomerSegment[] = segmentDefinitions.map(seg => ({
    ...seg,
    count: segmentCounts?.[seg.id as keyof typeof segmentCounts] || 0,
  }));

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sendEmailCampaign = async (segmentId: string, title: string, message: string, emailType: string) => {
    setIsSending(true);
    try {
      // Get customers based on segment
      let emails: string[] = [];
      
      if (segmentId === 'all_customers') {
        const { data } = await supabase.from('profiles').select('email');
        emails = data?.map(p => p.email) || [];
      } else if (segmentId === 'wishlist_users') {
        const { data } = await supabase
          .from('wishlists')
          .select('profiles!wishlists_user_id_fkey(email)')
          .limit(100);
        emails = data?.map((w: any) => w.profiles?.email).filter(Boolean) || [];
      } else if (segmentId === 'cart_abandonment') {
        const { data } = await supabase
          .from('carts')
          .select('profiles!carts_user_id_fkey(email)')
          .not('items', 'eq', '[]')
          .limit(100);
        emails = data?.map((c: any) => c.profiles?.email).filter(Boolean) || [];
      } else {
        // For other segments, get sample of customers
        const { data } = await supabase.from('profiles').select('email').limit(50);
        emails = data?.map(p => p.email) || [];
      }

      // Remove duplicates
      const uniqueEmails = [...new Set(emails)];
      
      if (uniqueEmails.length === 0) {
        toast.error('No customers found in this segment');
        return 0;
      }

      // Send emails via edge function
      let sentCount = 0;
      const batchSize = 10;
      
      for (let i = 0; i < uniqueEmails.length; i += batchSize) {
        const batch = uniqueEmails.slice(i, i + batchSize);
        
        const promises = batch.map(email => 
          supabase.functions.invoke('send-email', {
            body: {
              type: emailType,
              to: email,
              data: {
                title,
                message,
                headline: title,
                subtitle: message,
                cta_text: 'Shop Now',
                cta_url: `${window.location.origin}/shop`,
                discount_code: emailType === 'flash_sale' ? 'FLASH20' : 'PROMO10',
                discount_percentage: emailType === 'flash_sale' ? '20%' : '10%',
                end_date: format(addDays(new Date(), 3), 'MMMM d, yyyy'),
              },
            },
          })
        );
        
        const results = await Promise.allSettled(promises);
        sentCount += results.filter(r => r.status === 'fulfilled').length;
      }
      
      return sentCount;
    } catch (error) {
      console.error('Email campaign error:', error);
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!formData.name || !formData.title || !formData.message || !formData.segment) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      let sentCount = 0;
      
      // If channel is email and sending now, actually send the emails
      if (formData.channel === 'email' && formData.scheduleType === 'now') {
        sentCount = await sendEmailCampaign(
          formData.segment,
          formData.title,
          formData.message,
          formData.emailType
        );
      }

      // Save campaign to database
      await createCampaign.mutateAsync({
        name: formData.name,
        title: formData.title,
        message: formData.message,
        segment: formData.segment,
        channel: formData.channel,
        status: formData.scheduleType === 'now' ? 'active' : 'scheduled',
        scheduled_at: formData.scheduleType === 'scheduled' 
          ? new Date(`${format(formData.scheduledDate, 'yyyy-MM-dd')}T${formData.scheduledTime}`).toISOString()
          : null,
      });

      // Update sent count if emails were sent
      if (sentCount > 0) {
        toast.success(`Campaign launched! ${sentCount} emails sent.`);
      }

      setShowCreateDialog(false);
      setFormData({
        name: '',
        title: '',
        message: '',
        segment: '',
        channel: 'email',
        scheduleType: 'now',
        scheduledDate: new Date(),
        scheduledTime: '10:00',
        emailType: 'promotional_campaign',
      });
    } catch (error) {
      console.error('Campaign creation error:', error);
      toast.error('Failed to create campaign');
    }
  };

  const toggleCampaignStatus = async (campaignId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      await updateCampaign.mutateAsync({ id: campaignId, status: newStatus });
    } catch (error) {
      console.error('Status update error:', error);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      await deleteCampaignMutation.mutateAsync(campaignId);
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-muted text-muted-foreground',
      scheduled: 'bg-info/10 text-info',
      active: 'bg-success/10 text-success',
      completed: 'bg-accent/10 text-accent',
      paused: 'bg-warning/10 text-warning',
    };
    return <Badge className={cn('font-medium', styles[status] || styles.draft)}>{status}</Badge>;
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'push': return <Smartphone className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      case 'sms': return <MessageSquare className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  // Stats
  const totalSent = campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);
  const totalOpens = campaigns.reduce((acc, c) => acc + (c.open_count || 0), 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + (c.click_count || 0), 0);
  const avgOpenRate = totalSent > 0 ? ((totalOpens / totalSent) * 100).toFixed(1) : '0';
  const avgClickRate = totalOpens > 0 ? ((totalClicks / totalOpens) * 100).toFixed(1) : '0';

  if (campaignsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Notification Center</h2>
          <p className="text-muted-foreground">Send targeted email campaigns to customer segments</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Email Campaign</DialogTitle>
              <DialogDescription>
                Send targeted email notifications to specific customer segments
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Campaign Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Summer Sale Announcement"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Email Type */}
              <div className="space-y-2">
                <Label>Email Template *</Label>
                <div className="flex gap-2">
                  {[
                    { value: 'promotional_campaign', label: 'Promotional', icon: Gift },
                    { value: 'flash_sale', label: 'Flash Sale', icon: Zap },
                  ].map((type) => (
                    <Button
                      key={type.value}
                      type="button"
                      variant={formData.emailType === type.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFormData({ ...formData, emailType: type.value as any })}
                      className="gap-2"
                    >
                      <type.icon className="w-4 h-4" />
                      {type.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Target Segment */}
              <div className="space-y-2">
                <Label>Target Segment *</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {customerSegments.slice(0, 7).map((segment) => (
                    <button
                      key={segment.id}
                      onClick={() => setFormData({ ...formData, segment: segment.id })}
                      className={cn(
                        'p-3 rounded-lg border-2 text-left transition-all',
                        formData.segment === segment.id
                          ? 'border-accent bg-accent/10'
                          : 'border-border hover:border-accent/50'
                      )}
                    >
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2', segment.color)}>
                        <segment.icon className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-sm font-medium truncate">{segment.name}</p>
                      <p className="text-xs text-muted-foreground">{segment.count.toLocaleString()} users</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Email Subject *</Label>
                <Input
                  id="title"
                  placeholder="e.g., 🔥 Flash Sale: Up to 50% Off!"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="message">Email Message *</Label>
                <Textarea
                  id="message"
                  placeholder="Write your email message content..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={4}
                />
              </div>

              {/* Schedule */}
              <div className="space-y-4">
                <Label>When to Send</Label>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={formData.scheduleType === 'now' ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, scheduleType: 'now' })}
                    className="gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    Send Now
                  </Button>
                  <Button
                    type="button"
                    variant={formData.scheduleType === 'scheduled' ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, scheduleType: 'scheduled' })}
                    className="gap-2"
                  >
                    <CalendarIcon className="w-4 h-4" />
                    Schedule
                  </Button>
                </div>
                
                {formData.scheduleType === 'scheduled' && (
                  <div className="flex gap-4 items-center">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          <CalendarIcon className="w-4 h-4" />
                          {format(formData.scheduledDate, 'PPP')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.scheduledDate}
                          onSelect={(date) => date && setFormData({ ...formData, scheduledDate: date })}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Input
                      type="time"
                      value={formData.scheduledTime}
                      onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                      className="w-32"
                    />
                  </div>
                )}
              </div>

              {/* Preview */}
              {formData.title && (
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="p-4 rounded-xl bg-secondary/50 border">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-accent-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold">{formData.title}</p>
                        <p className="text-sm text-muted-foreground">{formData.message || 'Your message will appear here...'}</p>
                        <Badge className="mt-2" variant="secondary">
                          {formData.emailType === 'flash_sale' ? '⚡ Flash Sale Template' : '🎁 Promotional Template'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCampaign} disabled={isSending || createCampaign.isPending} className="gap-2">
                {(isSending || createCampaign.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isSending ? 'Sending...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {formData.scheduleType === 'now' ? 'Launch Campaign' : 'Schedule Campaign'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-info/10 to-info/5 border-info/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-info flex items-center justify-center">
                <Send className="w-5 h-5 text-info-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalSent.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success flex items-center justify-center">
                <Eye className="w-5 h-5 text-success-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalOpens.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Opens</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <Target className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalClicks.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Clicks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-warning-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgOpenRate}%</p>
                <p className="text-xs text-muted-foreground">Open Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 border-pink-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pink-500 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgClickRate}%</p>
                <p className="text-xs text-muted-foreground">Click Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="campaigns" className="gap-2">
            <Bell className="w-4 h-4" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="segments" className="gap-2">
            <Users className="w-4 h-4" />
            Segments
          </TabsTrigger>
          <TabsTrigger value="automation" className="gap-2">
            <Zap className="w-4 h-4" />
            Automation
          </TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campaigns Table */}
          <Card>
            {filteredCampaigns.length === 0 ? (
              <CardContent className="py-16 text-center">
                <Mail className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
                <p className="text-muted-foreground mb-4">Create your first email campaign to get started</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Sent</TableHead>
                    <TableHead className="text-right">Opens</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{campaign.name}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">{campaign.title}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {customerSegments.find(s => s.id === campaign.segment)?.name || campaign.segment}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getChannelIcon(campaign.channel)}
                          <span className="capitalize">{campaign.channel}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(campaign.status)}
                        {campaign.scheduled_at && campaign.status === 'scheduled' && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(campaign.scheduled_at), 'MMM d, h:mm a')}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">{campaign.sent_count.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        {campaign.open_count.toLocaleString()}
                        {campaign.sent_count > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {((campaign.open_count / campaign.sent_count) * 100).toFixed(1)}%
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {campaign.click_count.toLocaleString()}
                        {campaign.open_count > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {((campaign.click_count / campaign.open_count) * 100).toFixed(1)}%
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {(campaign.status === 'active' || campaign.status === 'paused') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleCampaignStatus(campaign.id, campaign.status)}
                            >
                              {campaign.status === 'active' ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleDeleteCampaign(campaign.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* Segments Tab */}
        <TabsContent value="segments" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {customerSegments.map((segment) => (
              <Card key={segment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', segment.color)}>
                      <segment.icon className="w-6 h-6 text-white" />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setFormData({ ...formData, segment: segment.id });
                        setShowCreateDialog(true);
                      }}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Target
                    </Button>
                  </div>
                  <h3 className="font-semibold mt-4">{segment.name}</h3>
                  <p className="text-sm text-muted-foreground">{segment.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-2xl font-bold">{segment.count.toLocaleString()}</p>
                    <Badge variant="secondary">users</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Automated Email Campaigns</CardTitle>
              <CardDescription>Set up trigger-based email notifications that run automatically</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  name: 'Cart Abandonment (1 hour)',
                  trigger: 'When a user abandons cart for 1 hour',
                  template: 'cart_abandonment',
                  active: true,
                  icon: ShoppingCart,
                },
                {
                  name: 'Order Confirmation',
                  trigger: 'When an order is placed',
                  template: 'order_confirmation',
                  active: true,
                  icon: ShoppingBag,
                },
                {
                  name: 'Shipping Update',
                  trigger: 'When an order is shipped',
                  template: 'shipping_update',
                  active: true,
                  icon: ShoppingBag,
                },
                {
                  name: 'Wishlist Price Drop',
                  trigger: 'When a wishlist item price drops',
                  template: 'price_drop',
                  active: false,
                  icon: Heart,
                },
                {
                  name: 'Review Request',
                  trigger: '3 days after delivery',
                  template: 'review_request',
                  active: false,
                  icon: MessageSquare,
                },
                {
                  name: 'Win-back (30 days)',
                  trigger: 'When user is inactive for 30 days',
                  template: 'promotional_campaign',
                  active: false,
                  icon: Clock,
                },
              ].map((automation, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      automation.active ? 'bg-accent' : 'bg-muted'
                    )}>
                      <automation.icon className={cn('w-5 h-5', automation.active ? 'text-accent-foreground' : 'text-muted-foreground')} />
                    </div>
                    <div>
                      <p className="font-medium">{automation.name}</p>
                      <p className="text-sm text-muted-foreground">{automation.trigger}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Switch checked={automation.active} />
                    <Button variant="ghost" size="sm">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}