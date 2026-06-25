import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

// Product register: crossfade only — no y-translate.
// Orchestrated page-load slide sequences slow down task-focused UIs.
const pageVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.18, ease: 'easeOut' },
  },
  exit: { opacity: 0, transition: { duration: 0.12, ease: 'easeIn' } },
};

export function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={cn('min-h-[calc(100vh-4rem)]', className)}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}
