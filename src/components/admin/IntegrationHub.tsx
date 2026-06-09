import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Loader2, Settings, Globe, BarChart3, Shield, Bell, Truck,
  Image as ImageIcon, Check, ExternalLink, Eye, EyeOff, Save,
} from 'lucide-react';
import { useIntegrationSettings, useUpdateIntegration, type IntegrationSetting } from '@/hooks/useIntegrationSettings';
import { toast } from 'sonner';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  shipping: <Truck className="w-5 h-5" />,
  analytics: <BarChart3 className="w-5 h-5" />,
  security: <Shield className="w-5 h-5" />,
  monitoring: <Globe className="w-5 h-5" />,
  notifications: <Bell className="w-5 h-5" />,
  marketing: <BarChart3 className="w-5 h-5" />,
  media: <ImageIcon className="w-5 h-5" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  shipping: 'Shipping & Logistics',
  analytics: 'Analytics & Tracking',
  security: 'Security',
  monitoring: 'Monitoring',
  notifications: 'Notifications',
  marketing: 'Marketing',
  media: 'Media & Storage',
};

const CONFIG_FIELD_LABELS: Record<string, Record<string, { label: string; placeholder: string; sensitive?: boolean; description?: string }>> = {
  indiapost: {
    api_base_url: { label: 'API Base URL', placeholder: 'https://api.postalpincode.in' },
    default_origin_pincode: { label: 'Default Origin Pincode', placeholder: '110001', description: 'Your warehouse/dispatch pincode' },
    default_service: { label: 'Default Service', placeholder: 'speed_post', description: 'speed_post, registered_post, ems_speed_post, business_parcel' },
  },
  // Shiprocket integration intentionally removed — platform uses India Post / Delhivery only.
  google_analytics: {
    measurement_id: { label: 'Measurement ID', placeholder: 'G-XXXXXXXXXX', description: 'Found in GA4 > Admin > Data Streams' },
    stream_id: { label: 'Stream ID (optional)', placeholder: '1234567890' },
  },
  facebook_pixel: {
    pixel_id: { label: 'Pixel ID', placeholder: '1234567890', description: 'Found in Meta Events Manager' },
    access_token: { label: 'Conversions API Token', placeholder: 'EAAxxxxxx', sensitive: true, description: 'For server-side events (optional)' },
  },
  google_recaptcha: {
    site_key: { label: 'Site Key', placeholder: '6Lxxxxxxxxxxxxxxxxx', description: 'reCAPTCHA v3 site key from Google Console' },
    score_threshold: { label: 'Score Threshold', placeholder: '0.5', description: 'Min score (0-1). Lower = more permissive' },
  },
  sentry: {
    dsn: { label: 'DSN', placeholder: 'https://xxx@xxx.ingest.sentry.io/xxx', description: 'Found in Sentry > Settings > Projects > Client Keys' },
    environment: { label: 'Environment', placeholder: 'production' },
    traces_sample_rate: { label: 'Traces Sample Rate', placeholder: '0.1', description: '0 to 1 — percentage of transactions to trace' },
  },
  firebase_fcm: {
    vapid_key: { label: 'VAPID Key', placeholder: 'BLxxxxxxxx', description: 'Web Push certificate key pair' },
    project_id: { label: 'Firebase Project ID', placeholder: 'my-project-id' },
    sender_id: { label: 'Sender ID', placeholder: '1234567890' },
  },
  google_merchant: {
    merchant_id: { label: 'Merchant Center ID', placeholder: '1234567890' },
  },
  cloudinary: {
    cloud_name: { label: 'Cloud Name', placeholder: 'my-cloud' },
    upload_preset: { label: 'Upload Preset', placeholder: 'my-preset' },
  },
};

const SECRET_REQUIREMENTS: Record<string, string[]> = {
  google_recaptcha: ['RECAPTCHA_SECRET_KEY'],
  facebook_pixel: [],
  google_analytics: [],
  sentry: [],
  firebase_fcm: ['FIREBASE_SERVER_KEY'],
  google_merchant: [],
  cloudinary: [],
};

function IntegrationCard({ integration }: { integration: IntegrationSetting }) {
  const [configOpen, setConfigOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState<Record<string, any>>(integration.config || {});
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});
  const updateIntegration = useUpdateIntegration();

  const fieldDefs = CONFIG_FIELD_LABELS[integration.integration_key] || {};
  const secrets = SECRET_REQUIREMENTS[integration.integration_key] || [];

  const handleToggle = async (enabled: boolean) => {
    try {
      await updateIntegration.mutateAsync({
        integration_key: integration.integration_key,
        is_enabled: enabled,
      });
      toast.success(`${integration.integration_name} ${enabled ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to update integration');
    }
  };

  const handleSaveConfig = async () => {
    try {
      await updateIntegration.mutateAsync({
        integration_key: integration.integration_key,
        config: localConfig,
      });
      toast.success('Configuration saved');
      setConfigOpen(false);
    } catch {
      toast.error('Failed to save configuration');
    }
  };

  return (
    <Card className={`transition-all ${integration.is_enabled ? 'border-primary/30 shadow-md' : 'opacity-80'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${integration.is_enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {CATEGORY_ICONS[integration.category] || <Settings className="w-5 h-5" />}
            </div>
            <div>
              <CardTitle className="text-base">{integration.integration_name}</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {CATEGORY_LABELS[integration.category] || integration.category}
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={integration.is_enabled}
            onCheckedChange={handleToggle}
            disabled={updateIntegration.isPending}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-2">
          <Badge variant={integration.is_enabled ? 'default' : 'secondary'} className="text-xs">
            {integration.is_enabled ? 'Active' : 'Inactive'}
          </Badge>
          {secrets.length > 0 && (
            <Badge variant="outline" className="text-xs gap-1">
              <Shield className="w-3 h-3" />
              {secrets.length} secret{secrets.length > 1 ? 's' : ''} required
            </Badge>
          )}
        </div>

        <Separator className="my-3" />

        <Dialog open={configOpen} onOpenChange={setConfigOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full gap-2">
              <Settings className="w-4 h-4" />
              Configure
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {CATEGORY_ICONS[integration.category]}
                {integration.integration_name} Configuration
              </DialogTitle>
              <DialogDescription>
                Configure your {integration.integration_name} integration settings
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {Object.entries(fieldDefs).map(([key, def]) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={key} className="text-sm font-medium">
                    {def.label}
                  </Label>
                  <div className="relative">
                    <Input
                      id={key}
                      type={def.sensitive && !showSensitive[key] ? 'password' : 'text'}
                      value={localConfig[key] ?? ''}
                      onChange={(e) => setLocalConfig({ ...localConfig, [key]: e.target.value })}
                      placeholder={def.placeholder}
                    />
                    {def.sensitive && (
                      <button
                        type="button"
                        onClick={() => setShowSensitive({ ...showSensitive, [key]: !showSensitive[key] })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showSensitive[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                  {def.description && (
                    <p className="text-xs text-muted-foreground">{def.description}</p>
                  )}
                </div>
              ))}

              {secrets.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Shield className="w-4 h-4 text-warning" />
                      Required Secrets (Backend)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      These secrets must be configured in your backend environment:
                    </p>
                    <div className="space-y-1">
                      {secrets.map((s) => (
                        <div key={s} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                          <code className="text-xs font-mono">{s}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setConfigOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveConfig} disabled={updateIntegration.isPending} className="gap-2">
                {updateIntegration.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Configuration
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export function IntegrationHub() {
  const { integrations, isLoading } = useIntegrationSettings();

  const categories = [...new Set(integrations.map((i) => i.category))];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Integration Hub</h2>
        <p className="text-muted-foreground">
          Manage all third-party integrations from one place. Toggle, configure, and monitor your connected services.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Settings className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{integrations.length}</p>
            <p className="text-sm text-muted-foreground">Total Integrations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Check className="w-8 h-8 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold">{integrations.filter((i) => i.is_enabled).length}</p>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Globe className="w-8 h-8 text-info mx-auto mb-2" />
            <p className="text-2xl font-bold">{categories.length}</p>
            <p className="text-sm text-muted-foreground">Categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Shield className="w-8 h-8 text-warning mx-auto mb-2" />
            <p className="text-2xl font-bold">
              {integrations.filter((i) => (SECRET_REQUIREMENTS[i.integration_key]?.length ?? 0) > 0).length}
            </p>
            <p className="text-sm text-muted-foreground">Need Secrets</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all">All</TabsTrigger>
          {categories.map((cat) => (
            <TabsTrigger key={cat} value={cat} className="gap-1.5">
              {CATEGORY_ICONS[cat]}
              {CATEGORY_LABELS[cat] || cat}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((integration) => (
              <IntegrationCard key={integration.id} integration={integration} />
            ))}
          </div>
        </TabsContent>

        {categories.map((cat) => (
          <TabsContent key={cat} value={cat}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {integrations
                .filter((i) => i.category === cat)
                .map((integration) => (
                  <IntegrationCard key={integration.id} integration={integration} />
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
