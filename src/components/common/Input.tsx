import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? `input-${generatedId}`;
    
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-zinc-600 mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          autoComplete="off"
          className={`
            w-full px-1.5 py-[3px] text-sm border rounded bg-white
            focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
            placeholder:text-zinc-400 transition-colors
            ${error ? 'border-red-400' : 'border-zinc-200 hover:border-zinc-300'}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-0.5 text-xs text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
