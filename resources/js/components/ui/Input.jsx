import React, { forwardRef } from 'react';

const Input = forwardRef(({ 
  type = 'text', 
  className = '', 
  error, 
  label, 
  id,
  ...props 
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-[var(--color-sys-text-primary)] mb-1">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        ref={ref}
        className={`flex h-10 w-full rounded-lg border border-[var(--color-sys-border)] bg-white px-3 py-2 text-sm 
          placeholder-[var(--color-sys-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-emerald)] 
          focus:border-transparent disabled:cursor-not-allowed disabled:bg-[var(--color-sys-muted)] disabled:opacity-50
          ${error ? 'border-[var(--color-status-danger)] focus:ring-[var(--color-status-danger)]' : ''} 
          ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-[var(--color-status-danger)]">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
