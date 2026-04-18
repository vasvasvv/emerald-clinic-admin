import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

// Optimized page transition using GPU-accelerated properties only
export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{
        duration: 0.28,
        ease: [0.16, 1, 0.3, 1], // Custom easing for smooth feel
      }}
      style={{
        willChange: 'transform, opacity',
        contain: 'layout style',
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Simpler fade-only variant for nested content
export function FadeIn({ children, className, delay = 0 }: PageTransitionProps & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 0.2,
        delay,
        ease: 'easeOut',
      }}
      style={{ willChange: 'opacity' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
