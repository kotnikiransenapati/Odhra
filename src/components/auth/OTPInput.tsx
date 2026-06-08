import React, { useRef, useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OTPInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  disabled?: boolean;
  email?: string;
  showResend?: boolean;
  cooldownSeconds?: number;
}

export function OTPInput({ 
  length = 6, 
  onComplete, 
  disabled = false,
  email,
  showResend = true,
  cooldownSeconds = 60
}: OTPInputProps) {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''));
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Move to next input
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if complete
    const otpString = newOtp.join('');
    if (otpString.length === length && !newOtp.includes('')) {
      onComplete(otpString);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, length);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    pastedData.split('').forEach((char, i) => {
      if (i < length) newOtp[i] = char;
    });
    setOtp(newOtp);

    if (pastedData.length === length) {
      onComplete(pastedData);
    }
  };

  const handleResendCode = useCallback(async () => {
    if (!email || resendCooldown > 0 || isResending) return;
    
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      
      if (error) {
        if (error.message.includes('rate limit')) {
          toast.error('Too many attempts. Please wait a moment.');
        } else {
          toast.error(error.message);
        }
        return;
      }
      
      toast.success('Verification code sent!');
      setResendCooldown(cooldownSeconds);
      
      // Clear current OTP inputs
      setOtp(Array(length).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err) {
      toast.error('Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  }, [email, resendCooldown, isResending, cooldownSeconds, length]);

  const formatCooldown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs}s`;
  };

  return (
    <div className="space-y-6">
      {/* OTP Input Fields */}
      <div className="flex gap-1.5 xs:gap-2 sm:gap-3 justify-center">
        {Array.from({ length }).map((_, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ 
              delay: index * 0.05,
              type: "spring",
              stiffness: 300,
              damping: 20
            }}
          >
            <input
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={otp[index]}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              disabled={disabled}
              className={cn(
                'w-10 h-12 xs:w-11 xs:h-13 sm:w-12 sm:h-14 text-center text-xl xs:text-2xl font-bold rounded-xl',
                'bg-card border-2 border-border text-foreground',
                'focus:border-accent focus:ring-4 focus:ring-accent/20 focus:outline-none',
                'transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'hover:border-accent/50',
                otp[index] && 'border-accent bg-accent/5 shadow-lg shadow-accent/10'
              )}
            />
          </motion.div>
        ))}
      </div>

      {/* Resend Code Section */}
      {showResend && email && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Didn't receive a code?
          </p>
          
          {resendCooldown > 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-muted-foreground"
            >
              Resend available in{' '}
              <span className="font-semibold text-accent">
                {formatCooldown(resendCooldown)}
              </span>
            </motion.p>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResendCode}
              disabled={isResending || disabled}
              className="text-accent hover:text-accent/80 hover:bg-accent/10"
            >
              {isResending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Resend Code
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
