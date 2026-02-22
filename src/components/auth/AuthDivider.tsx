import React, { forwardRef } from 'react';

export const AuthDivider = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => {
    return (
      <div ref={ref} className="relative my-6" {...props}>
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/60" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-4 text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
            Or
          </span>
        </div>
      </div>
    );
  }
);

AuthDivider.displayName = 'AuthDivider';
