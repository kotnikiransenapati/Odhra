import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Shield, Copy, Check, QrCode, KeyRound } from 'lucide-react';

interface TwoFactorSetupProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export function TwoFactorSetup({ onComplete, onCancel }: TwoFactorSetupProps) {
  const [step, setStep] = useState<'intro' | 'setup' | 'verify'>('intro');
  const [isLoading, setIsLoading] = useState(false);
  const [factorId, setFactorId] = useState<string>('');
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [verifyCode, setVerifyCode] = useState('');
  const [copied, setCopied] = useState(false);

  const handleEnroll = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data) {
        setFactorId(data.id);
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
        setStep('setup');
      }
    } catch (err) {
      toast.error('Failed to set up 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verifyCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
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
        code: verifyCode,
      });

      if (verifyError) {
        toast.error('Invalid code. Please try again.');
        return;
      }

      toast.success('Two-factor authentication enabled!');
      onComplete?.();
    } catch (err) {
      toast.error('Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Secret copied to clipboard');
  };

  return (
    <div className="space-y-6">
      {step === 'intro' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6"
        >
          <div className="w-20 h-20 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto">
            <Shield className="w-10 h-10 text-accent" />
          </div>
          
          <div>
            <h3 className="text-xl font-bold mb-2">Enable Two-Factor Authentication</h3>
            <p className="text-muted-foreground text-sm">
              Add an extra layer of security to your account using an authenticator app
              like Google Authenticator or Authy.
            </p>
          </div>

          <div className="space-y-3 text-left p-4 rounded-xl bg-secondary/50">
            <p className="text-sm font-medium">Benefits of 2FA:</p>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-success" />
                Protects against unauthorized access
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-success" />
                Secures your payment methods
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-success" />
                Prevents account takeovers
              </li>
            </ul>
          </div>

          <div className="flex gap-3">
            {onCancel && (
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
            )}
            <Button onClick={handleEnroll} disabled={isLoading} className="flex-1">
              {isLoading ? <LoadingSpinner size="sm" /> : 'Get Started'}
            </Button>
          </div>
        </motion.div>
      )}

      {step === 'setup' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="text-center">
            <h3 className="text-xl font-bold mb-2">Scan QR Code</h3>
            <p className="text-muted-foreground text-sm">
              Scan this QR code with your authenticator app
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="p-4 bg-card rounded-2xl">
              {qrCode && (
                <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
              )}
            </div>
          </div>

          {/* Manual Entry */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              Or enter this secret manually:
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-secondary rounded-lg font-mono text-sm break-all">
                {secret}
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={copySecret}
                className="shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <Button onClick={() => setStep('verify')} className="w-full">
            Continue
          </Button>
        </motion.div>
      )}

      {step === 'verify' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-xl font-bold mb-2">Enter Verification Code</h3>
            <p className="text-muted-foreground text-sm">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="verifyCode">Verification Code</Label>
            <Input
              id="verifyCode"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
              className="h-14 text-center text-2xl tracking-widest font-mono"
            />
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setStep('setup')} 
              className="flex-1"
            >
              Back
            </Button>
            <Button 
              onClick={handleVerify} 
              disabled={isLoading || verifyCode.length !== 6} 
              className="flex-1"
            >
              {isLoading ? <LoadingSpinner size="sm" /> : 'Verify & Enable'}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
