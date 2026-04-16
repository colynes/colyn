import React from 'react';
import StoreLayout from '@/components/StoreLayout';
import PromotionsSection from '@/components/customer/PromotionsSection';
import PacksSection from '@/components/customer/PacksSection';
import ProductsSection from '@/components/customer/ProductsSection';
import { useI18n } from '@/lib/i18n';

export default function CustomerHome({ promotions = [], packs = [], products = [] }) {
  const { t } = useI18n();

  return (
    <StoreLayout
      title={t('frontend.customer_home.title', 'Welcome back to Amani Brew')}
      subtitle={t('frontend.customer_home.subtitle', 'Your customer home puts active promotions first, curated packs second, and everyday products third so the return shopping flow feels fast and intentional.')}
    >
      <div className="space-y-12">
        <PromotionsSection promotions={promotions} />
        <PacksSection packs={packs} />
        <ProductsSection products={products} />
      </div>
    </StoreLayout>
  );
}
