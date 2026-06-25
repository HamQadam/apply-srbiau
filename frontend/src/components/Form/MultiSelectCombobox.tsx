import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '../../lib/cn';

interface Option {
  value: string;
  label: string;
  count?: number;
}

interface MultiSelectComboboxProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  maxSelections?: number;
  className?: string;
  disabled?: boolean;
  label?: string;
}

export function MultiSelectCombobox({
  options,
  selected,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options found',
  maxSelections,
  className,
  disabled = false,
  label,
}: MultiSelectComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const searchId = useId();

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(query.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard: Escape closes; Tab closes without clearing
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      if (event.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else if (!maxSelections || selected.length < maxSelections) {
      onChange([...selected, value]);
    }
  };

  const handleRemove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((v) => v !== value));
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const selectedLabels = selected
    .map((value) => options.find((o) => o.value === value)?.label || value)
    .slice(0, 2);

  const remainingCount = selected.length - 2;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger — role="combobox" with aria-expanded and aria-controls */}
      <button
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-label={label}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) {
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }
        }}
        disabled={disabled}
        className={cn(
          'w-full min-h-[42px] px-3 py-2 text-start',
          'bg-background border border-border rounded-lg',
          'focus:ring-2 focus:ring-brand-primary focus:border-transparent focus:outline-none',
          'transition-all duration-200',
          'flex items-center gap-2 flex-wrap',
          disabled && 'opacity-50 cursor-not-allowed',
          isOpen && 'ring-2 ring-brand-primary border-transparent'
        )}
      >
        {selected.length === 0 ? (
          <span className="text-text-muted text-sm">{placeholder}</span>
        ) : (
          <>
            {selectedLabels.map((chipLabel, index) => (
              <span
                key={selected[index]}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-primary/10 text-brand-primary text-sm rounded-md"
              >
                <span className="truncate max-w-[100px]">{chipLabel}</span>
                <button
                  type="button"
                  onClick={(e) => handleRemove(selected[index], e)}
                  className="hover:bg-brand-primary/20 rounded-full p-0.5 transition-colors"
                  aria-label={`Remove ${chipLabel}`}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
            {remainingCount > 0 && (
              <span className="text-sm text-text-muted">+{remainingCount}</span>
            )}
          </>
        )}

        <div className="ms-auto flex items-center gap-1">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="p-1 hover:bg-elevated rounded transition-colors text-text-muted hover:text-text-primary"
              aria-label="Clear all selections"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <svg
            className={cn('w-4 h-4 text-text-muted transition-transform', isOpen && 'rotate-180')}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown — role="listbox" with aria-multiselectable */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={listboxId}
            role="listbox"
            aria-multiselectable="true"
            aria-label={label || placeholder}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute z-[10] w-full mt-1 bg-surface border border-border rounded-lg shadow-[0_4px_12px_rgba(2,6,23,0.12)] overflow-hidden"
          >
            {/* Search input within listbox */}
            <div className="p-2 border-b border-border" role="none">
              <input
                ref={inputRef}
                id={searchId}
                type="text"
                role="searchbox"
                aria-label={searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent focus:outline-none"
              />
            </div>

            {/* Options */}
            <div className="max-h-[240px] overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-center text-text-muted text-sm" role="none">
                  {emptyMessage}
                </div>
              ) : (
                <div className="p-1" role="none">
                  {filteredOptions.map((option) => {
                    const isSelected = selected.includes(option.value);
                    const isDisabledOption =
                      maxSelections !== undefined
                        ? !isSelected && selected.length >= maxSelections
                        : false;

                    return (
                      <div
                        key={option.value}
                        role="option"
                        aria-selected={isSelected}
                        aria-disabled={isDisabledOption}
                        onClick={() => !isDisabledOption && handleToggle(option.value)}
                        onKeyDown={(e) => {
                          if ((e.key === 'Enter' || e.key === ' ') && !isDisabledOption) {
                            e.preventDefault();
                            handleToggle(option.value);
                          }
                        }}
                        tabIndex={isDisabledOption ? -1 : 0}
                        className={cn(
                          'w-full px-3 py-2 text-start text-sm rounded-md transition-colors cursor-pointer',
                          'flex items-center justify-between gap-2',
                          isSelected
                            ? 'bg-brand-primary/10 text-brand-primary'
                            : 'hover:bg-elevated text-text-primary',
                          isDisabledOption && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0',
                              isSelected
                                ? 'bg-brand-primary border-brand-primary'
                                : 'border-border'
                            )}
                            aria-hidden="true"
                          >
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </span>
                          <span>{option.label}</span>
                        </span>
                        {option.count !== undefined && (
                          <span className="text-xs text-text-muted" aria-hidden="true">({option.count})</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {maxSelections && (
              <div className="px-3 py-2 border-t border-border text-xs text-text-muted bg-elevated/50" role="none">
                <span aria-live="polite">{selected.length} / {maxSelections}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
