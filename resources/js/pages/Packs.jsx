import React from 'react';
import StoreLayout from '@/components/StoreLayout';
import PacksSection from '@/components/customer/PacksSection';

export default function Packs({ packs = [] }) {
  return (
    <StoreLayout
      title="Bundle Packs"
      subtitle="Explore only our available packs on this page, with the included products, comes-with details, and quick add-to-cart actions."
    >
      <PacksSection packs={packs} />
    </StoreLayout>
  );
}
