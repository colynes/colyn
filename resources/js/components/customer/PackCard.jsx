import React from 'react';
import { Link } from '@inertiajs/react';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function PackCard({ pack }) {
  return (
    <article className="rounded-[1.9rem] border border-[var(--color-sys-border)] bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-sys-text-secondary)]">Amani Brew Pack</p>
          <h3 className="mt-3 text-2xl font-black text-[var(--color-sys-text-primary)]">{pack.name}</h3>
        </div>
        <div className="rounded-2xl bg-[#efe5d7] px-4 py-3 text-right">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-sys-text-secondary)]">Price</p>
          <p className="mt-1 text-xl font-black text-[var(--color-brand-dark)]">{formatCurrency(pack.price)}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-7 text-[var(--color-sys-text-secondary)]">{pack.description}</p>
      <div className="mt-6">
        <Link href="/products" className="inline-flex items-center justify-center rounded-2xl border border-[var(--color-sys-border)] px-4 py-3 text-sm font-semibold text-[var(--color-sys-text-primary)]">
          View Pack
        </Link>
      </div>
    </article>
  );
}
