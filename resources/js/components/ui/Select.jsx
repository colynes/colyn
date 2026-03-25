import React, { forwardRef } from 'react';

const Select = forwardRef(({ className = '', error, label, options = [], id, ...props }, ref) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-[var(--color-sys-text-primary)] mb-1">
          {label}
        </label>
      )}
      <select
        id={selectId}
        ref={ref}
        className={`flex h-10 w-full rounded-lg border border-[var(--color-sys-border)] bg-white px-3 py-2 text-sm
          focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-emerald)] focus:border-transparent
          disabled:cursor-not-allowed disabled:bg-[var(--color-sys-muted)] disabled:opacity-50
          ${error ? 'border-[var(--color-status-danger)] focus:ring-[var(--color-status-danger)]' : ''}
          ${className}`}
        {...props}
      >
        <option value="" disabled>Select an option</option>
        {options.map((opt, i) => (
          <option key={i} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-[var(--color-status-danger)]">{error}</p>
      )}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;
