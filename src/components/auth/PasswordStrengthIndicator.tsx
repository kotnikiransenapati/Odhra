import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p) => /[0-9]/.test(p) },
];

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

export function PasswordStrengthIndicator({ password, className }: PasswordStrengthIndicatorProps) {
  const analysis = useMemo(() => {
    const passed = requirements.filter((req) => req.test(password));
    const strength = passed.length / requirements.length;
    
    let strengthLabel: string;
    let strengthColor: string;
    
    if (password.length === 0) {
      strengthLabel = '';
      strengthColor = 'bg-muted';
    } else if (strength <= 0.25) {
      strengthLabel = 'Weak';
      strengthColor = 'bg-destructive';
    } else if (strength <= 0.5) {
      strengthLabel = 'Fair';
      strengthColor = 'bg-warning';
    } else if (strength <= 0.75) {
      strengthLabel = 'Good';
      strengthColor = 'bg-warning';
    } else {
      strengthLabel = 'Strong';
      strengthColor = 'bg-success';
    }
    
    return {
      passed,
      strength,
      strengthLabel,
      strengthColor,
      requirementsMet: requirements.map((req) => ({
        ...req,
        met: req.test(password),
      })),
    };
  }, [password]);

  if (password.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className={cn('space-y-3', className)}
      >
        {/* Strength Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Password strength</span>
            <span className={cn(
              'font-medium',
              analysis.strength <= 0.25 && 'text-destructive',
              analysis.strength > 0.25 && analysis.strength <= 0.5 && 'text-warning',
              analysis.strength > 0.5 && analysis.strength <= 0.75 && 'text-warning',
              analysis.strength > 0.75 && 'text-success'
            )}>
              {analysis.strengthLabel}
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={cn('h-full rounded-full transition-colors', analysis.strengthColor)}
              initial={{ width: 0 }}
              animate={{ width: `${analysis.strength * 100}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Requirements List */}
        <div className="grid grid-cols-2 gap-2">
          {analysis.requirementsMet.map((req, index) => (
            <motion.div
              key={req.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-1.5 text-xs"
            >
              <div className={cn(
                'w-4 h-4 rounded-full flex items-center justify-center transition-colors',
                req.met ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'
              )}>
                {req.met ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <X className="w-3 h-3" />
                )}
              </div>
              <span className={cn(
                'transition-colors',
                req.met ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {req.label}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
