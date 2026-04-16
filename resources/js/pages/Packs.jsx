import React from 'react';
import StoreLayout from '@/components/StoreLayout';
import PacksSection from '@/components/customer/PacksSection';
import { useI18n } from '@/lib/i18n';

export default function Packs({ packs = [] }) {
  const { t } = useI18n();

  return (
    <StoreLayout
      title={t('frontend.packs_page.title', 'Bundle Packs')}
      subtitle={t('frontend.packs_page.subtitle', 'Explore only our available packs on this page, with the included products, comes-with details, and quick add-to-cart actions.')}
    >
      <PacksSection packs={packs} />
    </StoreLayout>
  );
}
