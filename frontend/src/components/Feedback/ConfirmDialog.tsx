import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onCancel}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="confirm-dialog-title" className="text-lg font-semibold text-text-primary">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                className="rounded-xl px-4 py-2 text-sm font-medium text-text-secondary hover:bg-elevated disabled:opacity-50"
              >
                {cancelLabel || t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={busy}
                className={cn(
                  'rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50',
                  destructive ? 'bg-status-danger hover:bg-status-danger/90' : 'bg-brand-primary hover:bg-brand-secondary'
                )}
              >
                {busy ? t('common.saving') : confirmLabel || t('common.confirm')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
