import React from 'react';
import { Link } from '@inertiajs/react';
import StoreLayout from '@/components/StoreLayout';
import { Card, CardContent } from '@/components/ui/Card';

export default function Promotions({ promotions = [] }) {
  return (
    <StoreLayout
      title="Current Promotions"
      subtitle="Database-backed campaigns now power the storefront, so every banner and deal card can be managed by staff and shown live to customers."
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {promotions.length > 0 ? promotions.map((promotion, index) => (
          <Card key={promotion.id} className={`rounded-[1.75rem] border-none shadow-sm ${index % 3 === 0 ? 'bg-[#efe3d3]' : index % 3 === 1 ? 'bg-white' : 'bg-[#f0ebe2]'}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${promotion.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-700'}`}>
                  {promotion.discount_label || 'Offer'}
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-sys-text-secondary)]">
                  {promotion.ends_at ? `Ends ${promotion.ends_at}` : 'Open campaign'}
                </span>
              </div>
              <h2 className="mt-5 text-2xl font-black">{promotion.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--color-sys-text-secondary)]">{promotion.description}</p>
              <div className="mt-8 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-sys-text-secondary)]">
                  {promotion.starts_at || 'Available now'}
                </div>
                <Link href="/products" className="text-sm font-bold text-[var(--color-brand-dark)]">
                  {promotion.cta_text || 'Order now'}
                </Link>
              </div>
            </CardContent>
          </Card>
        )) : (
          <div className="col-span-full rounded-[1.75rem] bg-white p-10 text-center text-[var(--color-sys-text-secondary)] shadow-sm">
            No live promotions yet. As soon as the team creates one from the dashboard, it will appear here.
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
