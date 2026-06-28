import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { TwoFactorSettings } from '@/components/security/TwoFactorSettings';
import { SessionManager } from '@/components/security/SessionManager';
import { useRecordSession } from '@/hooks/useSessions';
import { WhatsAppSettings as WhatsAppSettingsComponent } from '@/components/customer/WhatsAppSettings';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { passwordSchema, nameSchema } from '@/lib/validations/auth';
import { haptic } from '@/lib/haptics';
import { SecurityOverviewCard } from '@/components/account/SecurityOverviewCard';
import { CommunicationLog } from '@/components/account/CommunicationLog';
import {
  ArrowLeft,
  Settings as SettingsIcon,
  Camera,
  Loader2,
  User,
  Mail,
  Phone,
  Key,
  Shield,
  LogOut,
  Download,
  Trash2,
  AlertTriangle,
  Bell,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
}

const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+?\d{10,15})?$/, 'Enter a valid phone number (10–15 digits, optional + prefix)');

const TABS = ['profile', 'security', 'notifications', 'privacy'] as const;
type TabKey = (typeof TABS)[number];

export default function Settings() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const recordSession = useRecordSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabKey) || 'profile';
  const [tab, setTab] = useState<TabKey>(TABS.includes(initialTab) ? initialTab : 'profile');

  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', phone: '' });
  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    if (user) recordSession.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    setSearchParams((p) => {
      p.set('tab', tab);
      return p;
    }, { replace: true });
  }, [tab, setSearchParams]);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, avatar_url')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) setFormData({ full_name: profile.full_name || '', phone: profile.phone || '' });
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      const { error } = await supabase.from('profiles').update(updates).eq('id', user!.id);
      if (error) throw error;
      await supabase.auth.updateUser({ data: { full_name: updates.full_name, avatar_url: updates.avatar_url } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      haptic('success');
      toast.success('Profile updated');
    },
    onError: () => {
      haptic('error');
      toast.error('Failed to update profile');
    },
  });

  const handleSaveProfile = () => {
    const nameRes = nameSchema.safeParse(formData.full_name);
    if (!nameRes.success) return toast.error(nameRes.error.issues[0].message);
    const phoneRes = phoneSchema.safeParse(formData.phone);
    if (!phoneRes.success) return toast.error(phoneRes.error.issues[0].message);
    updateProfile.mutate(formData);
  };

  const handleChangePassword = async () => {
    const res = passwordSchema.safeParse(passwordData.newPassword);
    if (!res.success) return toast.error(res.error.issues[0].message);
    if (passwordData.newPassword !== passwordData.confirmPassword) return toast.error('Passwords do not match');

    setIsUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
      if (error) throw error;
      haptic('success');
      toast.success('Password changed');
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      haptic('error');
      toast.error(error.message || 'Failed to change password');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file');
    if (file.size > 2 * 1024 * 1024) return toast.error('Image must be less than 2MB');

    setIsUpdating(true);
    try {
      const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const fileName = `${user!.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);

      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user!.id);
      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });

      queryClient.invalidateQueries({ queryKey: ['profile'] });
      haptic('success');
      toast.success('Avatar updated');
    } catch (err: any) {
      haptic('error');
      toast.error(err?.message || 'Failed to upload avatar');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-dvh bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[60vh] px-4">
          <SettingsIcon className="w-16 h-16 text-muted-foreground mb-4" aria-hidden />
          <h2 className="text-xl font-semibold mb-2">Login required</h2>
          <p className="text-muted-foreground mb-6">Please log in to access your settings</p>
          <Button asChild><Link to="/auth">Login / Sign Up</Link></Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background">
        <Navbar />
        <div className="pt-24"><PageLoading text="Loading settings..." /></div>
      </div>
    );
  }

  const getInitials = (name?: string | null, email?: string) => {
    if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    return email?.charAt(0).toUpperCase() || 'U';
  };

  return (
    <div className="min-h-dvh bg-background">
      <a href="#settings-main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-3 focus:py-2 focus:rounded-md">
        Skip to main content
      </a>
      <Navbar />

      <main id="settings-main" tabIndex={-1} className="pt-24 pb-24 px-4 outline-none" aria-labelledby="settings-heading">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <Button variant="ghost" asChild className="mb-3 -ml-3" onClick={() => haptic('light')}>
              <Link to="/account" className="gap-2">
                <ArrowLeft className="w-4 h-4" aria-hidden /> Back to Account
              </Link>
            </Button>
            <h1 id="settings-heading" className="text-2xl sm:text-3xl font-bold tracking-tight">Account Settings</h1>
            <p className="text-muted-foreground mt-1">Manage your profile, security & preferences</p>
          </motion.div>

          <Tabs value={tab} onValueChange={(v) => { haptic('selection'); setTab(v as TabKey); }}>
            <TabsList className="grid grid-cols-4 w-full mb-6 h-11">
              <TabsTrigger value="profile" className="gap-1.5"><User className="w-3.5 h-3.5" aria-hidden /><span className="hidden xs:inline">Profile</span></TabsTrigger>
              <TabsTrigger value="security" className="gap-1.5"><Shield className="w-3.5 h-3.5" aria-hidden /><span className="hidden xs:inline">Security</span></TabsTrigger>
              <TabsTrigger value="notifications" className="gap-1.5"><Bell className="w-3.5 h-3.5" aria-hidden /><span className="hidden xs:inline">Alerts</span></TabsTrigger>
              <TabsTrigger value="privacy" className="gap-1.5"><Download className="w-3.5 h-3.5" aria-hidden /><span className="hidden xs:inline">Privacy</span></TabsTrigger>
            </TabsList>

            {/* PROFILE */}
            <TabsContent value="profile" className="space-y-6 mt-0">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Camera className="w-5 h-5 text-accent" aria-hidden /> Profile photo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <Avatar className="w-24 h-24 border-4 border-accent/20">
                        <AvatarImage src={profile?.avatar_url || ''} alt="Your avatar" />
                        <AvatarFallback className="text-2xl font-bold bg-accent/10 text-accent">
                          {getInitials(profile?.full_name, profile?.email)}
                        </AvatarFallback>
                      </Avatar>
                      <label
                        htmlFor="avatar-upload"
                        className="absolute bottom-0 right-0 w-9 h-9 bg-accent text-accent-foreground rounded-full flex items-center justify-center cursor-pointer hover:bg-accent/90 transition-colors shadow-md"
                        aria-label="Change profile photo"
                      >
                        {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" aria-hidden />}
                      </label>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        onChange={handleAvatarUpload}
                        disabled={isUpdating}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{profile?.full_name || 'User'}</p>
                      <p className="text-sm text-muted-foreground truncate">{profile?.email}</p>
                      <p className="text-xs text-muted-foreground mt-2">PNG, JPG or WebP, up to 2MB</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><User className="w-5 h-5 text-accent" aria-hidden /> Personal information</CardTitle>
                  <CardDescription>Update your name and contact number</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full name</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="Enter your full name"
                      autoComplete="name"
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
                      <Input id="email" value={profile?.email || ''} disabled className="bg-muted pl-9" />
                    </div>
                    <p className="text-xs text-muted-foreground">Email cannot be changed here. Contact support if needed.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone number</Label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
                      <Input
                        id="phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <Button onClick={handleSaveProfile} disabled={updateProfile.isPending} className="btn-press">
                    {updateProfile.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />}
                    Save changes
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* SECURITY */}
            <TabsContent value="security" className="space-y-6 mt-0">
              <SecurityOverviewCard />
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Key className="w-5 h-5 text-accent" aria-hidden /> Change password</CardTitle>
                  <CardDescription>Use at least 8 characters with mixed case and numbers</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPwd ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        placeholder="Enter new password"
                        autoComplete="new-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((s) => !s)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                        aria-label={showPwd ? 'Hide password' : 'Show password'}
                      >
                        {showPwd ? <EyeOff className="w-4 h-4" aria-hidden /> : <Eye className="w-4 h-4" aria-hidden />}
                      </button>
                    </div>
                    {passwordData.newPassword && <PasswordStrengthIndicator password={passwordData.newPassword} />}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm new password</Label>
                    <Input
                      id="confirmPassword"
                      type={showPwd ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                    />
                  </div>
                  <Button onClick={handleChangePassword} disabled={isUpdating || !passwordData.newPassword} className="btn-press">
                    {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />}
                    Change password
                  </Button>
                </CardContent>
              </Card>

              <TwoFactorSettings />
              <SessionManager />
            </TabsContent>

            {/* NOTIFICATIONS */}
            <TabsContent value="notifications" className="space-y-6 mt-0">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Bell className="w-5 h-5 text-accent" aria-hidden /> Email preferences</CardTitle>
                  <CardDescription>Choose which emails you'd like to receive</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" asChild className="btn-press">
                    <Link to="/account/notifications">Manage email preferences</Link>
                  </Button>
                </CardContent>
              </Card>

              <WhatsAppSettingsComponent />
              <CommunicationLog />
            </TabsContent>

            {/* PRIVACY */}
            <TabsContent value="privacy" className="space-y-6 mt-0">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Download className="w-5 h-5 text-accent" aria-hidden /> Data & privacy</CardTitle>
                  <CardDescription>Download your data or manage your account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Export your data</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      Download a copy of all your personal data including orders, reviews, and preferences.
                    </p>
                    <Button
                      variant="outline"
                      className="gap-2 btn-press"
                      onClick={async () => {
                        const id = toast.loading('Preparing your data export...');
                        try {
                          const { data, error } = await supabase.functions.invoke('gdpr-data-export');
                          if (error) throw error;
                          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `odhra-data-export-${new Date().toISOString().split('T')[0]}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                          toast.dismiss(id);
                          toast.success('Data exported');
                        } catch (err: any) {
                          toast.dismiss(id);
                          toast.error(err?.message || 'Failed to export data');
                        }
                      }}
                    >
                      <Download className="w-4 h-4" aria-hidden /> Download my data
                    </Button>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-sm font-medium mb-2 text-destructive">Delete account</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      Permanently delete your account and all associated data. This cannot be undone.
                    </p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="gap-2 btn-press" onClick={() => haptic('warning')}>
                          <Trash2 className="w-4 h-4" aria-hidden /> Delete my account
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-destructive" aria-hidden /> Are you absolutely sure?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete your account, including all orders, reviews, wishlist items, and personal data. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={async () => {
                              const id = toast.loading('Deleting your account...');
                              try {
                                const { data, error } = await supabase.functions.invoke('gdpr-account-deletion', { body: { confirm: 'DELETE' } });
                                if (error) throw error;
                                if ((data as any)?.error) throw new Error((data as any).error);
                                await signOut();
                                toast.dismiss(id);
                                toast.success("Account deleted. We're sorry to see you go.");
                              } catch (err: any) {
                                toast.dismiss(id);
                                toast.error(err?.message || 'Failed to delete account. Please contact support.');
                              }
                            }}
                          >
                            Delete my account
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass border-destructive/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Shield className="w-5 h-5 text-destructive" aria-hidden /> Sign out</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="gap-2 text-destructive hover:text-destructive btn-press"
                    onClick={() => { haptic('warning'); signOut(); }}
                  >
                    <LogOut className="w-4 h-4" aria-hidden /> Sign out
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
