import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

export function Spinner({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn('h-5 w-5 rounded-full border-2 border-brand-primary border-t-transparent', className)}
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
    />
  );
}
