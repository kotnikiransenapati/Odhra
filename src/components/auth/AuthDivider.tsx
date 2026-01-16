import React, { forwardRef } from 'react';

export const AuthDivider = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => {
    return (
      <div ref={ref} className="relative my-6" {...props}>
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-4 text-muted-foreground font-medium tracking-wider">
            Or continue with email
          </span>
        </div>
      </div>
    );
  }
);

AuthDivider.displayName = 'AuthDivider';
