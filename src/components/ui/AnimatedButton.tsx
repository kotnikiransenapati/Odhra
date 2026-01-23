import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { haptic, type HapticStyle } from "@/lib/haptics";
import { SPRING } from "@/lib/animations";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 select-none touch-manipulation",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm",
        destructive: "bg-destructive text-destructive-foreground shadow-sm",
        outline: "border border-input bg-background hover:bg-accent/10",
        secondary: "bg-secondary text-secondary-foreground shadow-sm",
        ghost: "hover:bg-accent/10",
        link: "text-primary underline-offset-4 hover:underline",
        premium: "bg-gradient-to-r from-accent to-warning text-accent-foreground shadow-lg",
        success: "bg-success text-success-foreground shadow-sm",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-lg px-3.5 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface AnimatedButtonProps
  extends VariantProps<typeof buttonVariants> {
  className?: string;
  hapticStyle?: HapticStyle;
  disableHaptic?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  children?: React.ReactNode;
  'aria-label'?: string;
}

const AnimatedButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    hapticStyle = 'medium',
    disableHaptic = false,
    onClick,
    children,
    disabled,
    type = 'button',
    ...props 
  }, ref) => {
    
    const handleClick = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disableHaptic && !disabled) {
        haptic(hapticStyle);
      }
      onClick?.(e);
    }, [disableHaptic, hapticStyle, onClick, disabled]);

    return (
      <motion.button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onClick={handleClick}
        whileHover={disabled ? undefined : { scale: 1.02 }}
        whileTap={disabled ? undefined : { scale: 0.96 }}
        transition={SPRING.stiff}
        disabled={disabled}
        type={type}
        {...props}
      >
        {children}
      </motion.button>
    );
  },
);
AnimatedButton.displayName = "AnimatedButton";

export { AnimatedButton, buttonVariants };
