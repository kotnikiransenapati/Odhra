import React, { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface OTPInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  disabled?: boolean;
}

export function OTPInput({ length = 6, onComplete, disabled = false }: OTPInputProps) {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

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

  return (
    <div className="flex gap-3 justify-center">
      {Array.from({ length }).map((_, index) => (
        <motion.input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={otp[index]}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className={cn(
            'w-12 h-14 text-center text-2xl font-semibold rounded-xl',
            'border-2 border-border bg-card text-card-foreground',
            'focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none',
            'transition-all duration-200',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            otp[index] && 'border-accent bg-accent/5'
          )}
        />
      ))}
    </div>
  );
}
