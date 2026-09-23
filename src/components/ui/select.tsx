'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label?: string;
  disabled?: boolean;
}

export interface SelectProps {
  value?: string;
  defaultValue?: string;
  onChange?: (e: { target: { value: string; name?: string } }) => void;
  onValueChange?: (val: string) => void;
  options?: (SelectOption | string)[];
  children?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  menuClassName?: string;
  name?: string;
  id?: string;
  required?: boolean;
  readOnly?: boolean;
}

export const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      value,
      defaultValue,
      onChange,
      onValueChange,
      options,
      children,
      placeholder = 'Select an option...',
      disabled = false,
      className,
      menuClassName,
      name,
      id,
      required,
      readOnly = true,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;

    // Parse options from either `options` prop or `children` (<option> tags)
    const parsedOptions: SelectOption[] = React.useMemo(() => {
      if (options && options.length > 0) {
        return options.map(opt =>
          typeof opt === 'string'
            ? { value: opt, label: opt }
            : { value: opt.value, label: opt.label || opt.value, disabled: opt.disabled }
        );
      }

      const extracted: SelectOption[] = [];
      React.Children.forEach(children, child => {
        if (React.isValidElement<{ value?: any; children?: React.ReactNode; disabled?: boolean }>(child)) {
          const optValue = child.props.value !== undefined ? String(child.props.value) : '';
          const optLabel = child.props.children
            ? String(child.props.children)
            : optValue;
          extracted.push({
            value: optValue,
            label: optLabel,
            disabled: child.props.disabled,
          });
        }
      });
      return extracted;
    }, [options, children]);

    // Uncontrolled state fallback if `value` is not controlled
    const [internalValue, setInternalValue] = useState<string>(
      value !== undefined ? value : defaultValue !== undefined ? defaultValue : ''
    );

    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;

    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync internal state with controlled value
    useEffect(() => {
      if (isControlled) {
        setInternalValue(value);
      }
    }, [isControlled, value]);

    // Close on click outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };
      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen]);

    // Close on Escape key
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen) {
          setIsOpen(false);
        }
      };
      if (isOpen) {
        window.addEventListener('keydown', handleKeyDown);
      }
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }, [isOpen]);

    const handleSelect = (option: SelectOption) => {
      if (option.disabled || disabled) return;

      if (!isControlled) {
        setInternalValue(option.value);
      }
      setIsOpen(false);

      if (onChange) {
        onChange({
          target: {
            value: option.value,
            name,
          },
        });
      }
      if (onValueChange) {
        onValueChange(option.value);
      }
    };

    // Find active label to display
    const selectedOption = parsedOptions.find(opt => opt.value === currentValue);
    const displayText = selectedOption?.label || currentValue || placeholder;
    const hasSelection = Boolean(selectedOption || currentValue);

    return (
      <div
        ref={containerRef}
        className={cn('relative w-full select-none', className)}
        {...props}
      >
        {/* Hidden input for standard forms */}
        <input
          type="hidden"
          name={name}
          id={selectId}
          value={currentValue}
          required={required}
        />

        {/* Readonly Clickable Trigger */}
        <button
          type="button"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={`${selectId}-menu`}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(prev => !prev)}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border border-input bg-card/95 px-3 py-1.5 text-xs sm:text-sm text-foreground shadow-sm transition-all text-left outline-none cursor-pointer hover:border-amber-500/60 focus-visible:ring-1 focus-visible:ring-amber-500 focus-visible:border-amber-500 disabled:cursor-not-allowed disabled:opacity-50',
            isOpen && 'border-amber-500 ring-1 ring-amber-500/50',
            !hasSelection && 'text-muted-foreground'
          )}
        >
          <span className="truncate pr-2 font-medium">
            {displayText}
          </span>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0',
              isOpen && 'rotate-180 text-amber-400'
            )}
          />
        </button>

        {/* Dropdown Options Popup */}
        {isOpen && (
          <div
            id={`${selectId}-menu`}
            role="listbox"
            className={cn(
              'absolute left-0 right-0 top-full mt-1.5 z-[99999] rounded-lg border border-zinc-700 bg-zinc-950 p-1.5 shadow-2xl overflow-y-auto max-h-60 animate-in fade-in-0 zoom-in-95 duration-100',
              menuClassName
            )}
            style={{
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.7), 0 8px 10px -6px rgba(0, 0, 0, 0.7)',
            }}
          >
            {parsedOptions.length === 0 ? (
              <div className="py-3 px-3 text-xs text-zinc-400 text-center italic">
                No options available
              </div>
            ) : (
              parsedOptions.map(opt => {
                const isSelected = opt.value === currentValue;
                return (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt)}
                    className={cn(
                      'relative flex items-center justify-between px-3 py-2 rounded-md text-xs sm:text-sm font-medium cursor-pointer transition-colors select-none',
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed text-zinc-500'
                        : isSelected
                        ? 'bg-[#D97736] text-white font-semibold'
                        : 'text-zinc-100 hover:bg-zinc-800 hover:text-amber-300'
                    )}
                  >
                    <span className="truncate pr-2">{opt.label}</span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-white shrink-0 ml-1.5" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
