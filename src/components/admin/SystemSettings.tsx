import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useSystemSettings, useBulkUpdateSettings } from '@/hooks/useAdminSettings';
import { ColorPaletteCustomizer } from '@/components/admin/ColorPaletteCustomizer';
import {
  Settings,
  Palette,
  Globe,
  Shield,
  Zap,
  Bell,
  Mail,
  CreditCard,
  Moon,
  Sun,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Database,
  Server,
} from 'lucide-react';

export function SystemSettings() {
  const { data: settings, isLoading } = useSystemSettings();
  const updateSettings = useBulkUpdateSettings();
  
  const [localSettings, setLocalSettings] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings?.grouped) {
      setLocalSettings(settings.grouped);
    }
  }, [settings]);

  const updateLocal = (key: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    const updates = Object.entries(localSettings).map(([key, value]) => ({ key, value }));
    await updateSettings.mutateAsync(updates);
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-48" />
        <div className="grid gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 mb-6">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="w-4 h-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="w-4 h-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-2">
            <Zap className="w-4 h-4" />
            Features
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="w-4 h-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Maintenance Mode */}
            <Card className="glass border-destructive/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  Maintenance Mode
                </CardTitle>
                <CardDescription>
                  Enable maintenance mode to temporarily disable the storefront for customers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                  <div>
                    <p className="font-medium">Enable Maintenance Mode</p>
                    <p className="text-sm text-muted-foreground">
                      The site will show a maintenance message to visitors
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.maintenance_mode === true}
                    onCheckedChange={(checked) => updateLocal('maintenance_mode', checked)}
                  />
                </div>
                {localSettings.maintenance_mode && (
                  <div className="space-y-2">
                    <Label>Maintenance Message</Label>
                    <Textarea
                      value={localSettings.maintenance_message || ''}
                      onChange={(e) => updateLocal('maintenance_message', e.target.value)}
                      placeholder="We're currently upgrading our systems. Please check back soon!"
                      className="min-h-[100px]"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Site Information */}
            <Card className="glass mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Site Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Site Name</Label>
                    <Input 
                      value={localSettings.site_name || ''} 
                      onChange={(e) => updateLocal('site_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Support Email</Label>
                    <Input 
                      value={localSettings.support_email || ''} 
                      onChange={(e) => updateLocal('support_email', e.target.value)}
                      type="email" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Support Phone</Label>
                    <Input 
                      value={localSettings.support_phone || ''} 
                      onChange={(e) => updateLocal('support_phone', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Default Currency</Label>
                    <Input 
                      value={localSettings.default_currency || ''} 
                      onChange={(e) => updateLocal('default_currency', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Site Description</Label>
                  <Textarea
                    value={localSettings.site_description || ''}
                    onChange={(e) => updateLocal('site_description', e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Commission Settings */}
            <Card className="glass mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Commission & Payments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Default Commission Rate (%)</Label>
                    <Input defaultValue="10" type="number" min="0" max="100" />
                  </div>
                  <div className="space-y-2">
                    <Label>Min Payout Amount (₹)</Label>
                    <Input defaultValue="500" type="number" />
                  </div>
                  <div className="space-y-2">
                    <Label>Payout Holding Days</Label>
                    <Input defaultValue="7" type="number" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Color Palette Customizer */}
            <ColorPaletteCustomizer />

            {/* Default Theme */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Default Theme
                </CardTitle>
                <CardDescription>Set the default theme for new visitors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-xl bg-secondary/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Moon className="w-5 h-5" />
                      <div>
                        <p className="font-medium">Theme Mode</p>
                        <p className="text-sm text-muted-foreground">Choose light or dark as default</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-2">
                        <Sun className="w-4 h-4" /> Light
                      </Button>
                      <Button size="sm" className="gap-2">
                        <Moon className="w-4 h-4" /> Dark
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Feature Flags */}
        <TabsContent value="features" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Feature Flags
                </CardTitle>
                <CardDescription>
                  Enable or disable features across the platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { id: 'enable_spin_wheel', label: 'Spin Wheel', description: 'Enable the spin-to-win wheel for customers' },
                  { id: 'enable_flash_sales', label: 'Flash Sales', description: 'Enable flash sale banners and functionality' },
                  { id: 'auto_approve_vendors', label: 'Auto-Approve Vendors', description: 'Automatically approve new vendor registrations' },
                  { id: 'auto_approve_reviews', label: 'Auto-Approve Reviews', description: 'Automatically approve customer reviews' },
                ].map((feature) => {
                  const isEnabled = localSettings[feature.id] === true;
                  return (
                    <div key={feature.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${isEnabled ? 'bg-success' : 'bg-muted'}`} />
                        <div>
                          <p className="font-medium">{feature.label}</p>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                      <Switch 
                        checked={isEnabled} 
                        onCheckedChange={(checked) => updateLocal(feature.id, checked)} 
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Email Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'New Order Notifications', description: 'Send email when a new order is placed' },
                  { label: 'Low Stock Alerts', description: 'Alert when product stock falls below threshold' },
                  { label: 'New Vendor Registration', description: 'Notify when a new vendor signs up' },
                  { label: 'Payout Requests', description: 'Alert when vendors request payouts' },
                  { label: 'Review Submitted', description: 'Notify when customers submit reviews' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Two-Factor Authentication', description: 'Require 2FA for admin accounts', enabled: true },
                  { label: 'Session Timeout', description: 'Auto logout after 30 minutes of inactivity', enabled: true },
                  { label: 'IP Whitelisting', description: 'Restrict admin access to specific IPs', enabled: false },
                  { label: 'Fraud Detection', description: 'AI-powered fraud detection for orders', enabled: true },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <Switch defaultChecked={item.enabled} />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* System Status */}
            <Card className="glass mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="w-5 h-5" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Database', status: 'Healthy', icon: Database },
                    { label: 'API Server', status: 'Running', icon: Server },
                    { label: 'Storage', status: 'Connected', icon: Database },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-success/10 border border-success/20">
                      <item.icon className="w-5 h-5 text-success" />
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-success" />
                          <span className="text-sm text-success">{item.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        {hasChanges && (
          <Badge variant="outline" className="text-warning border-warning self-center">
            Unsaved changes
          </Badge>
        )}
        <Button onClick={handleSave} disabled={updateSettings.isPending || !hasChanges} className="gap-2">
          {updateSettings.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
