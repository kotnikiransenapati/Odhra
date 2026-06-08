import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { TwoFactorSetup } from '@/components/auth/TwoFactorSetup';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { toast } from 'sonner';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert,
  Smartphone,
  Key,
  Loader2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

export function TwoFactorSettings() {
  const { user } = useAuth();
  const { isEnabled } = useFeatureFlag('two_factor_auth');
  const queryClient = useQueryClient();
  const [showSetup, setShowSetup] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);


  // Check if 2FA is enabled
  const { data: mfaFactors, isLoading } = useQuery({
    queryKey: ['mfa-factors', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const is2FAEnabled = mfaFactors?.totp && mfaFactors.totp.length > 0;

  // Disable 2FA
  const disable2FA = useMutation({
    mutationFn: async () => {
      if (!mfaFactors?.totp?.[0]?.id) throw new Error('No 2FA factor found');
      
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: mfaFactors.totp[0].id,
      });
      
      if (error) throw error;

      // Update profile
      await supabase
        .from('profiles')
        .update({ is_2fa_enabled: false })
        .eq('id', user!.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfa-factors'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Two-factor authentication disabled');
      setShowDisableConfirm(false);
    },
    onError: () => {
      toast.error('Failed to disable 2FA');
    },
  });

  const handleSetupComplete = async () => {
    // Update profile
    await supabase
      .from('profiles')
      .update({ is_2fa_enabled: true })
      .eq('id', user!.id);

    queryClient.invalidateQueries({ queryKey: ['mfa-factors'] });
    queryClient.invalidateQueries({ queryKey: ['profile'] });
    setShowSetup(false);
  };

  // Hide entire 2FA panel when admin has disabled the feature
  // (already-enrolled users keep working at the auth/verify step)
  if (!isEnabled) return null;

  if (isLoading) {
    return (
      <Card className="glass">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading security settings...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={`glass ${is2FAEnabled ? 'border-success/20' : 'border-warning/20'}`}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            {is2FAEnabled ? (
              <ShieldCheck className="w-5 h-5 text-success" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-warning" />
            )}
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                is2FAEnabled ? 'bg-success/10' : 'bg-warning/10'
              }`}>
                <Smartphone className={`w-6 h-6 ${
                  is2FAEnabled ? 'text-success' : 'text-warning'
                }`} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium">Authenticator App</p>
                  <Badge variant={is2FAEnabled ? 'default' : 'secondary'}>
                    {is2FAEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {is2FAEnabled 
                    ? 'Your account is protected with an authenticator app'
                    : 'Use an authenticator app like Google Authenticator for extra security'
                  }
                </p>
              </div>
            </div>
            <Button
              variant={is2FAEnabled ? 'outline' : 'default'}
              onClick={() => is2FAEnabled ? setShowDisableConfirm(true) : setShowSetup(true)}
            >
              {is2FAEnabled ? 'Disable' : 'Enable'}
            </Button>
          </div>

          {/* Security tips */}
          {!is2FAEnabled && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-warning/5 border border-warning/20 rounded-lg"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Recommended: Enable 2FA</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Two-factor authentication adds an extra layer of security. Even if someone 
                    knows your password, they won't be able to access your account without the code 
                    from your authenticator app.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {is2FAEnabled && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-success/5 border border-success/20 rounded-lg"
            >
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-success shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Your account is secure</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Two-factor authentication is enabled. You'll need your authenticator 
                    app to sign in on new devices.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* 2FA Setup Dialog */}
      <Dialog open={showSetup} onOpenChange={setShowSetup}>
        <DialogContent className="sm:max-w-md">
          <TwoFactorSetup 
            onComplete={handleSetupComplete}
            onCancel={() => setShowSetup(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Disable Confirmation Dialog */}
      <Dialog open={showDisableConfirm} onOpenChange={setShowDisableConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Disable Two-Factor Authentication
            </DialogTitle>
            <DialogDescription>
              This will make your account less secure. Are you sure you want to disable 2FA?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisableConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => disable2FA.mutate()}
              disabled={disable2FA.isPending}
            >
              {disable2FA.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Disable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
