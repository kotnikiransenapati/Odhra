import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Shield } from 'lucide-react';

interface TwoFactorVerifyProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TwoFactorVerify({ onSuccess, onCancel }: TwoFactorVerifyProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [code, setCode] = useState('');
  const [factorId, setFactorId] = useState<string>('');

  useEffect(() => {
    const getFactors = async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (data?.totp && data.totp.length > 0) {
        setFactorId(data.totp[0].id);
      }
    };
    getFactors();
  }, []);

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    if (!factorId) {
      toast.error('No 2FA factor found');
      return;
    }

    setIsLoading(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) {
        toast.error(challengeError.message);
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });

      if (verifyError) {
        toast.error('Invalid code. Please try again.');
        setCode('');
        return;
      }

      toast.success('Verified successfully!');
      onSuccess?.();
    } catch (err) {
      toast.error('Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-accent" />
        </div>
        <h3 className="text-xl font-bold mb-2">Two-Factor Authentication</h3>
        <p className="text-muted-foreground text-sm">
          Enter the 6-digit code from your authenticator app
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="code">Verification Code</Label>
        <Input
          id="code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className="h-14 text-center text-2xl tracking-widest font-mono"
          autoFocus
        />
      </div>

      <div className="flex gap-3">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
        <Button 
          onClick={handleVerify} 
          disabled={isLoading || code.length !== 6} 
          className="flex-1"
        >
          {isLoading ? <LoadingSpinner size="sm" /> : 'Verify'}
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Lost access to your authenticator app?{' '}
        <button className="text-accent hover:underline">
          Contact Support
        </button>
      </p>
    </motion.div>
  );
}
