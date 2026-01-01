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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Mail,
  Smartphone,
  MessageSquare,
  Filter,
  Search,
  RefreshCw,
  BarChart3,
  Zap,
  Gift,
  ShoppingBag,
} from 'lucide-react';
import { format, addDays, addHours } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Types
interface NotificationCampaign {
  id: string;
  name: string;
  title: string;
  message: string;
  segment: string;
  channel: 'push' | 'email' | 'sms' | 'all';
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'paused';
  scheduledAt?: Date;
  sentCount: number;
  openCount: number;
  clickCount: number;
  createdAt: Date;
}

interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  count: number;
  icon: React.ElementType;
  color: string;
}

// Mock data
const mockCampaigns: NotificationCampaign[] = [
  {
    id: '1',
    name: 'Cart Abandonment - 1 Hour',
    title: 'Don\'t forget your items!',
    message: 'You left {{product_name}} in your cart. Complete your purchase now and get 10% off!',
    segment: 'cart_abandonment',
    channel: 'push',
    status: 'active',
    sentCount: 1250,
    openCount: 456,
    clickCount: 189,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: '2',
    name: 'Wishlist Price Drop',
    title: 'Price dropped on your wishlist item!',
    message: '{{product_name}} is now {{discount_percent}}% off! Grab it before it\'s gone.',
    segment: 'wishlist_users',
    channel: 'email',
    status: 'active',
    sentCount: 890,
    openCount: 234,
    clickCount: 145,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: '3',
    name: 'Weekend Flash Sale',
    title: '⚡ Flash Sale: Up to 50% Off!',
    message: 'Exclusive weekend deals just for you. Shop now before they\'re gone!',
    segment: 'all_customers',
    channel: 'all',
    status: 'scheduled',
    scheduledAt: addDays(new Date(), 2),
    sentCount: 0,
    openCount: 0,
    clickCount: 0,
    createdAt: new Date(),
  },
  {
    id: '4',
    name: 'Win-back Campaign',
    title: 'We miss you! Here\'s 20% off',
    message: 'It\'s been a while since your last purchase. Come back and enjoy 20% off your next order.',
    segment: 'inactive_30_days',
    channel: 'email',
    status: 'paused',
    sentCount: 2100,
    openCount: 420,
    clickCount: 98,
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
  },
];

const customerSegments: CustomerSegment[] = [
  { id: 'all_customers', name: 'All Customers', description: 'Everyone who has made an account', count: 15420, icon: Users, color: 'bg-blue-500' },
  { id: 'cart_abandonment', name: 'Cart Abandoners', description: 'Left items in cart in last 24h', count: 342, icon: ShoppingCart, color: 'bg-orange-500' },
  { id: 'wishlist_users', name: 'Wishlist Savers', description: 'Added items to wishlist', count: 1890, icon: Heart, color: 'bg-pink-500' },
  { id: 'first_time_buyers', name: 'First-time Buyers', description: 'Made first purchase in last 7 days', count: 234, icon: Gift, color: 'bg-green-500' },
  { id: 'repeat_customers', name: 'Repeat Customers', description: '3+ purchases', count: 4520, icon: TrendingUp, color: 'bg-purple-500' },
  { id: 'high_value', name: 'High Value', description: 'Spent ₹10,000+ lifetime', count: 890, icon: Zap, color: 'bg-yellow-500' },
  { id: 'inactive_30_days', name: 'Inactive (30 days)', description: 'No activity in 30 days', count: 2340, icon: Clock, color: 'bg-red-500' },
  { id: 'inactive_90_days', name: 'Inactive (90 days)', description: 'No activity in 90 days', count: 1120, icon: AlertTriangle, color: 'bg-gray-500' },
];

export function NotificationCenter() {
  const [campaigns, setCampaigns] = useState<NotificationCampaign[]>(mockCampaigns);
  const [activeTab, setActiveTab] = useState('campaigns');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<NotificationCampaign | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    message: '',
    segment: '',
    channel: 'push' as 'push' | 'email' | 'sms' | 'all',
    scheduleType: 'now' as 'now' | 'scheduled',
    scheduledDate: new Date(),
    scheduledTime: '10:00',
  });

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateCampaign = () => {
    if (!formData.name || !formData.title || !formData.message || !formData.segment) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newCampaign: NotificationCampaign = {
      id: Date.now().toString(),
      name: formData.name,
      title: formData.title,
      message: formData.message,
      segment: formData.segment,
      channel: formData.channel,
      status: formData.scheduleType === 'now' ? 'active' : 'scheduled',
      scheduledAt: formData.scheduleType === 'scheduled' ? formData.scheduledDate : undefined,
      sentCount: 0,
      openCount: 0,
      clickCount: 0,
      createdAt: new Date(),
    };

    setCampaigns([newCampaign, ...campaigns]);
    setShowCreateDialog(false);
    setFormData({
      name: '',
      title: '',
      message: '',
      segment: '',
      channel: 'push',
      scheduleType: 'now',
      scheduledDate: new Date(),
      scheduledTime: '10:00',
    });
    toast.success(formData.scheduleType === 'now' ? 'Campaign launched!' : 'Campaign scheduled!');
  };

  const toggleCampaignStatus = (campaignId: string) => {
    setCampaigns(campaigns.map(c => {
      if (c.id === campaignId) {
        const newStatus = c.status === 'active' ? 'paused' : 'active';
        toast.success(`Campaign ${newStatus === 'active' ? 'activated' : 'paused'}`);
        return { ...c, status: newStatus };
      }
      return c;
    }));
  };

  const deleteCampaign = (campaignId: string) => {
    setCampaigns(campaigns.filter(c => c.id !== campaignId));
    toast.success('Campaign deleted');
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      completed: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    };
    return <Badge className={cn('font-medium', styles[status as keyof typeof styles])}>{status}</Badge>;
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
  const totalSent = campaigns.reduce((acc, c) => acc + c.sentCount, 0);
  const totalOpens = campaigns.reduce((acc, c) => acc + c.openCount, 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + c.clickCount, 0);
  const avgOpenRate = totalSent > 0 ? ((totalOpens / totalSent) * 100).toFixed(1) : '0';
  const avgClickRate = totalOpens > 0 ? ((totalClicks / totalOpens) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Notification Center</h2>
          <p className="text-muted-foreground">Send targeted notifications to customer segments</p>
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
              <DialogTitle>Create Notification Campaign</DialogTitle>
              <DialogDescription>
                Send targeted notifications to specific customer segments
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Campaign Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Cart Abandonment Reminder"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Target Segment */}
              <div className="space-y-2">
                <Label>Target Segment *</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {customerSegments.map((segment) => (
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

              {/* Channel */}
              <div className="space-y-2">
                <Label>Notification Channel *</Label>
                <div className="flex gap-2">
                  {[
                    { value: 'push', label: 'Push', icon: Smartphone },
                    { value: 'email', label: 'Email', icon: Mail },
                    { value: 'sms', label: 'SMS', icon: MessageSquare },
                    { value: 'all', label: 'All Channels', icon: Bell },
                  ].map((channel) => (
                    <Button
                      key={channel.value}
                      type="button"
                      variant={formData.channel === channel.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFormData({ ...formData, channel: channel.value as any })}
                      className="gap-2"
                    >
                      <channel.icon className="w-4 h-4" />
                      {channel.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Notification Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Don't forget your items!"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Use variables: {'{{product_name}}'}, {'{{discount_percent}}'}, {'{{customer_name}}'}
                </p>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="message">Message Content *</Label>
                <Textarea
                  id="message"
                  placeholder="Write your notification message..."
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
                        <Bell className="w-5 h-5 text-accent-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold">{formData.title}</p>
                        <p className="text-sm text-muted-foreground">{formData.message || 'Your message will appear here...'}</p>
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
              <Button onClick={handleCreateCampaign} className="gap-2">
                <Send className="w-4 h-4" />
                {formData.scheduleType === 'now' ? 'Launch Campaign' : 'Schedule Campaign'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalSent.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                <Eye className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalOpens.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Opens</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalClicks.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Clicks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
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
            <Button variant="outline" size="icon">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Campaigns Table */}
          <Card>
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
                      {campaign.scheduledAt && campaign.status === 'scheduled' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(campaign.scheduledAt, 'MMM d, h:mm a')}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">{campaign.sentCount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {campaign.openCount.toLocaleString()}
                      {campaign.sentCount > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {((campaign.openCount / campaign.sentCount) * 100).toFixed(1)}%
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {campaign.clickCount.toLocaleString()}
                      {campaign.openCount > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {((campaign.clickCount / campaign.openCount) * 100).toFixed(1)}%
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {(campaign.status === 'active' || campaign.status === 'paused') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleCampaignStatus(campaign.id)}
                          >
                            {campaign.status === 'active' ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                        <Button variant="ghost" size="icon">
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => deleteCampaign(campaign.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
                    <Button variant="ghost" size="sm">
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
              <CardTitle>Automated Campaigns</CardTitle>
              <CardDescription>Set up trigger-based notifications that run automatically</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  name: 'Cart Abandonment (1 hour)',
                  trigger: 'When a user abandons cart for 1 hour',
                  active: true,
                  icon: ShoppingCart,
                },
                {
                  name: 'Cart Abandonment (24 hours)',
                  trigger: 'When a user abandons cart for 24 hours',
                  active: true,
                  icon: ShoppingCart,
                },
                {
                  name: 'Wishlist Price Drop',
                  trigger: 'When a wishlist item price drops',
                  active: true,
                  icon: Heart,
                },
                {
                  name: 'Order Shipped',
                  trigger: 'When an order is shipped',
                  active: true,
                  icon: ShoppingBag,
                },
                {
                  name: 'Review Request',
                  trigger: '3 days after delivery',
                  active: false,
                  icon: MessageSquare,
                },
                {
                  name: 'Win-back (30 days)',
                  trigger: 'When user is inactive for 30 days',
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
