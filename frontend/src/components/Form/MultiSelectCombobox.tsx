import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
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
}: MultiSelectComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search query
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

  // Handle keyboard navigation
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
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            // Focus input when opening
            if (!isOpen) {
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }
        }}
        disabled={disabled}
        className={cn(
          'w-full min-h-[42px] px-3 py-2 text-start',
          'bg-background border border-border rounded-lg',
          'focus:ring-2 focus:ring-brand-primary focus:border-transparent',
          'transition-all duration-200',
          'flex items-center gap-2 flex-wrap',
          disabled && 'opacity-50 cursor-not-allowed',
          isOpen && 'ring-2 ring-brand-primary border-transparent'
        )}
      >
        {selected.length === 0 ? (
          <span className="text-text-muted">{placeholder}</span>
        ) : (
          <>
            {/* Selected chips (show max 2) */}
            {selectedLabels.map((label, index) => (
              <span
                key={selected[index]}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-primary/10 text-brand-primary text-sm rounded-md"
              >
                <span className="truncate max-w-[100px]">{label}</span>
                <button
                  type="button"
                  onClick={(e) => handleRemove(selected[index], e)}
                  className="hover:bg-brand-primary/20 rounded-full p-0.5 transition-colors"
                  aria-label={`Remove ${label}`}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

        {/* Right side icons */}
        <div className="ms-auto flex items-center gap-1">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="p-1 hover:bg-elevated rounded transition-colors text-text-muted hover:text-text-primary"
              aria-label="Clear all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <svg
            className={cn('w-4 h-4 text-text-muted transition-transform', isOpen && 'rotate-180')}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-surface border border-border rounded-lg shadow-lg overflow-hidden"
          >
            {/* Search input */}
            <div className="p-2 border-b border-border">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              />
            </div>

            {/* Options list */}
            <div className="max-h-[240px] overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-center text-text-muted text-sm">
                  {emptyMessage}
                </div>
              ) : (
                <div className="p-1">
                  {filteredOptions.map((option) => {
                    const isSelected = selected.includes(option.value);
                    const isDisabled = maxSelections !== undefined 
                      ? !isSelected && selected.length >= maxSelections 
                      : false;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleToggle(option.value)}
                        disabled={isDisabled}
                        className={cn(
                          'w-full px-3 py-2 text-start text-sm rounded-md transition-colors',
                          'flex items-center justify-between gap-2',
                          isSelected
                            ? 'bg-brand-primary/10 text-brand-primary'
                            : 'hover:bg-elevated text-text-primary',
                          isDisabled && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <span className="flex items-center gap-2">
                          {/* Checkbox indicator */}
                          <span
                            className={cn(
                              'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
                              isSelected
                                ? 'bg-brand-primary border-brand-primary'
                                : 'border-border'
                            )}
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
                          <span className="text-xs text-text-muted">({option.count})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer with selection count */}
            {maxSelections && (
              <div className="px-3 py-2 border-t border-border text-xs text-text-muted bg-elevated/50">
                {selected.length} / {maxSelections} selected
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}