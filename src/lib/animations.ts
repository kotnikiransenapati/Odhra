/**
 * iOS-like Animation Presets
 * Optimized spring configurations and transitions for fluid motion
 */

import { type Transition, type Variants } from 'framer-motion';

// iOS spring physics - these values create the signature Apple "bouncy" feel
export const SPRING = {
  // Default iOS spring - snappy with slight overshoot
  default: {
    type: 'spring',
    stiffness: 400,
    damping: 30,
    mass: 1,
  } as const,
  
  // Gentle spring for larger movements
  gentle: {
    type: 'spring',
    stiffness: 200,
    damping: 25,
    mass: 1,
  } as const,
  
  // Bouncy spring for playful elements
  bouncy: {
    type: 'spring',
    stiffness: 500,
    damping: 20,
    mass: 0.8,
  } as const,
  
  // Stiff spring for quick snaps
  stiff: {
    type: 'spring',
    stiffness: 600,
    damping: 35,
    mass: 0.5,
  } as const,
  
  // Slow spring for heavy elements
  slow: {
    type: 'spring',
    stiffness: 150,
    damping: 20,
    mass: 1.2,
  } as const,
} as const;

// iOS-like easing curves
export const EASE = {
  // Standard iOS easing - smooth acceleration and deceleration
  default: [0.25, 0.1, 0.25, 1],
  
  // Fast start, slow end - for entering elements
  out: [0.16, 1, 0.3, 1],
  
  // Slow start, fast end - for exiting elements  
  in: [0.7, 0, 0.84, 0],
  
  // Symmetric - for toggles and switches
  inOut: [0.87, 0, 0.13, 1],
  
  // Anticipation - slight pullback before motion
  anticipate: [0.36, 0, 0.66, -0.56],
  
  // Overshoot - extends past target then settles
  overshoot: [0.34, 1.56, 0.64, 1],
} as const;

// Common transition presets
export const TRANSITIONS = {
  // Fast micro-interaction (toggles, buttons)
  fast: {
    duration: 0.15,
    ease: EASE.out,
  } as Transition,
  
  // Standard transition (most UI elements)
  default: {
    duration: 0.25,
    ease: EASE.out,
  } as Transition,
  
  // Slow transition (page transitions, modals)
  slow: {
    duration: 0.4,
    ease: EASE.out,
  } as Transition,
  
  // Spring-based (cards, lists)
  spring: SPRING.default as Transition,
  
  // Bouncy spring (notifications, badges)
  bounce: SPRING.bouncy as Transition,
} as const;

// Pre-built animation variants
export const VARIANTS = {
  // Fade in/out
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  } as Variants,
  
  // Scale with fade
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  } as Variants,
  
  // Pop in (iOS-like)
  pop: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
  } as Variants,
  
  // Slide up
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  } as Variants,
  
  // Slide down
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  } as Variants,
  
  // Slide from right (iOS page push)
  slideRight: {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  } as Variants,
  
  // Slide from left
  slideLeft: {
    initial: { opacity: 0, x: -50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 50 },
  } as Variants,
  
  // Card hover effect
  cardHover: {
    initial: { y: 0, boxShadow: 'var(--shadow-md)' },
    hover: { y: -4, boxShadow: 'var(--shadow-xl)' },
    tap: { scale: 0.98 },
  } as Variants,
  
  // Button press effect
  buttonPress: {
    initial: { scale: 1 },
    hover: { scale: 1.02 },
    tap: { scale: 0.95 },
  } as Variants,
  
  // List item stagger
  listItem: {
    initial: { opacity: 0, x: -10 },
    animate: { opacity: 1, x: 0 },
  } as Variants,
} as const;

// Stagger configuration for lists
export const STAGGER = {
  fast: {
    staggerChildren: 0.03,
    delayChildren: 0.1,
  },
  default: {
    staggerChildren: 0.05,
    delayChildren: 0.15,
  },
  slow: {
    staggerChildren: 0.08,
    delayChildren: 0.2,
  },
} as const;

// Viewport configuration for scroll animations
export const VIEWPORT = {
  default: {
    once: true,
    amount: 0.2,
    margin: '-50px',
  },
  full: {
    once: true,
    amount: 0.8,
  },
  repeat: {
    once: false,
    amount: 0.3,
  },
} as const;

// Helper to create staggered container
export const createStaggerContainer = (stagger = STAGGER.default): Variants => ({
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: stagger,
  },
});

// Helper for scroll-triggered animations
export const scrollReveal = (delay = 0): Variants => ({
  initial: { opacity: 0, y: 30 },
  whileInView: { 
    opacity: 1, 
    y: 0,
    transition: { ...TRANSITIONS.default, delay },
  },
});

export default {
  SPRING,
  EASE,
  TRANSITIONS,
  VARIANTS,
  STAGGER,
  VIEWPORT,
};
