import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn('rounded-lg bg-elevated/80', className)}
      animate={{ opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}
