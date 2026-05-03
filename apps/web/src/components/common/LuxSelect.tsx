import { CSSProperties, ReactNode, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

export interface LuxSelectOption<V extends string = string> {
  value: V;
  label: ReactNode;
}

interface LuxSelectProps<V extends string = string> {
  value: V;
  options: LuxSelectOption<V>[];
  onChange: (value: V) => void;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
}

export function LuxSelect<V extends string = string>({
  value,
  options,
  onChange,
  id,
  disabled,
  placeholder = 'Выбрать',
  className,
  style,
}: LuxSelectProps<V>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const selected = options.find((option) => option.value === value);

  return (
    <div ref={containerRef} className={clsx('lux-dropdown', className)} style={style}>
      <button
        id={id}
        type="button"
        className={clsx('lux-dropdown__trigger', open && 'is-open')}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="lux-dropdown__label">
          {selected ? selected.label : <span className="lux-dropdown__placeholder">{placeholder}</span>}
        </span>
        <svg
          className="lux-dropdown__chevron"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="lux-dropdown__menu" role="listbox">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={clsx('lux-dropdown__option', option.value === value && 'is-active')}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
