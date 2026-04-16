import React from 'react';
import StoreLayout from '@/components/StoreLayout';
import PromotionCard from '@/components/customer/PromotionCard';
import { useI18n } from '@/lib/i18n';

export default function Promotions({ promotions = [] }) {
  const { t } = useI18n();

  return (
    <StoreLayout
      title={t('frontend.promotions_page.title', 'Current Promotions')}
      subtitle={t('frontend.promotions_page.subtitle', 'Database-backed campaigns now power the storefront, so every banner and deal card can be managed by staff and shown live to customers.')}
    >
      <div className="grid gap-5 lg:grid-cols-2">
        {promotions.length > 0 ? promotions.map((promotion) => (
          <PromotionCard
            key={promotion.id}
            promotion={{
              ...promotion,
              is_closed: !promotion.is_active,
              status_label: promotion.is_active
                ? t('frontend.promotions_page.status.active', 'Active Promotion')
                : t('frontend.promotions_page.status.closed', 'Promotion Closed'),
            }}
          />
        )) : (
          <div className="col-span-full rounded-[1.75rem] bg-white p-10 text-center text-[var(--color-sys-text-secondary)] shadow-sm">
            {t('frontend.promotions_page.empty', 'No live promotions yet. As soon as the team creates one from the dashboard, it will appear here.')}
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
