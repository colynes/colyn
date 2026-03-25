import React from 'react';

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  type = 'button',
  disabled = false,
  ...props 
}) {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-[var(--color-brand-dark)] text-white hover:bg-[#2c1d14]',
    secondary: 'bg-[var(--color-brand-tan)] text-white hover:bg-[#b59563]',
    danger: 'bg-[var(--color-status-danger)] text-white hover:bg-[#dc2626]',
    outline: 'border border-[var(--color-sys-border)] bg-transparent hover:bg-[var(--color-sys-muted)] text-[var(--color-sys-text-primary)]',
    ghost: 'bg-transparent hover:bg-[var(--color-sys-muted)] text-[var(--color-sys-text-secondary)]'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
    icon: 'p-2'
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
