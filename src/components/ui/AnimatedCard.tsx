import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { SPRING, VIEWPORT } from "@/lib/animations";

interface AnimatedCardProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  hoverEffect?: boolean;
  clickable?: boolean;
  staggerIndex?: number;
  animateOnScroll?: boolean;
}

const AnimatedCard = React.forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ 
    className, 
    children, 
    hoverEffect = true, 
    clickable = false,
    staggerIndex = 0,
    animateOnScroll = true,
    onClick,
    ...props 
  }, ref) => {
    const handleClick = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (clickable) {
        haptic('selection');
      }
      onClick?.(e);
    }, [clickable, onClick]);

    const baseAnimation = animateOnScroll ? {
      initial: { opacity: 0, y: 20, scale: 0.98 },
      whileInView: { opacity: 1, y: 0, scale: 1 },
      viewport: VIEWPORT.default,
      transition: { 
        ...SPRING.gentle,
        delay: staggerIndex * 0.05,
      },
    } : {};

    const hoverAnimation = hoverEffect ? {
      whileHover: { 
        y: -4, 
        scale: 1.01,
        transition: SPRING.stiff,
      },
    } : {};

    const tapAnimation = clickable ? {
      whileTap: { scale: 0.98 },
    } : {};

    return (
      <motion.div
        ref={ref}
        className={cn(
          "rounded-2xl bg-card text-card-foreground shadow-md border border-border/50 overflow-hidden",
          "will-change-transform backface-hidden",
          clickable && "cursor-pointer",
          className
        )}
        onClick={handleClick}
        {...baseAnimation}
        {...hoverAnimation}
        {...tapAnimation}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

AnimatedCard.displayName = "AnimatedCard";

// Card subcomponents
const AnimatedCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-5", className)}
    {...props}
  />
));
AnimatedCardHeader.displayName = "AnimatedCardHeader";

const AnimatedCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
AnimatedCardTitle.displayName = "AnimatedCardTitle";

const AnimatedCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
AnimatedCardDescription.displayName = "AnimatedCardDescription";

const AnimatedCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />
));
AnimatedCardContent.displayName = "AnimatedCardContent";

const AnimatedCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-5 pt-0", className)}
    {...props}
  />
));
AnimatedCardFooter.displayName = "AnimatedCardFooter";

export {
  AnimatedCard,
  AnimatedCardHeader,
  AnimatedCardFooter,
  AnimatedCardTitle,
  AnimatedCardDescription,
  AnimatedCardContent,
};
