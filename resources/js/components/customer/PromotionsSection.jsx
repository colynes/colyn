import React from 'react';
import PromotionCard from '@/components/customer/PromotionCard';
import { useI18n } from '@/lib/i18n';

export default function PromotionsSection({ promotions = [] }) {
  const { t } = useI18n();

  if (promotions.length === 0) {
    return null;
  }

  return (
    <section id="promotions" className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7a1f28]">{t('frontend.promotions_section.eyebrow', 'Promotions')}</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-sys-text-primary)]">{t('frontend.promotions_section.title', 'Latest offers and campaign updates')}</h2>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {promotions.map((promotion) => (
          <PromotionCard key={promotion.id} promotion={promotion} />
        ))}
      </div>
    </section>
  );
}
