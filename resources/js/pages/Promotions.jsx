import React from 'react';
import StoreLayout from '@/components/StoreLayout';
import PromotionCard from '@/components/customer/PromotionCard';

export default function Promotions({ promotions = [] }) {
  return (
    <StoreLayout
      title="Current Promotions"
      subtitle="Database-backed campaigns now power the storefront, so every banner and deal card can be managed by staff and shown live to customers."
    >
      <div className="grid gap-5 lg:grid-cols-2">
        {promotions.length > 0 ? promotions.map((promotion) => (
          <PromotionCard
            key={promotion.id}
            promotion={{
              ...promotion,
              is_closed: !promotion.is_active,
              status_label: promotion.is_active ? 'Active Promotion' : 'Promotion Closed',
            }}
          />
        )) : (
          <div className="col-span-full rounded-[1.75rem] bg-white p-10 text-center text-[var(--color-sys-text-secondary)] shadow-sm">
            No live promotions yet. As soon as the team creates one from the dashboard, it will appear here.
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
