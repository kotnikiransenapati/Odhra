import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface EditorialPageHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  align?: 'left' | 'center';
  className?: string;
}

/**
 * Editorial-style page header: serif display title, uppercase eyebrow,
 * hairline divider — matches the Boutique Commerce design language.
 */
export function EditorialPageHeader({
  eyebrow,
  title,
  subtitle,
  icon,
  actions,
  align = 'left',
  className,
}: EditorialPageHeaderProps) {
  const isCenter = align === 'center';
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn('mb-8 pb-6 border-b border-border/40', className)}
    >
      <div
        className={cn(
          'flex flex-col gap-4',
          isCenter ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between',
        )}
      >
        <div className={cn('flex-1 min-w-0', isCenter && 'max-w-2xl mx-auto')}>
          {eyebrow && (
            <div
              className={cn(
                'flex items-center gap-2 mb-3 text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground',
                isCenter && 'justify-center',
              )}
            >
              <span className="inline-block w-6 h-px bg-border" aria-hidden />
              <span className="font-medium">{eyebrow}</span>
              <span className="inline-block w-6 h-px bg-border" aria-hidden />
            </div>
          )}
          <div className={cn('flex items-center gap-4', isCenter && 'justify-center')}>
            {icon && !isCenter && (
              <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/15 to-accent/5 ring-1 ring-border/40 flex items-center justify-center">
                {icon}
              </div>
            )}
            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl leading-[1.05] tracking-tight text-foreground">
              {title}
            </h1>
          </div>
          {subtitle && (
            <p
              className={cn(
                'mt-3 text-sm md:text-base text-muted-foreground max-w-2xl',
                isCenter && 'mx-auto',
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </motion.header>
  );
}
