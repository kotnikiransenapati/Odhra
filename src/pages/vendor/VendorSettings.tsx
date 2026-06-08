import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { haptic } from '@/lib/haptics';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KYCDocumentUpload } from '@/components/vendor/KYCDocumentUpload';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Store,
  Building,
  CreditCard,
  Camera,
  Loader2,
  Save,
  Bell,
  Shield,
  Palette,
  Mail,
  Truck,
  FileText,
} from 'lucide-react';

const SETTINGS_TABS = ['store', 'kyc', 'bank', 'shipping', 'notifications', 'policies'] as const;
type SettingsTab = typeof SETTINGS_TABS[number];

export default function VendorSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isUpdating, setIsUpdating] = useState(false);
  const requestedTab = searchParams.get('tab') as SettingsTab | null;
  const activeTab: SettingsTab = requestedTab && SETTINGS_TABS.includes(requestedTab) ? requestedTab : 'store';

  const handleTabChange = (tab: string) => {
    haptic('light');
    const p = new URLSearchParams(searchParams);
    if (tab === 'store') p.delete('tab'); else p.set('tab', tab);
    setSearchParams(p, { replace: true });
  };

  // Fetch vendor data
  const { data: vendor, isLoading } = useQuery({
    queryKey: ['vendor-settings', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Form states
  const [storeInfo, setStoreInfo] = useState({
    brand_name: '',
    bio: '',
    gst_number: '',
  });

  const [bankDetails, setBankDetails] = useState({
    account_name: '',
    account_number: '',
    bank_name: '',
    ifsc_code: '',
    upi_id: '',
  });

  const [socialLinks, setSocialLinks] = useState({
    website: '',
    instagram: '',
    facebook: '',
    twitter: '',
    shipping_partner: 'India Post / Delhivery',
    dispatch_sla: '2 business days',
    shipping_policy: '',
    return_policy: '',
  });

  const [notifications, setNotifications] = useState({
    email_orders: true,
    email_reviews: true,
    email_payouts: true,
    push_orders: true,
  });

  // Initialize form data when vendor loads
  useEffect(() => {
    if (vendor) {
      setStoreInfo({
        brand_name: vendor.brand_name || '',
        bio: vendor.bio || '',
        gst_number: vendor.gst_number || '',
      });
      
      const bank = vendor.bank_details as any || {};
      setBankDetails({
        account_name: bank.account_name || '',
        account_number: bank.account_number || '',
        bank_name: bank.bank_name || '',
        ifsc_code: bank.ifsc_code || '',
        upi_id: bank.upi_id || '',
      });
      
      const social = vendor.social_links as any || {};
      setSocialLinks({
        website: social.website || '',
        instagram: social.instagram || '',
        facebook: social.facebook || '',
        twitter: social.twitter || '',
        shipping_partner: social.shipping_partner || 'India Post / Delhivery',
        dispatch_sla: social.dispatch_sla || '2 business days',
        shipping_policy: social.shipping_policy || '',
        return_policy: social.return_policy || '',
      });
    }
  }, [vendor]);

  // Update mutations
  const updateStore = useMutation({
    mutationFn: async () => {
      if (!vendor) throw new Error('Vendor not found');
      const { error } = await supabase
        .from('vendors')
        .update({
          brand_name: storeInfo.brand_name,
          bio: storeInfo.bio,
          gst_number: storeInfo.gst_number,
        })
        .eq('id', vendor.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Store information updated');
      queryClient.invalidateQueries({ queryKey: ['vendor-settings'] });
    },
    onError: () => toast.error('Failed to update store information'),
  });

  const updateBank = useMutation({
    mutationFn: async () => {
      if (!vendor) throw new Error('Vendor not found');
      const { error } = await supabase
        .from('vendors')
        .update({ bank_details: bankDetails })
        .eq('id', vendor.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Bank details updated');
      queryClient.invalidateQueries({ queryKey: ['vendor-settings'] });
    },
    onError: () => toast.error('Failed to update bank details'),
  });

  const updateSocial = useMutation({
    mutationFn: async () => {
      if (!vendor) throw new Error('Vendor not found');
      const { error } = await supabase
        .from('vendors')
        .update({ social_links: socialLinks })
        .eq('id', vendor.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Store preferences updated');
      queryClient.invalidateQueries({ queryKey: ['vendor-settings'] });
    },
    onError: () => toast.error('Failed to update store preferences'),
  });

  // Image upload handlers
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !vendor) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setIsUpdating(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${vendor.id}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('vendor-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('vendor-assets')
        .getPublicUrl(fileName);

      await supabase.from('vendors').update({ logo_url: publicUrl }).eq('id', vendor.id);
      queryClient.invalidateQueries({ queryKey: ['vendor-settings'] });
      toast.success('Logo updated');
    } catch (error: any) {
      toast.error('Failed to upload logo');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !vendor) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setIsUpdating(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${vendor.id}/banner.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('vendor-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('vendor-assets')
        .getPublicUrl(fileName);

      await supabase.from('vendors').update({ banner_url: publicUrl }).eq('id', vendor.id);
      queryClient.invalidateQueries({ queryKey: ['vendor-settings'] });
      toast.success('Banner updated');
    } catch (error: any) {
      toast.error('Failed to upload banner');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <Store className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Vendor Account Required</h2>
        <p className="text-muted-foreground mb-6">You need to be a registered vendor</p>
        <Button asChild>
          <Link to="/become-vendor">Become a Seller</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/vendor"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="font-bold text-lg">Store Settings</h1>
            <p className="text-xs text-muted-foreground">Configure your store</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8" aria-labelledby="vendor-settings-heading">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
          <TabsList className="sticky top-20 z-40 grid h-auto w-full grid-cols-3 gap-1 bg-background/95 p-1 shadow-sm backdrop-blur md:grid-cols-6">
            <TabsTrigger value="store" className="min-h-11 gap-2 px-2 text-xs sm:text-sm">
              <Store className="w-4 h-4" />
              <span className="hidden xs:inline">Store</span>
            </TabsTrigger>
            <TabsTrigger value="kyc" className="min-h-11 gap-2 px-2 text-xs sm:text-sm">
              <Shield className="w-4 h-4" />
              <span className="hidden xs:inline">KYC</span>
            </TabsTrigger>
            <TabsTrigger value="bank" className="min-h-11 gap-2 px-2 text-xs sm:text-sm">
              <CreditCard className="w-4 h-4" />
              <span className="hidden xs:inline">Bank</span>
            </TabsTrigger>
            <TabsTrigger value="shipping" className="min-h-11 gap-2 px-2 text-xs sm:text-sm">
              <Truck className="w-4 h-4" />
              <span className="hidden xs:inline">Shipping</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="min-h-11 gap-2 px-2 text-xs sm:text-sm">
              <Bell className="w-4 h-4" />
              <span className="hidden xs:inline">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="policies" className="min-h-11 gap-2 px-2 text-xs sm:text-sm">
              <FileText className="w-4 h-4" />
              <span className="hidden xs:inline">Policies</span>
            </TabsTrigger>
          </TabsList>

          {/* Store Information */}
          <TabsContent value="store">
            <div className="space-y-6">
              {/* Store Branding */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="w-5 h-5" />
                      Store Branding
                    </CardTitle>
                    <CardDescription>Your store's visual identity</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Logo */}
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <Avatar className="w-24 h-24 border-4 border-accent/20">
                          <AvatarImage src={vendor.logo_url || ''} />
                          <AvatarFallback className="text-2xl font-bold bg-accent/10 text-accent">
                            {vendor.brand_name?.charAt(0) || 'S'}
                          </AvatarFallback>
                        </Avatar>
                        <label
                          htmlFor="logo-upload"
                          className="absolute bottom-0 right-0 w-8 h-8 bg-accent text-accent-foreground rounded-full flex items-center justify-center cursor-pointer hover:bg-accent/90 transition-colors"
                        >
                          <Camera className="w-4 h-4" />
                        </label>
                        <input
                          id="logo-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                          disabled={isUpdating}
                        />
                      </div>
                      <div>
                        <p className="font-medium">Store Logo</p>
                        <p className="text-sm text-muted-foreground">
                          Recommended: 200x200px, max 2MB
                        </p>
                      </div>
                    </div>

                    {/* Banner */}
                    <div>
                      <Label>Store Banner</Label>
                      <div className="mt-2 relative rounded-xl overflow-hidden bg-secondary/30 h-32 flex items-center justify-center">
                        {vendor.banner_url ? (
                          <img src={vendor.banner_url} alt="Banner" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-muted-foreground">No banner uploaded</div>
                        )}
                        <label
                          htmlFor="banner-upload"
                          className="absolute inset-0 flex items-center justify-center bg-foreground/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <div className="flex items-center gap-2 text-background">
                            <Camera className="w-5 h-5" />
                            <span>Change Banner</span>
                          </div>
                        </label>
                        <input
                          id="banner-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleBannerUpload}
                          disabled={isUpdating}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Recommended: 1200x300px, max 5MB
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Store Details */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Store className="w-5 h-5" />
                      Store Information
                    </CardTitle>
                    <CardDescription>Basic store details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="brand_name">Store Name</Label>
                      <Input
                        id="brand_name"
                        value={storeInfo.brand_name}
                        onChange={(e) => setStoreInfo({ ...storeInfo, brand_name: e.target.value })}
                        placeholder="Your store name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">Store Description</Label>
                      <Textarea
                        id="bio"
                        value={storeInfo.bio}
                        onChange={(e) => setStoreInfo({ ...storeInfo, bio: e.target.value })}
                        placeholder="Tell customers about your store..."
                        rows={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gst">GST Number</Label>
                      <Input
                        id="gst"
                        value={storeInfo.gst_number}
                        onChange={(e) => setStoreInfo({ ...storeInfo, gst_number: e.target.value })}
                        placeholder="22AAAAA0000A1Z5"
                      />
                    </div>
                    <Button onClick={() => updateStore.mutate()} disabled={updateStore.isPending} className="gap-2">
                      {updateStore.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Changes
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>

          {/* KYC */}
          <TabsContent value="kyc">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass mb-6">
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        KYC Verification
                      </CardTitle>
                      <CardDescription>Upload PAN and Aadhaar documents for account verification</CardDescription>
                    </div>
                    <Badge variant="outline" className="w-fit capitalize">
                      {vendor.kyc_status || (vendor.is_verified ? 'verified' : 'pending')}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
              <KYCDocumentUpload vendorId={vendor.id} />
            </motion.div>
          </TabsContent>

          {/* Bank Details */}
          <TabsContent value="bank">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    Bank Account Details
                  </CardTitle>
                  <CardDescription>For receiving payouts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="account_name">Account Holder Name</Label>
                      <Input
                        id="account_name"
                        value={bankDetails.account_name}
                        onChange={(e) => setBankDetails({ ...bankDetails, account_name: e.target.value })}
                        placeholder="As per bank records"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bank_name">Bank Name</Label>
                      <Input
                        id="bank_name"
                        value={bankDetails.bank_name}
                        onChange={(e) => setBankDetails({ ...bankDetails, bank_name: e.target.value })}
                        placeholder="e.g., HDFC Bank"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="account_number">Account Number</Label>
                      <Input
                        id="account_number"
                        value={bankDetails.account_number}
                        onChange={(e) => setBankDetails({ ...bankDetails, account_number: e.target.value })}
                        placeholder="Account number"
                        type="password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ifsc">IFSC Code</Label>
                      <Input
                        id="ifsc"
                        value={bankDetails.ifsc_code}
                        onChange={(e) => setBankDetails({ ...bankDetails, ifsc_code: e.target.value.toUpperCase() })}
                        placeholder="e.g., HDFC0001234"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="upi">UPI ID (Optional)</Label>
                    <Input
                      id="upi"
                      value={bankDetails.upi_id}
                      onChange={(e) => setBankDetails({ ...bankDetails, upi_id: e.target.value })}
                      placeholder="yourname@upi"
                    />
                  </div>

                  <Button onClick={() => updateBank.mutate()} disabled={updateBank.isPending} className="gap-2">
                    {updateBank.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Bank Details
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Shipping */}
          <TabsContent value="shipping">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    Shipping Preferences
                  </CardTitle>
                  <CardDescription>India Post and Delhivery are supported for fulfilment</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="shipping_partner">Preferred Shipping Partner</Label>
                    <Input
                      id="shipping_partner"
                      value={socialLinks.shipping_partner}
                      onChange={(e) => setSocialLinks({ ...socialLinks, shipping_partner: e.target.value })}
                      placeholder="India Post / Delhivery"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dispatch_sla">Dispatch SLA</Label>
                    <Input
                      id="dispatch_sla"
                      value={socialLinks.dispatch_sla}
                      onChange={(e) => setSocialLinks({ ...socialLinks, dispatch_sla: e.target.value })}
                      placeholder="2 business days"
                    />
                  </div>
                  <Button onClick={() => updateSocial.mutate()} disabled={updateSocial.isPending} className="gap-2">
                    {updateSocial.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Shipping
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>Manage how you receive updates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email Notifications
                    </h4>
                    <div className="space-y-3 pl-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">New Orders</p>
                          <p className="text-sm text-muted-foreground">Get notified when you receive a new order</p>
                        </div>
                        <Switch
                          checked={notifications.email_orders}
                          onCheckedChange={(checked) => setNotifications({ ...notifications, email_orders: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Reviews</p>
                          <p className="text-sm text-muted-foreground">Get notified when customers leave reviews</p>
                        </div>
                        <Switch
                          checked={notifications.email_reviews}
                          onCheckedChange={(checked) => setNotifications({ ...notifications, email_reviews: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Payout Updates</p>
                          <p className="text-sm text-muted-foreground">Get notified about payout status changes</p>
                        </div>
                        <Switch
                          checked={notifications.email_payouts}
                          onCheckedChange={(checked) => setNotifications({ ...notifications, email_payouts: checked })}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
