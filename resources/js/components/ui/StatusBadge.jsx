import React from 'react';

export default function StatusBadge({ status, className = '' }) {
  const getStatusStyles = (statusStr) => {
    const s = statusStr?.toLowerCase() || '';
    
    // Success states
    if (['completed', 'active', 'paid', 'delivered'].includes(s)) {
      return 'bg-[var(--color-brand-light)] text-[var(--color-brand-emerald)] border-[var(--color-brand-emerald)]/20';
    }
    // Warning / Pending states
    if (['pending', 'processing', 'low stock'].includes(s)) {
      return 'bg-amber-100 text-amber-700 border-amber-200';
    }
    // Info states
    if (['shipped', 'subscribed'].includes(s)) {
      return 'bg-blue-100 text-blue-700 border-blue-200';
    }
    // Danger / Cancelled states
    if (['cancelled', 'failed', 'out of stock', 'overdue', 'inactive'].includes(s)) {
      return 'bg-[var(--color-meat-rose)] text-[var(--color-status-danger)] border-[var(--color-status-danger)]/20';
    }
    
    // Default
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyles(status)} ${className}`}>
      {status || 'Unknown'}
    </span>
  );
}
