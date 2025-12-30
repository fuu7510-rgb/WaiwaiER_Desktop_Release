import { forwardRef, useId } from 'react';
import type { SelectHTMLAttributes, ReactNode } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string | ReactNode;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, error, options, id, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? `select-${generatedId}`;
    
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-medium text-zinc-600 mb-1">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`
            w-full px-2.5 py-1.5 text-xs border rounded bg-white
            focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
            transition-colors cursor-pointer
            ${error ? 'border-red-400' : 'border-zinc-200 hover:border-zinc-300'}
            ${className}
          `}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-0.5 text-xs text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
