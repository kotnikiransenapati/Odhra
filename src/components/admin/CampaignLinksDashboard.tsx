import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Link2,
  Plus,
  Copy,
  ExternalLink,
  MousePointerClick,
  UserPlus,
  ShoppingCart,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  TrendingUp,
  Zap,
  Megaphone,
  Users,
  IndianRupee,
} from 'lucide-react';
import {
  useCampaignLinks,
  useCreateCampaignLink,
  useToggleCampaignLink,
  useDeleteCampaignLink,
  getCampaignUrl,
  type CampaignLink,
} from '@/hooks/useCampaignLinks';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';

const CAMPAIGN_TYPES = [
  { value: 'flash_sale', label: 'Flash Sale', icon: Zap },
  { value: 'promo', label: 'Promotion', icon: Megaphone },
  { value: 'ad', label: 'Advertisement', icon: TrendingUp },
  { value: 'vendor_recruit', label: 'Vendor Recruitment', icon: Users },
  { value: 'newsletter', label: 'Newsletter', icon: Megaphone },
  { value: 'custom', label: 'Custom', icon: Link2 },
];

function CreateCampaignLinkDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('custom');
  const [targetPath, setTargetPath] = useState('/');
  const [expiresAt, setExpiresAt] = useState('');
  const [heading, setHeading] = useState('');
  const [cta, setCta] = useState('');

  const createLink = useCreateCampaignLink();
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await createLink.mutateAsync({
        campaign_type: type,
        campaign_name: name,
        target_path: targetPath,
        expires_at: expiresAt || undefined,
        personalization: {
          ...(heading ? { heading } : {}),
          ...(cta ? { cta } : {}),
        },
      });
      setCreatedUrl(getCampaignUrl(result.code));
    } catch (err) {
      // handled by hook
    }
  };

  const handleClose = (open: boolean) => {
    setOpen(open);
    if (!open) {
      setCreatedUrl(null);
      setName('');
      setType('custom');
      setTargetPath('/');
      setExpiresAt('');
      setHeading('');
      setCta('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Create Campaign Link
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Campaign Link</DialogTitle>
          <DialogDescription>
            Generate a trackable link for any campaign with full funnel analytics
          </DialogDescription>
        </DialogHeader>
        {createdUrl ? (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg text-center">
              <Label className="text-sm text-muted-foreground">Your Campaign Link</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input readOnly value={createdUrl} className="text-sm font-mono" />
                <Button
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(createdUrl);
                    toast.success('Copied!');
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Campaign Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Summer Flash Sale 2025"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Campaign Type *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAMPAIGN_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target Page Path *</Label>
              <Input
                value={targetPath}
                onChange={(e) => setTargetPath(e.target.value)}
                placeholder="/flash-sales"
              />
              <p className="text-xs text-muted-foreground">Where users land after clicking (e.g. /flash-sales, /shop, /auth)</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Custom Heading (Optional)</Label>
                <Input
                  value={heading}
                  onChange={(e) => setHeading(e.target.value)}
                  placeholder="🔥 50% OFF Today!"
                />
              </div>
              <div className="space-y-2">
                <Label>CTA Text (Optional)</Label>
                <Input
                  value={cta}
                  onChange={(e) => setCta(e.target.value)}
                  placeholder="Shop Now"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Expires At (Optional)</Label>
              <Input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createLink.isPending}>
                {createLink.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Generate Link
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CampaignLinkCard({ link }: { link: CampaignLink }) {
  const toggleLink = useToggleCampaignLink();
  const deleteLink = useDeleteCampaignLink();
  const url = getCampaignUrl(link.code);
  const isExpired = link.expires_at && new Date(link.expires_at) < new Date();
  const conversionRate = link.click_count > 0
    ? ((link.purchase_count / link.click_count) * 100).toFixed(1)
    : '0';

  return (
    <Card className={!link.is_active || isExpired ? 'opacity-60' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-sm truncate">{link.campaign_name}</h4>
              <Badge variant="secondary" className="text-xs">{link.campaign_type.replace('_', ' ')}</Badge>
              {isExpired && <Badge variant="destructive" className="text-xs">Expired</Badge>}
              {!link.is_active && <Badge variant="outline" className="text-xs">Paused</Badge>}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">/c/{link.code}</code>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => {
                  navigator.clipboard.writeText(url);
                  toast.success('Link copied!');
                }}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-4 mt-3 text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                <MousePointerClick className="w-3.5 h-3.5" />
                <span>{link.click_count} clicks</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <UserPlus className="w-3.5 h-3.5" />
                <span>{link.signup_count} signups</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>{link.purchase_count} purchases</span>
              </div>
              {link.revenue_generated > 0 && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <IndianRupee className="w-3.5 h-3.5" />
                  <span>₹{link.revenue_generated.toLocaleString('en-IN')}</span>
                </div>
              )}
              <Badge variant="outline" className="text-xs">
                {conversionRate}% CVR
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Created {formatDistanceToNow(new Date(link.created_at), { addSuffix: true })}
              {link.expires_at && ` · Expires ${format(new Date(link.expires_at), 'MMM d, yyyy')}`}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => toggleLink.mutate({ id: link.id, is_active: !link.is_active })}
              title={link.is_active ? 'Pause' : 'Activate'}
            >
              {link.is_active ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => {
                if (confirm('Delete this campaign link?')) deleteLink.mutate(link.id);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CampaignLinksDashboard() {
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const { data: links = [], isLoading } = useCampaignLinks({ type: typeFilter });

  // Summary stats
  const totalClicks = links.reduce((s, l) => s + l.click_count, 0);
  const totalSignups = links.reduce((s, l) => s + l.signup_count, 0);
  const totalPurchases = links.reduce((s, l) => s + l.purchase_count, 0);
  const totalRevenue = links.reduce((s, l) => s + l.revenue_generated, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Campaign Links</h2>
          <p className="text-sm text-muted-foreground">
            Create trackable links for flash sales, promotions, ads, and invites with full funnel analytics
          </p>
        </div>
        <CreateCampaignLinkDialog />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <MousePointerClick className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{totalClicks.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Clicks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <UserPlus className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{totalSignups.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Signups</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <ShoppingCart className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{totalPurchases.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Purchases</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <IndianRupee className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">₹{totalRevenue.toLocaleString('en-IN')}</p>
            <p className="text-xs text-muted-foreground">Revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Badge
          variant={!typeFilter ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setTypeFilter(undefined)}
        >
          All
        </Badge>
        {CAMPAIGN_TYPES.map((t) => (
          <Badge
            key={t.value}
            variant={typeFilter === t.value ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setTypeFilter(t.value)}
          >
            {t.label}
          </Badge>
        ))}
      </div>

      {/* Links List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : links.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Link2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No campaign links yet</h3>
            <p className="text-sm text-muted-foreground">
              Create your first trackable link to start monitoring conversions
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-3">
            {links.map((link) => (
              <CampaignLinkCard key={link.id} link={link} />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
