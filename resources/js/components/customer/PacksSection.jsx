import React from 'react';
import PackCard from '@/components/customer/PackCard';

export default function PacksSection({ packs = [] }) {
  return (
    <section id="packs" className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7a1f28]">Packs</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-sys-text-primary)]">Text-first bundles for faster ordering</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-sys-text-secondary)]">
          Amani Brew packs are presented without images so customers can focus on the offer details, the value, and the price in TZS.
        </p>
      </div>
      {packs.length > 0 ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {packs.map((pack) => (
            <PackCard key={pack.id} pack={pack} />
          ))}
        </div>
      ) : (
        <div className="rounded-[1.9rem] border border-dashed border-[var(--color-sys-border)] bg-white p-8 text-sm text-[var(--color-sys-text-secondary)]">
          No packs are available at the moment.
        </div>
      )}
    </section>
  );
}
