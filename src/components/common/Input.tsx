import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelSuffix?: ReactNode;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, labelSuffix, error, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? `input-${generatedId}`;
    
    return (
      <div className="w-full">
        {label && (
          <div className="flex items-center mb-1">
            <label 
              htmlFor={inputId} 
              className="block text-xs font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              {label}
            </label>
            {labelSuffix}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          autoComplete="off"
          className={`
            w-full px-1.5 py-[3px] text-sm border rounded
            focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
            transition-colors
            ${className}
          `}
          style={{
            backgroundColor: 'var(--input-bg)',
            borderColor: error ? 'var(--destructive)' : 'var(--input-border)',
            color: 'var(--text-primary)',
          }}
          {...props}
        />
        {error && (
          <p className="mt-0.5 text-xs" style={{ color: 'var(--destructive)' }}>{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
