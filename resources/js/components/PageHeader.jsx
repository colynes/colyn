import React from 'react';

export default function PageHeader({ title, description, children }) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-sys-text-primary)] tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-[var(--color-sys-text-secondary)]">
            {description}
          </p>
        )}
      </div>
      
      {/* Primary Actions (Buttons, etc.) */}
      {children && (
        <div className="flex items-center gap-3">
          {children}
        </div>
      )}
    </div>
  );
}
